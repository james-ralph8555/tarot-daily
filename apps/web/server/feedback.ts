import { feedbackSchema, type Feedback } from "@daily-tarot/common";
import { query, run } from "./db";

type FeedbackRecord = {
  reading_id: string;
  user_id: string;
  thumb: number;
  rationale: string | null;
  created_at: string;
};

export interface UpsertFeedbackInput {
  readingId: string;
  userId: string;
  thumb: 1 | -1;
  rationale?: string;
}

export async function upsertFeedback(input: UpsertFeedbackInput) {
  await run(
    `
    INSERT INTO feedback (reading_id, user_id, thumb, rationale, created_at)
    VALUES (?, ?, ?, ?, current_timestamp)
    ON CONFLICT (reading_id, user_id)
    DO UPDATE SET thumb = excluded.thumb, rationale = excluded.rationale, created_at = current_timestamp
  `,
    {
      params: [input.readingId, input.userId, input.thumb, input.rationale ?? null]
    }
  );
  return getFeedback(input.readingId, input.userId);
}

export async function getFeedback(readingId: string, userId: string): Promise<Feedback | null> {
  const rows = await query<FeedbackRecord>(
    `SELECT reading_id, user_id, thumb, rationale, created_at FROM feedback WHERE reading_id = ? AND user_id = ?`,
    { params: [readingId, userId] }
  );
  if (!rows.length) return null;
  return feedbackSchema.parse({
    readingId: rows[0].reading_id,
    userId: rows[0].user_id,
    thumb: rows[0].thumb,
    rationale: rows[0].rationale ?? undefined,
    createdAt: rows[0].created_at
  });
}

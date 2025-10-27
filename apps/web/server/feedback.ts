import { feedbackSchema, type Feedback } from "../lib/common";
import { query, run } from "./db";

type FeedbackRecord = {
  reading_id: string;
  user_id: string;
  thumb: number;
  rationale: string | null;
  tags: string[] | null;
  created_at: string;
};

export interface UpsertFeedbackInput {
  readingId: string;
  userId: string;
  thumb: 1 | -1;
  rationale?: string;
  tags?: string[];
}

export async function upsertFeedback(input: UpsertFeedbackInput) {
  const now = new Date().toISOString();
  await run(
    `
    INSERT INTO feedback (reading_id, user_id, thumb, rationale, tags, created_at)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (reading_id, user_id)
    DO UPDATE SET thumb = excluded.thumb, rationale = excluded.rationale, tags = excluded.tags, created_at = $7
  `,
    {
      params: [
        input.readingId, 
        input.userId, 
        input.thumb, 
        input.rationale ?? null, 
        input.tags && input.tags.length > 0 ? input.tags : null, 
        now, 
        now
      ]
    }
  );
  return getFeedback(input.readingId, input.userId);
}

export async function getFeedback(readingId: string, userId: string): Promise<Feedback | null> {
  const rows = await query<FeedbackRecord>(
    `SELECT reading_id, user_id, thumb, rationale, tags, created_at FROM feedback WHERE reading_id = $1 AND user_id = $2`,
    { params: [readingId, userId] }
  );
  if (!rows.length) return null;
  return feedbackSchema.parse({
    readingId: rows[0].reading_id,
    userId: rows[0].user_id,
    thumb: rows[0].thumb,
    rationale: rows[0].rationale ?? undefined,
    tags: rows[0].tags ?? [],
    createdAt: new Date(rows[0].created_at).toISOString()
  });
}

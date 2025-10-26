import { cardDrawSchema, readingSchema, type Reading } from "@daily-tarot/common";
import { z } from "zod";
import { nanoid } from "nanoid";
import { deriveSeed, generateSpread, type SpreadType } from "../lib/seed";
import { createChatCompletion, type ChatMessage } from "./groq";
import { getEnv } from "./config";
import { query, run } from "./db";

type ReadingRecord = {
  id: string;
  user_id: string;
  iso_date: string;
  spread_type: string;
  hmac: string;
  intent: string | null;
  cards: string;
  prompt_version: string;
  overview: string;
  card_breakdowns: string;
  synthesis: string;
  actionable_reflection: string;
  tone: string;
  model: string;
  created_at: string;
};

export interface ReadingRequestInput {
  userId: string;
  isoDate: string;
  intent?: string;
  spreadType: SpreadType;
  tone?: string;
  promptVersion?: string;
}

export interface ReadingResult {
  reading: Reading;
  created: boolean;
}

export interface ReadingHistoryOptions {
  userId: string;
  limit?: number;
  cursor?: string | null;
}

export interface ReadingHistory {
  items: Reading[];
  nextCursor: string | null;
}

export async function ensureReading(input: ReadingRequestInput): Promise<ReadingResult> {
  const existing = await findReading(input.userId, input.isoDate);
  if (existing) {
    return { reading: existing, created: false };
  }

  const result = await generateReading(input);
  return { reading: result, created: true };
}

async function findReading(userId: string, isoDate: string): Promise<Reading | null> {
  const rows = await query<ReadingRecord>(
    `
    SELECT *
    FROM readings
    WHERE user_id = ? AND iso_date = ?
  `,
    { params: [userId, isoDate] }
  );
  if (!rows.length) return null;
  const record = rows[0];
  return readingSchema.parse({
    id: record.id,
    seed: {
      userId,
      isoDate,
      spreadType: record.spread_type,
      hmac: record.hmac
    },
    intent: record.intent ?? undefined,
    cards: JSON.parse(record.cards),
    promptVersion: record.prompt_version,
    overview: record.overview,
    cardBreakdowns: JSON.parse(record.card_breakdowns),
    synthesis: record.synthesis,
    actionableReflection: record.actionable_reflection,
    tone: record.tone,
    createdAt: record.created_at,
    model: record.model
  });
}

export async function listReadings(options: ReadingHistoryOptions): Promise<ReadingHistory> {
  const limit = Math.min(Math.max(options.limit ?? 10, 1), 50);
  const cursorCreatedAt = options.cursor ? new Date(Number(options.cursor)) : null;

  const rows = await query<ReadingRecord>(
    `
      SELECT *
      FROM readings
      WHERE user_id = ?
        ${cursorCreatedAt ? "AND created_at < ?" : ""}
      ORDER BY created_at DESC
      LIMIT ?
    `,
    {
      params: cursorCreatedAt ? [options.userId, cursorCreatedAt.toISOString(), limit + 1] : [options.userId, limit + 1]
    }
  );

  const items = rows.slice(0, limit).map((record) =>
    readingSchema.parse({
      id: record.id,
      seed: {
        userId: record.user_id,
        isoDate: record.iso_date,
        spreadType: record.spread_type,
        hmac: record.hmac
      },
      intent: record.intent ?? undefined,
      cards: JSON.parse(record.cards),
      promptVersion: record.prompt_version,
      overview: record.overview,
      cardBreakdowns: JSON.parse(record.card_breakdowns),
      synthesis: record.synthesis,
      actionableReflection: record.actionable_reflection,
      tone: record.tone,
      createdAt: record.created_at,
      model: record.model
    })
  );

  const hasMore = rows.length > limit;
  const nextCursor = hasMore ? String(new Date(rows[limit].created_at).getTime()) : null;

  return {
    items,
    nextCursor
  };
}

async function generateReading(input: ReadingRequestInput): Promise<Reading> {
  const env = getEnv();
  const promptVersion = input.promptVersion ?? "v1.deterministic";
  
  if (!input.userId) {
    throw new Error("userId is required but was not provided");
  }
  
  const seed = deriveSeed(input.userId, input.isoDate);
  const spreads = generateSpread(seed, input.spreadType);

  const cards = spreads.map((entry) =>
    cardDrawSchema.parse({
      cardId: entry.card.id,
      orientation: entry.orientation,
      position: entry.position
    })
  );

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt({
    userId: input.userId,
    isoDate: input.isoDate,
    intent: input.intent,
    spreadType: input.spreadType,
    tone: input.tone ?? "warm-analytical",
    cards: spreads.map((entry) => ({
      id: entry.card.id,
      name: entry.card.name,
      position: entry.position,
      orientation: entry.orientation,
      uprightMeaning: entry.card.uprightMeaning,
      reversedMeaning: entry.card.reversedMeaning
    }))
  });

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: JSON.stringify(userPrompt) }
  ];

  const completion = await createChatCompletion(messages);
  const aiResponse = JSON.parse(completion.content);
  
  // Validate the AI response structure
  const aiResponseSchema = z.object({
    overview: z.string().min(1),
    cardBreakdowns: z.array(
      z.object({
        cardId: z.string().min(1),
        orientation: z.enum(["upright", "reversed"]),
        summary: z.string().min(1)
      })
    ),
    synthesis: z.string().min(1),
    actionableReflection: z.string().min(1)
  });
  
  const parsed = aiResponseSchema.safeParse(aiResponse);
  if (!parsed.success) {
    throw new Error(`Groq response failed validation: ${parsed.error.message}`);
  }

  const record: Reading = {
    id: nanoid(),
    seed: {
      userId: input.userId,
      isoDate: input.isoDate,
      spreadType: input.spreadType,
      hmac: seed
    },
    intent: input.intent,
    cards,
    promptVersion,
    overview: parsed.data.overview,
    cardBreakdowns: parsed.data.cardBreakdowns,
    synthesis: parsed.data.synthesis,
    actionableReflection: parsed.data.actionableReflection,
    tone: input.tone ?? "warm-analytical",
    createdAt: new Date().toISOString(),
    model: completion.raw && typeof completion.raw === "object" && "model" in (completion.raw as Record<string, unknown>)
      ? ((completion.raw as Record<string, unknown>).model as Reading["model"])
      : (env.NODE_ENV === "production" ? env.GROQ_PROD_MODEL : env.GROQ_DEV_MODEL)
  };

  await persistReading(record);
  return record;
}

async function persistReading(reading: Reading) {
  await run(
    `
    INSERT INTO readings (
      id,
      user_id,
      iso_date,
      spread_type,
      hmac,
      intent,
      cards,
      prompt_version,
      overview,
      card_breakdowns,
      synthesis,
      actionable_reflection,
      tone,
      model,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    {
      params: [
        reading.id,
        reading.seed.userId,
        reading.seed.isoDate,
        reading.seed.spreadType,
        reading.seed.hmac,
        reading.intent ?? null,
        JSON.stringify(reading.cards),
        reading.promptVersion,
        reading.overview,
        JSON.stringify(reading.cardBreakdowns),
        reading.synthesis,
        reading.actionableReflection,
        reading.tone,
        reading.model,
        reading.createdAt
      ]
    }
  );
}

function buildSystemPrompt() {
  return `
You are an ethical tarot companion. Always include a concise wellness disclaimer stating that the reading is for reflection only and not medical, legal, or financial advice.
Respond strictly as minified JSON matching this TypeScript interface:
{
  "overview": string;
  "cardBreakdowns": Array<{
    "cardId": string;
    "orientation": "upright" | "reversed";
    "summary": string;
  }>;
  "synthesis": string;
  "actionableReflection": string;
}
Every section must be concise yet specific. Mention each card exactly once in overview and relevant breakdowns.
`.trim();
}

function buildUserPrompt(input: {
  userId: string;
  isoDate: string;
  intent?: string;
  spreadType: SpreadType;
  tone: string;
  cards: Array<{
    id: string;
    name: string;
    position: string;
    orientation: "upright" | "reversed";
    uprightMeaning: string;
    reversedMeaning: string;
  }>;
}) {
  return {
    task: "compose_structured_tarot_reading",
    metadata: {
      userId: input.userId,
      isoDate: input.isoDate,
      spreadType: input.spreadType,
      tone: input.tone,
      disclaimer: "For reflection and entertainment only; does not replace professional advice."
    },
    intent: input.intent ?? null,
    spread: input.cards.map((card) => ({
      cardId: card.id,
      name: card.name,
      position: card.position,
      orientation: card.orientation,
      meaning: card.orientation === "upright" ? card.uprightMeaning : card.reversedMeaning
    }))
  };
}

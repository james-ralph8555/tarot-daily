import { z } from "zod";

export const tarotCardSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  arcana: z.enum(["major", "minor"]),
  suit: z.union([
    z.enum(["wands", "cups", "swords", "pentacles"]),
    z.literal("major")
  ]),
  number: z.number().int().min(0).max(21),
  uprightMeaning: z.string().min(1),
  reversedMeaning: z.string().min(1)
});

export type TarotCard = z.infer<typeof tarotCardSchema>;

export const cardDrawSchema = z.object({
  cardId: z.string().min(1),
  orientation: z.enum(["upright", "reversed"]),
  position: z.string().min(1)
});

export type CardDraw = z.infer<typeof cardDrawSchema>;

export const readingSeedSchema = z.object({
  userId: z.string().min(1),
  isoDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "expected UTC ISO date (YYYY-MM-DD)"),
  spreadType: z.enum(["single", "three-card", "celtic-cross"]),
  hmac: z.string().length(64)
});

export type ReadingSeed = z.infer<typeof readingSeedSchema>;

export const readingSchema = z.object({
  id: z.string().min(1),
  seed: readingSeedSchema,
  intent: z.string().max(280).optional(),
  cards: z.array(cardDrawSchema),
  promptVersion: z.string().min(1),
  overview: z.string().min(1),
  cardBreakdowns: z.array(
    z.object({
      cardId: z.string().min(1),
      orientation: z.enum(["upright", "reversed"]),
      summary: z.string().min(1)
    })
  ),
  synthesis: z.string().min(1),
  actionableReflection: z.string().min(1),
  tone: z.string().min(1),
  createdAt: z.string().datetime(),
  model: z.enum(["groq/openai/gpt-oss-20b", "groq/openai/gpt-oss-120b"])
});

export type Reading = z.infer<typeof readingSchema>;

export const feedbackSchema = z.object({
  readingId: z.string().min(1),
  userId: z.string().min(1),
  thumb: z.union([z.literal(1), z.literal(-1)]),
  rationale: z.string().max(1000).optional(),
  createdAt: z.string().datetime()
});

export type Feedback = z.infer<typeof feedbackSchema>;

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  expirationTime: z.number().nullable(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string()
  })
});

export type PushSubscription = z.infer<typeof pushSubscriptionSchema>;

export const apiErrorSchema = z.object({
  error: z.string(),
  code: z.string().default("unknown_error")
});

export type ApiError = z.infer<typeof apiErrorSchema>;

export const duckDbTables = {
  users: "users",
  sessions: "sessions",
  userKeys: "user_keys",
  readings: "readings",
  feedback: "feedback",
  prompts: "prompt_versions",
  evaluations: "evaluation_runs",
  pushSubscriptions: "push_subscriptions",
  alerts: "alerts",
  trainingDatasets: "training_datasets"
} as const;

export type DuckDbTable = (typeof duckDbTables)[keyof typeof duckDbTables];

export const promptVersionSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["draft", "candidate", "promoted", "rolled_back"]),
  optimizer: z.string().default("manual"),
  createdAt: z.string().datetime(),
  metadata: z.record(z.any()).optional()
});

export type PromptVersion = z.infer<typeof promptVersionSchema>;

export const evaluationResultSchema = z.object({
  id: z.string().min(1),
  promptVersionId: z.string().min(1),
  dataset: z.string().min(1),
  metrics: z.record(z.number()),
  guardrailViolations: z.array(z.string()),
  createdAt: z.string().datetime()
});

export type EvaluationResult = z.infer<typeof evaluationResultSchema>;

export const hmacConfigSchema = z.object({
  secret: z.string().min(32),
  algorithm: z.enum(["sha256"])
});

export type HmacConfig = z.infer<typeof hmacConfigSchema>;

export const streamingChunkSchema = z.object({
  type: z.enum(["delta", "final", "error"]),
  data: z.any()
});

export type StreamingChunk = z.infer<typeof streamingChunkSchema>;

export { tarotDeck, getTarotCardById } from "./deck";

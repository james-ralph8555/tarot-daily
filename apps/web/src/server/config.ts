import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  GROQ_API_KEY: z.string().min(1, "GROQ_API_KEY is required"),
  GROQ_API_BASE: z
    .string()
    .default("https://api.groq.com/openai/v1/chat/completions"),
  GROQ_DEV_MODEL: z.enum(["openai/gpt-oss-20b", "openai/gpt-oss-120b"]).default("openai/gpt-oss-20b"),
  GROQ_PROD_MODEL: z.enum(["openai/gpt-oss-20b", "openai/gpt-oss-120b"]).default("openai/gpt-oss-120b"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be 32+ characters"),
  HMAC_SECRET: z.string().min(32, "HMAC_SECRET must be 32+ characters"),
  PUSH_VAPID_PUBLIC_KEY: z.string().min(1, "PUSH_VAPID_PUBLIC_KEY is required"),
  PUSH_VAPID_PRIVATE_KEY: z.string().min(1, "PUSH_VAPID_PRIVATE_KEY is required"),
  PUSH_CONTACT_EMAIL: z.string().email().default("support@example.com"),
  DUCKDB_PATH: z.string().optional()
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | undefined;

export function getEnv(): Env {
  if (!cachedEnv) {
    cachedEnv = envSchema.parse(process.env);
  }
  return cachedEnv;
}

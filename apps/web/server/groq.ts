import { getEnv } from "./config";
import { run } from "./db";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export interface ChatCompletionResult {
  content: string;
  raw: unknown;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    latencyMs: number;
  };
}

export async function createChatCompletion(
  messages: ChatMessage[], 
  modelOverride?: string,
  userId?: string,
  readingId?: string
): Promise<ChatCompletionResult> {
  const env = getEnv();
  const model = modelOverride ?? (env.NODE_ENV === "production" ? env.GROQ_PROD_MODEL : env.GROQ_DEV_MODEL);
  
  const startTime = Date.now();
  
  const response = await fetch(env.GROQ_API_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      top_p: 0.9,
      stream: false,
      response_format: { type: "json_object" }
    })
  });
  
  const endTime = Date.now();
  const latencyMs = endTime - startTime;
  
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Groq API error: ${response.status} ${response.statusText} — ${errorBody}`);
  }
  
  const data = (await response.json()) as {
    choices?: Array<{ message?: { role?: string; content?: string } }>;
    usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
    model: string;
  };
  
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("Groq API returned an empty response");
  }
  
  const usage = data.usage ? {
    promptTokens: data.usage.prompt_tokens,
    completionTokens: data.usage.completion_tokens,
    totalTokens: data.usage.total_tokens,
    latencyMs
  } : undefined;
  
  // Store usage data if we have the metrics
  if (usage && (userId || readingId)) {
    await storeGroqUsage({
      userId: userId || null,
      readingId: readingId || null,
      model: data.model,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      latencyMs,
      requestTimestamp: new Date(startTime).toISOString(),
      responseTimestamp: new Date(endTime).toISOString()
    });
  }
  
  return { content, raw: data, usage };
}

interface GroqUsageRecord {
  userId?: string | null;
  readingId?: string | null;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  requestTimestamp: string;
  responseTimestamp: string;
}

async function storeGroqUsage(record: GroqUsageRecord) {
  await run(
    `INSERT INTO groq_usage (
      user_id, reading_id, model, prompt_tokens, completion_tokens, 
      total_tokens, latency_ms, request_timestamp, response_timestamp
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    {
      params: [
        record.userId,
        record.readingId,
        record.model,
        record.promptTokens,
        record.completionTokens,
        record.totalTokens,
        record.latencyMs,
        record.requestTimestamp,
        record.responseTimestamp
      ]
    }
  );
}
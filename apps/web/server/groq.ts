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
  userId?: string
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
  
  // No longer storing usage here - it's moved to reading.ts
  // to ensure reading exists before usage tracking
  
  return { content, raw: data, usage };
}
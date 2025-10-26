import { getEnv } from "./config";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export interface ChatCompletionResult {
  content: string;
  raw: unknown;
}

export async function createChatCompletion(messages: ChatMessage[], modelOverride?: string): Promise<ChatCompletionResult> {
  const env = getEnv();
  const model = modelOverride ?? (env.NODE_ENV === "production" ? env.GROQ_PROD_MODEL : env.GROQ_DEV_MODEL);
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
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Groq API error: ${response.status} ${response.statusText} — ${errorBody}`);
  }
  const data = (await response.json()) as {
    choices?: Array<{ message?: { role?: string; content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("Groq API returned an empty response");
  }
  return { content, raw: data };
}

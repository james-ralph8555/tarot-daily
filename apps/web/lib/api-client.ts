'use client';

import type { Feedback, Reading, StreamingChunk } from "@daily-tarot/common";

export interface StreamOptions {
  signal?: AbortSignal;
  intent?: string;
  isoDate?: string;
  spreadType?: "single" | "three-card" | "celtic-cross";
  tone?: string;
}

export async function streamReading(options: StreamOptions, onEvent: (event: StreamingChunk) => void) {
  const response = await fetch("/api/reading", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": getCsrfToken()
    },
    body: JSON.stringify({
      intent: options.intent,
      isoDate: options.isoDate,
      spreadType: options.spreadType,
      tone: options.tone,
      stream: true
    }),
    credentials: "include",
    signal: options.signal
  });

  if (!response.ok || !response.body) {
    const text = await response.text();
    throw new Error(`Failed to stream reading: ${response.status} ${text}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
      const chunk = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (!chunk) continue;
      const parsed = JSON.parse(chunk) as StreamingChunk;
      onEvent(parsed);
    }
  }
}

export async function fetchReading(isoDate?: string) {
  const params = new URLSearchParams();
  if (isoDate) params.set("date", isoDate);
  const response = await fetch(`/api/reading?${params.toString()}`, {
    headers: {
      "X-Requested-With": "fetch"
    },
    credentials: "include"
  });
  if (!response.ok) {
    throw new Error(`Failed to load reading: ${response.status}`);
  }
  return (await response.json()) as Reading;
}

export async function submitFeedback(payload: { readingId: string; thumb: 1 | -1; rationale?: string }) {
  const response = await fetch("/api/feedback", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": getCsrfToken()
    },
    body: JSON.stringify(payload),
    credentials: "include"
  });
  if (!response.ok) {
    throw new Error(`Failed to submit feedback: ${response.status}`);
  }
  return response.json() as Promise<{ feedback: Feedback }>;
}

export function getCsrfToken() {
  const match = document.cookie.match(/(?:^|; )dt_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export async function logout() {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
    headers: {
      "X-CSRF-Token": getCsrfToken()
    },
    credentials: "include"
  });
  if (!response.ok) {
    throw new Error("Failed to log out");
  }
}

export async function login(email: string, password: string) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password }),
    credentials: "include"
  });
  if (!response.ok) {
    throw new Error("Invalid credentials");
  }
  return response.json() as Promise<{ user: { id: string; email: string } }>;
}

export async function register(email: string, password: string) {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password }),
    credentials: "include"
  });
  if (!response.ok) {
    throw new Error("Registration failed");
  }
  return response.json() as Promise<{ user: { id: string; email: string } }>;
}

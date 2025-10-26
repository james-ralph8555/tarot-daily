'use client';

import { useEffect, useRef, useState } from "react";
import type { Feedback, Reading } from "@daily-tarot/common";
import { useRouter } from "next/navigation";
import { fetchReading, streamReading } from "../lib/api-client";
import { FeedbackWidget } from "./FeedbackWidget";
import { IntentForm } from "./IntentForm";
import { Navigation } from "./Navigation";
import { ReadingDisplay } from "./ReadingDisplay";

interface HomeClientProps {
  user: { id: string; email: string } | null;
}

export function HomeClient(props: HomeClientProps) {
  const router = useRouter();
  const [reading, setReading] = useState<Reading | undefined>();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [streaming, setStreaming] = useState<Record<string, string>>({});
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!props.user) {
      setReading(undefined);
      setFeedback(null);
      return;
    }
    void loadReading();
  }, [props.user?.id]);

  async function loadReading() {
    if (!props.user) {
      return;
    }
    try {
      const existing = await fetchReading();
      setReading(existing);
    } catch (error) {
      console.error("Unable to load reading", error);
    }
  }

  async function handleIntentSubmit(intent?: string) {
    if (!props.user) {
      router.push("/login");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStreaming({});
    setIsStreaming(true);

    try {
      await streamReading(
        { intent, signal: controller.signal },
        (event) => {
          if (event.type === "delta" && typeof event.data === "object" && event.data) {
            const { section, text } = event.data as { section: string; text: string };
            setStreaming((prev) => ({ ...prev, [section]: text }));
          } else if (event.type === "final") {
            setReading(event.data as Reading);
            setStreaming({});
          } else if (event.type === "error") {
            const message = typeof event.data === "object" && event.data && "message" in (event.data as any)
              ? ((event.data as { message?: string }).message ?? "Reading failed")
              : "Reading failed";
            throw new Error(message);
          }
        }
      );
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        console.error(error);
      }
    } finally {
      setIsStreaming(false);
    }
  }

  return (
    <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-12 px-4 pb-24 pt-12 lg:px-8">
      <Navigation user={props.user} />
      <section className="grid items-start gap-10 lg:grid-cols-[1.35fr,0.9fr]">
        <div className="space-y-8">
          <ReadingDisplay reading={reading} streaming={streaming} />
          <FeedbackWidget readingId={reading?.id} existing={feedback} onSubmitted={setFeedback} />
        </div>
        <aside className="space-y-6">
          <IntentForm onSubmit={handleIntentSubmit} loading={isStreaming} />
          <Callouts isStreaming={isStreaming} />
        </aside>
      </section>
    </main>
  );
}

function Callouts(props: { isStreaming: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-[32px] border border-lapis-900/40 bg-ash-900/70 p-6 text-sm text-incense-200 shadow-halo">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_-20%,rgba(230,199,92,0.16),transparent_55%)] opacity-90" />
      <div className="relative space-y-4">
        <header className="text-[0.65rem] uppercase tracking-[0.35em] text-gilded-300">
          Daily Ritual
        </header>
        <p className="leading-relaxed">
          Deterministic seeding means today&apos;s draw can be retrieved and studied again--ritual belongs to the rhythm,
          not randomness.
        </p>
        <p className="leading-relaxed">
          Your signal trains the nocturnal DSPy optimizer. Prompt updates deploy only when evaluation metrics stay true
          or ascend.
        </p>
        <p className="text-[0.65rem] uppercase tracking-[0.35em] text-gilded-200/80">
          {props.isStreaming ? "Streaming in progress..." : "Model: Groq GPT-OSS | Pipeline: DSPy <-> DuckDB"}
        </p>
      </div>
    </div>
  );
}

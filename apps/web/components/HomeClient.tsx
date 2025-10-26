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
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 pb-16 pt-8">
      <Navigation user={props.user} />
      <section className="grid items-start gap-6 lg:grid-cols-[2fr,1fr]">
        <div>
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
    <div className="card space-y-4 text-sm text-slate-200/80">
      <p>
        Your daily draw uses deterministic seeding, so you can revisit the same reading later and reproduce the exact
        spread.
      </p>
      <p>
        Feedback you share feeds the nightly DSPy optimizer. Prompts stay in staging until evaluation metrics improve or
        hold steady.
      </p>
      <p className="text-xs uppercase tracking-wide text-amber-200">
        {props.isStreaming ? "Streaming in progress..." : "Model: Groq GPT-OSS · Pipeline: DSPy + DuckDB"}
      </p>
    </div>
  );
}

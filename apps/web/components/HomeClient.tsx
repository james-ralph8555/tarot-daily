'use client';

import { useEffect, useRef, useState } from "react";
import type { Feedback, Reading } from "../lib/common";
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

  async function loadReading(retryCount = 0) {
    if (!props.user) {
      return;
    }
    try {
      const existing = await fetchReading();
      setReading(existing);
    } catch (error) {
      console.error("Unable to load reading", error);
      // If we get a 401 and haven't retried yet, wait a bit and retry once
      if (error instanceof Error && error.message.includes("401") && retryCount === 0) {
        console.log("Retrying reading fetch after delay...");
        setTimeout(() => loadReading(1), 500);
      }
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
        { intent, signal: controller.signal, force: true },
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
    <div className="min-h-screen bg-gradient-lapis relative">
      {/* Sacred overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(230,199,92,0.08),transparent_50%)] pointer-events-none" />
      
      {/* Navigation */}
      <Navigation user={props.user} />
      
      {/* Main content - unified fullscreen single column */}
      <main className="relative z-10 mx-auto w-full max-w-4xl px-4 py-8">
        
        {/* Title Section */}
        <header className="text-center mb-12">
          <h1 className="font-display text-5xl md:text-6xl tracking-[0.08em] text-gilded-400 mb-4">
            Tarot Daily
          </h1>
          <p className="font-serif text-xl text-incense-300 italic">
            Lux in Arcana
          </p>
        </header>

        {/* Baroque Divider */}
        <BaroqueDivider />

        {/* Cards Section - Emphasized */}
        <section className="py-16">
          <ReadingDisplay reading={reading} streaming={streaming} />
        </section>

        {/* Baroque Divider */}
        <BaroqueDivider />

        {/* Intent Form Section */}
        <section className="py-12 max-w-2xl mx-auto">
          <IntentForm onSubmit={handleIntentSubmit} loading={isStreaming} />
        </section>

        {/* Baroque Divider */}
        <BaroqueDivider />

        {/* Reading Details Section */}
        {reading && (
          <section className="py-12">
            <FeedbackWidget readingId={reading.id} existing={feedback} onSubmitted={setFeedback} />
          </section>
        )}

        {/* Footer Callout */}
        <div className="py-8 text-center">
          <Callouts isStreaming={isStreaming} />
        </div>
      </main>
    </div>
  );
}

function BaroqueDivider() {
  return (
    <div className="relative py-8">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-full h-px bg-gradient-to-r from-transparent via-gilded-400/40 to-transparent" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-full h-px bg-gradient-to-r from-transparent via-gilded-400/20 to-transparent mt-1" />
      </div>
      <div className="relative flex justify-center">
        <svg width="50" height="50" viewBox="0 0 50 50" className="text-gilded-400 drop-shadow-[0_0_8px_rgba(230,199,92,0.4)]">
          <path
            d="M25 10 L30 20 L40 20 L32 28 L35 40 L25 34 L15 40 L18 28 L10 20 L20 20 Z"
            fill="currentColor"
            opacity="0.7"
          />
          <circle cx="25" cy="25" r="4" fill="currentColor" />
          <path d="M15,25 Q20,20 25,25 Q30,30 35,25" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.5" />
          <path d="M20,25 Q22,22 25,25 Q28,28 30,25" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0.4" />
        </svg>
      </div>
    </div>
  );
}

function Callouts(props: { isStreaming: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-[32px] border border-lapis-900/40 bg-ash-900/70 p-6 text-sm text-incense-200 shadow-halo acanthus-border">
      <div className="ornate-corner ornate-corner-tl"></div>
      <div className="ornate-corner ornate-corner-tr"></div>
      <div className="ornate-corner ornate-corner-bl"></div>
      <div className="ornate-corner ornate-corner-br"></div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_-20%,rgba(230,199,92,0.16),transparent_55%)] opacity-90" />
      <div className="relative space-y-4">
        <header className="text-[0.65rem] uppercase tracking-[0.35em] text-gilded-300">
          ✦ Daily Ritual ✦
        </header>
        <div className="scrollwork-divider">
          <svg width="40" height="40" viewBox="0 0 40 40" className="text-gilded-400">
            <path d="M20 8 L24 16 L32 16 L26 22 L28 30 L20 26 L12 30 L14 22 L8 16 L16 16 Z" fill="currentColor" opacity="0.6"></path>
            <circle cx="20" cy="20" r="3" fill="currentColor"></circle>
          </svg>
        </div>
        <p className="leading-relaxed">
          Deterministic seeding means today&apos;s draw can be retrieved and studied again--ritual belongs to the rhythm,
          not randomness.
        </p>
        <div className="scrollwork-divider">
          <svg width="40" height="40" viewBox="0 0 40 40" className="text-gilded-400">
            <path d="M20 8 L24 16 L32 16 L26 22 L28 30 L20 26 L12 30 L14 22 L8 16 L16 16 Z" fill="currentColor" opacity="0.6"></path>
            <circle cx="20" cy="20" r="3" fill="currentColor"></circle>
          </svg>
        </div>
        <p className="leading-relaxed">
          Your signal trains the nocturnal DSPy optimizer. Prompt updates deploy only when evaluation metrics stay true
          or ascend.
        </p>
        <p className="text-[0.65rem] uppercase tracking-[0.35em] text-gilded-200/80">
          {props.isStreaming ? "Streaming in progress..." : "Model: Groq GPT-OSS | Pipeline: DSPy <-> PostgreSQL"}
        </p>
      </div>
    </div>
  );
}

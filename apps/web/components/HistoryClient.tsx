'use client';

import { useState } from "react";
import type { Reading } from "@daily-tarot/common";
import { getTarotCardById } from "@daily-tarot/common";
import { Navigation } from "./Navigation";

interface HistoryClientProps {
  user: { id: string; email: string } | null;
  initialItems: Reading[];
  initialCursor: string | null;
}

export function HistoryClient(props: HistoryClientProps) {
  const [items, setItems] = useState<Reading[]>(props.initialItems);
  const [cursor, setCursor] = useState<string | null>(props.initialCursor);
  const [loading, setLoading] = useState(false);

  async function loadMore() {
    if (loading || !cursor) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (cursor) params.set("cursor", cursor);
      const response = await fetch(`/api/history?${params.toString()}`, {
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error("Failed to load history");
      }
      const payload = (await response.json()) as { items: Reading[]; nextCursor: string | null };
      setItems((prev) => [...prev, ...payload.items]);
      setCursor(payload.nextCursor ?? null);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-lapis relative">
      {/* Sacred overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(230,199,92,0.08),transparent_50%)] pointer-events-none" />
      
      {/* Navigation */}
      <Navigation user={props.user} />
      
      {/* Main content */}
      <main className="relative z-10 mx-auto w-full max-w-4xl px-4 py-8">
        {/* Title Section */}
        <header className="text-center mb-12">
          <h1 className="font-display text-5xl md:text-6xl tracking-[0.08em] text-gilded-400 mb-4">
            History
          </h1>
          <p className="font-serif text-xl text-incense-300 italic">
            Illuminated archive
          </p>
        </header>

        {/* Baroque Divider */}
        <BaroqueDivider />

        {/* History Content */}
        <section className="py-16">
          <div className="relative overflow-hidden rounded-[32px] border border-gilded-400/35 bg-parchment-50/95 p-8 text-ash-950 shadow-halo vellum acanthus-border">
            <div className="ornate-corner ornate-corner-tl"></div>
            <div className="ornate-corner ornate-corner-tr"></div>
            <div className="ornate-corner ornate-corner-bl"></div>
            <div className="ornate-corner ornate-corner-br"></div>
            <div className="relative space-y-8">
              {items.length > 0 ? (
                <ul className="grid gap-6 md:grid-cols-2">
                  {items.map((reading) => (
                    <li
                      key={reading.id}
                      className="relative overflow-hidden rounded-[28px] border border-lapis-800/45 bg-ash-950/70 p-5 shadow-[0_20px_45px_rgba(11,18,33,0.35)]"
                    >
                      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(230,199,92,0.12),rgba(106,31,27,0.08))] opacity-80" />
                      <div className="relative space-y-3">
                        <header className="flex flex-wrap items-center justify-between gap-2 text-[0.65rem] uppercase tracking-[0.35em] text-gilded-300">
                          <span>{reading.seed.isoDate}</span>
                          <span>
                            {reading.seed.spreadType} | {reading.model}
                          </span>
                        </header>
                        <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.25em] text-incense-300/80">
                          {reading.cards.map((card) => (
                            <span
                              key={card.cardId}
                              className="rounded-full border border-gilded-400/30 bg-lapis-900/60 px-3 py-1"
                            >
                              {card.position.toUpperCase()} | {getCardName(card.cardId)}
                            </span>
                          ))}
                        </div>
                        <p className="text-sm leading-relaxed text-incense-100/90">{reading.overview}</p>
                        <footer className="text-[0.6rem] uppercase tracking-[0.3em] text-incense-300/70">
                          Seed {reading.seed.hmac.slice(0, 8)}... | Prompt {reading.promptVersion}
                        </footer>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-12">
                  <p className="font-serif text-lg text-ash-900/70">
                    No readings yet. Generate today&apos;s draw to begin your illuminated archive.
                  </p>
                </div>
              )}

              {cursor ? (
                <div className="flex justify-center pt-6">
                  <button
                    className="rounded-full border border-gilded-400/60 bg-gilded-400 px-8 py-3 text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-ash-900 transition-all hover:bg-gilded-300 hover:shadow-halo disabled:cursor-not-allowed disabled:opacity-60"
                    type="button"
                    disabled={loading}
                    onClick={loadMore}
                  >
                    {loading ? "Loading..." : "Load more folios"}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </section>
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

function getCardName(cardId: string) {
  const meta = getTarotCardById(cardId);
  return meta ? meta.name : cardId;
}

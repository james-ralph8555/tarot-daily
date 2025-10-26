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
    <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-12 px-4 pb-24 pt-12 lg:px-8">
      <Navigation user={props.user} />
      <section className="relative overflow-hidden rounded-[40px] border border-lapis-900/45 bg-ash-900/70 p-6 text-incense-200 shadow-halo md:p-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(27,42,74,0.45),transparent_70%)] opacity-80" />
        <div className="relative space-y-6">
          <header className="space-y-3">
            <span className="text-[0.65rem] uppercase tracking-[0.35em] text-gilded-300">Archive</span>
            <h1 className="font-display text-3xl tracking-[0.08em] text-gilded-200 md:text-4xl">
              Illuminated history
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-incense-200/85">
              Each folio preserves the seed, spread, and synthesis from the day it arrived. Return to trace patterns, or
              reopen a card that keeps speaking.
            </p>
          </header>

          {items.length > 0 ? (
            <ul className="grid gap-5 md:grid-cols-2">
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
            <p className="text-sm text-incense-200/80">
              No readings yet. Generate today&apos;s draw to begin your illuminated archive.
            </p>
          )}

          {cursor ? (
            <div className="flex justify-center pt-4">
              <button
                className="rounded-full border border-gilded-400/45 bg-gilded-400/80 px-6 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-ash-900 transition hover:bg-gilded-400 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                disabled={loading}
                onClick={loadMore}
              >
                {loading ? "Loading..." : "Load more folios"}
              </button>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function getCardName(cardId: string) {
  const meta = getTarotCardById(cardId);
  return meta ? meta.name : cardId;
}

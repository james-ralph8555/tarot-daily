'use client';

import { useState } from "react";
import type { Reading } from "@daily-tarot/common";
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
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 pb-16 pt-8">
      <Navigation user={props.user} />
      <section className="card">
        <h1 className="text-xl font-semibold text-amber-100">Reading history</h1>
        {items.length > 0 ? (
          <ul className="mt-4 space-y-4">
            {items.map((reading) => (
              <li key={reading.id} className="rounded border border-slate-500/40 bg-slate-900/30 p-4">
                <header className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-300/80">
                  <span>{reading.seed.isoDate}</span>
                  <span>
                    {reading.seed.spreadType} · {reading.model}
                  </span>
                </header>
                <p className="mt-2 text-sm text-slate-100/90">{reading.overview}</p>
                <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">
                  Seed {reading.seed.hmac.slice(0, 8)}... · Prompt {reading.promptVersion}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-slate-300/80">No readings yet. Generate today's draw to start your history.</p>
        )}
        {cursor ? (
          <button
            className="mt-6 w-full rounded bg-indigo-500/70 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400/80 disabled:opacity-60"
            type="button"
            disabled={loading}
            onClick={loadMore}
          >
            {loading ? "Loading..." : "Load more"}
          </button>
        ) : null}
      </section>
    </main>
  );
}

import { createEffect, createMemo, createSignal, For, Show } from "solid-js";
import { createServerData$ } from "@solidjs/start/server";
import { useRouteData } from "@solidjs/router";
import type { Reading } from "@daily-tarot/common";
import { Navigation } from "../components/Navigation";
import { listReadings } from "../server/reading";
import { validateRequest } from "../server/auth";

type HistoryRouteData = {
  user: { id: string; email: string } | null;
  items: Reading[];
  nextCursor: string | null;
};

export function routeData() {
  return createServerData$(async (_, event) => {
    const auth = await validateRequest(event.request);
    if (!auth) {
      return {
        user: null,
        items: [],
        nextCursor: null
      } satisfies HistoryRouteData;
    }
    const history = await listReadings({ userId: auth.user.id, limit: 10 });
    return {
      user: { id: auth.user.id, email: auth.user.email },
      items: history.items,
      nextCursor: history.nextCursor
    } satisfies HistoryRouteData;
  });
}

export default function History() {
  const data = useRouteData<typeof routeData>();
  const user = createMemo(() => data()?.user ?? null);
  const [items, setItems] = createSignal<Reading[]>(data()?.items ?? []);
  const [cursor, setCursor] = createSignal<string | null>(data()?.nextCursor ?? null);
  const [loading, setLoading] = createSignal(false);

  createEffect(() => {
    setItems(data()?.items ?? []);
    setCursor(data()?.nextCursor ?? null);
  });

  async function loadMore() {
    if (loading() || !cursor()) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (cursor()) params.set("cursor", cursor()!);
      const response = await fetch(`/api/history?${params.toString()}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to load history");
      const payload = await response.json();
      setItems((prev) => [...prev, ...(payload.items as Reading[])]);
      setCursor(payload.nextCursor ?? null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main class="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 pb-16 pt-8">
      <Navigation user={user} />
      <section class="card">
        <h1 class="text-xl font-semibold text-amber-100">Reading history</h1>
        <Show when={items().length > 0} fallback={<EmptyHistory />}>
          <ul class="mt-4 space-y-4">
            <For each={items()}>
              {(reading) => (
                <li class="rounded border border-slate-500/40 bg-slate-900/30 p-4">
                  <header class="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-300/80">
                    <span>{reading.seed.isoDate}</span>
                    <span>
                      {reading.seed.spreadType} · {reading.model}
                    </span>
                  </header>
                  <p class="mt-2 text-sm text-slate-100/90">{reading.overview}</p>
                  <p class="mt-2 text-xs uppercase tracking-wide text-slate-400">
                    Seed {reading.seed.hmac.slice(0, 8)}… · Prompt {reading.promptVersion}
                  </p>
                </li>
              )}
            </For>
          </ul>
        </Show>
        <Show when={cursor()}>
          <button
            class="mt-6 w-full rounded bg-indigo-500/70 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400/80 disabled:opacity-60"
            type="button"
            disabled={loading()}
            onClick={loadMore}
          >
            {loading() ? "Loading…" : "Load more"}
          </button>
        </Show>
      </section>
    </main>
  );
}

function EmptyHistory() {
  return <p class="mt-4 text-sm text-slate-300/80">No readings yet. Generate today’s draw to start your history.</p>;
}

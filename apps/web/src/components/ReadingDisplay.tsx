import type { Reading } from "@daily-tarot/common";
import { getTarotCardById } from "@daily-tarot/common";
import { For, Show } from "solid-js";

interface ReadingDisplayProps {
  reading?: Reading;
  streaming?: Record<string, string>;
}

export function ReadingDisplay(props: ReadingDisplayProps) {
  return (
    <section class="card mt-6 space-y-6">
      <header>
        <h2 class="text-xl font-semibold text-amber-100">Today&apos;s Draw</h2>
        <p class="mt-1 text-sm text-slate-200/80">
          Deterministic daily reading anchored in your seed. Prompts evolve through nightly evaluation.
        </p>
      </header>
      <Show when={props.reading} fallback={<Placeholder streaming={props.streaming} />}>
        {(reading) => (
          <div class="space-y-6">
            <article>
              <h3 class="text-lg font-medium text-indigo-100">Overview</h3>
              <p class="mt-2 text-slate-100/90">{props.streaming?.overview ?? reading().overview}</p>
            </article>

            <article class="space-y-4">
              <h3 class="text-lg font-medium text-indigo-100">Cards</h3>
              <div class="grid gap-4 md:grid-cols-3">
                <For each={reading().cardBreakdowns}>
                  {(item) => (
                    <div class="rounded border border-indigo-500/40 bg-indigo-900/30 p-3">
                      <h4 class="text-sm font-semibold text-amber-200">{formatCardTitle(reading().cards, item.cardId)}</h4>
                      <p class="mt-2 text-sm text-slate-200/80">
                        {props.streaming?.[`card:${item.cardId}`] ?? item.summary}
                      </p>
                    </div>
                  )}
                </For>
              </div>
            </article>

            <article>
              <h3 class="text-lg font-medium text-indigo-100">Synthesis</h3>
              <p class="mt-2 text-slate-100/90">{props.streaming?.synthesis ?? reading().synthesis}</p>
            </article>

            <article>
              <h3 class="text-lg font-medium text-indigo-100">Reflection</h3>
              <p class="mt-2 text-slate-100/90">
                {props.streaming?.actionableReflection ?? reading().actionableReflection}
              </p>
            </article>

            <footer class="text-xs uppercase tracking-wide text-slate-300/70">
              Prompt {reading().promptVersion} · {reading().model} · Seed {reading().seed.hmac.slice(0, 8)}…
            </footer>
          </div>
        )}
      </Show>
    </section>
  );
}

function Placeholder(props: { streaming?: Record<string, string> }) {
  return (
    <div class="space-y-4">
      <p class="text-sm text-slate-200/70">
        {props.streaming?.overview ?? "Trigger a reading to see today’s spread, reflections, and synthesis."}
      </p>
      <div class="animate-pulse space-y-2 text-slate-400/50">
        <div class="h-4 rounded bg-slate-600/30" />
        <div class="h-4 rounded bg-slate-600/30" />
        <div class="h-4 rounded bg-slate-600/30" />
      </div>
    </div>
  );
}

function formatCardTitle(cards: Reading["cards"], cardId: string) {
  const card = cards.find((entry) => entry.cardId === cardId);
  if (!card) return cardId;
  const cardMeta = getTarotCardById(card.cardId);
  const name = cardMeta ? cardMeta.name : card.cardId;
  return `${card.position} · ${name} (${card.orientation})`;
}

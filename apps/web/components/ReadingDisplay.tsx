import type { Reading } from "@daily-tarot/common";
import { getTarotCardById } from "@daily-tarot/common";

interface ReadingDisplayProps {
  reading?: Reading;
  streaming?: Record<string, string>;
}

export function ReadingDisplay(props: ReadingDisplayProps) {
  return (
    <section className="card mt-6 space-y-6">
      <header>
        <h2 className="text-xl font-semibold text-amber-100">Today's Draw</h2>
        <p className="mt-1 text-sm text-slate-200/80">
          Deterministic daily reading anchored in your seed. Prompts evolve through nightly evaluation.
        </p>
      </header>
      {props.reading ? (
        <div className="space-y-6">
          <article>
            <h3 className="text-lg font-medium text-indigo-100">Overview</h3>
            <p className="mt-2 text-slate-100/90">{props.streaming?.overview ?? props.reading.overview}</p>
          </article>

          <article className="space-y-4">
            <h3 className="text-lg font-medium text-indigo-100">Cards</h3>
            <div className="grid gap-4 md:grid-cols-3">
              {props.reading.cardBreakdowns.map((item) => (
                <div key={item.cardId} className="rounded border border-indigo-500/40 bg-indigo-900/30 p-3">
                  <h4 className="text-sm font-semibold text-amber-200">
                    {formatCardTitle(props.reading.cards, item.cardId)}
                  </h4>
                  <p className="mt-2 text-sm text-slate-200/80">
                    {props.streaming?.[`card:${item.cardId}`] ?? item.summary}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article>
            <h3 className="text-lg font-medium text-indigo-100">Synthesis</h3>
            <p className="mt-2 text-slate-100/90">{props.streaming?.synthesis ?? props.reading.synthesis}</p>
          </article>

          <article>
            <h3 className="text-lg font-medium text-indigo-100">Reflection</h3>
            <p className="mt-2 text-slate-100/90">
              {props.streaming?.actionableReflection ?? props.reading.actionableReflection}
            </p>
          </article>

          <footer className="text-xs uppercase tracking-wide text-slate-300/70">
            Prompt {props.reading.promptVersion} · {props.reading.model} · Seed {props.reading.seed.hmac.slice(0, 8)}...
          </footer>
        </div>
      ) : (
        <Placeholder streaming={props.streaming} />
      )}
    </section>
  );
}

function Placeholder(props: { streaming?: Record<string, string> }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-200/70">
        {props.streaming?.overview ?? "Trigger a reading to see today's spread, reflections, and synthesis."}
      </p>
      <div className="animate-pulse space-y-2 text-slate-400/50">
        <div className="h-4 rounded bg-slate-600/30" />
        <div className="h-4 rounded bg-slate-600/30" />
        <div className="h-4 rounded bg-slate-600/30" />
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

import type { Reading } from "@daily-tarot/common";
import { getTarotCardById } from "@daily-tarot/common";

interface ReadingDisplayProps {
  reading?: Reading;
  streaming?: Record<string, string>;
}

export function ReadingDisplay(props: ReadingDisplayProps) {
  return (
    <section className="relative overflow-hidden rounded-[32px] border border-gilded-400/35 bg-parchment-50/95 p-8 text-ash-950 shadow-halo vellum md:p-10">
      <header className="space-y-3 border-b border-gilded-400/40 pb-6">
        <span className="text-[0.65rem] uppercase tracking-[0.35em] text-cardinal-600">Today&apos;s Draw</span>
        <h2 className="font-display text-3xl tracking-[0.08em] text-lapis-800 md:text-4xl">Serene Revelation</h2>
        <p className="max-w-2xl text-sm leading-relaxed text-ash-900/70">
          Deterministic daily ritual anchored in your seed. Prompts evolve only when nightly evaluation proves their
          reverence.
        </p>
      </header>

      {props.reading ? (
        <div className="space-y-10 pt-6">
          <Spread reading={props.reading} streaming={props.streaming} />

          <div className="space-y-8">
            <article className="reading-body space-y-3 text-base leading-relaxed text-ash-900/85">
              <SectionHeading label="Overview" />
              <p>{props.streaming?.overview ?? props.reading.overview}</p>
            </article>

            <article className="space-y-3 text-base leading-relaxed text-ash-900/85">
              <SectionHeading label="Synthesis" />
              <p>{props.streaming?.synthesis ?? props.reading.synthesis}</p>
            </article>

            <article className="space-y-3 text-base leading-relaxed text-ash-900/85">
              <SectionHeading label="Reflection" />
              <p>{props.streaming?.actionableReflection ?? props.reading.actionableReflection}</p>
            </article>
          </div>

          <footer className="text-[0.6rem] uppercase tracking-[0.3em] text-cardinal-500/80">
            Prompt {props.reading.promptVersion} | {props.reading.model} | Seed {props.reading.seed.hmac.slice(0, 8)}...
          </footer>
        </div>
      ) : (
        <Placeholder streaming={props.streaming} />
      )}
    </section>
  );
}

function Spread(props: { reading: Reading; streaming?: Record<string, string> }) {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-10 -top-16 h-64 rounded-full border border-gilded-400/25 bg-gradient-to-b from-gilded-400/20 via-transparent to-transparent opacity-70 blur-3xl md:-top-24 md:h-80" />
      <div className="relative grid gap-4 md:grid-cols-3">
        {props.reading.cardBreakdowns.map((item, index) => {
          const card = props.reading.cards.find((entry) => entry.cardId === item.cardId);
          const title = formatCardTitle(card);
          const summary = props.streaming?.[`card:${item.cardId}`] ?? item.summary;

          const elevation =
            index === 1
              ? "md:-translate-y-3 md:scale-[1.05]"
              : index === 0
                ? "md:-rotate-[2deg] md:translate-y-2"
                : "md:rotate-[2deg] md:translate-y-2";

          return (
            <div
              key={item.cardId}
              className={[
                "relative flex flex-col gap-3 rounded-[24px] border border-gilded-400/35 bg-parchment-100/90 p-4 text-sm shadow-[0_20px_45px_rgba(17,20,24,0.15)] transition-transform duration-500",
                elevation
              ].join(" ")}
            >
              <div className="flex items-center justify-between text-[0.65rem] uppercase tracking-[0.3em] text-cardinal-600">
                <span>{formatPosition(card?.position)}</span>
                <span>{formatOrientation(card?.orientation)}</span>
              </div>
              <h4 className="font-display text-lg tracking-[0.06em] text-lapis-800">{title}</h4>
              <p className="text-sm leading-relaxed text-ash-900/75">{summary}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Placeholder(props: { streaming?: Record<string, string> }) {
  return (
    <div className="space-y-8 pt-6">
      <div className="reading-body text-base leading-relaxed text-ash-900/75">
        <p>{props.streaming?.overview ?? "Set an intent and receive today's illuminated reading."}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-32 rounded-[24px] border border-ash-900/10 bg-parchment-100/70"
          >
            <div className="h-full w-full animate-pulse rounded-[24px] bg-gradient-to-br from-parchment-200/70 to-parchment-100/40" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <div className="h-3 w-5/6 rounded-full bg-parchment-200/60" />
        <div className="h-3 w-4/6 rounded-full bg-parchment-200/50" />
        <div className="h-3 w-3/6 rounded-full bg-parchment-200/40" />
      </div>
    </div>
  );
}

function SectionHeading(props: { label: string }) {
  return (
    <span className="flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.35em] text-cardinal-600">
      <span className="h-px w-6 bg-gilded-400/50" />
      {props.label}
    </span>
  );
}

function formatCardTitle(card: Reading["cards"][number] | undefined) {
  if (!card) return "Unknown card";
  const cardMeta = getTarotCardById(card.cardId);
  const name = cardMeta ? cardMeta.name : card.cardId;
  return name;
}

function formatOrientation(orientation: Reading["cards"][number]["orientation"] | undefined) {
  if (!orientation) return "";
  return orientation.charAt(0).toUpperCase() + orientation.slice(1);
}

function formatPosition(position: Reading["cards"][number]["position"] | undefined) {
  if (!position) return "Card";
  return position.toUpperCase();
}

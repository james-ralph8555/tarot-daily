import type { Reading } from "@daily-tarot/common";
import { getTarotCardById } from "@daily-tarot/common";

interface ReadingDisplayProps {
  reading?: Reading;
  streaming?: Record<string, string>;
}

export function ReadingDisplay(props: ReadingDisplayProps) {
  const hasContent = props.reading || (props.streaming && Object.keys(props.streaming).length > 0);
  
  return (
    <section className="relative">
      {/* Cards take center stage */}
      <div className="mb-16 transition-all duration-500 ease-out">
        {props.reading ? (
          <CardSpread reading={props.reading} streaming={props.streaming} />
        ) : (
          <CardPlaceholder streaming={props.streaming} />
        )}
      </div>

      {/* Unified content container - always present but content changes */}
      <div className="reading-content relative overflow-hidden rounded-[32px] border border-gilded-400/35 bg-parchment-50/95 p-8 text-ash-950 shadow-halo vellum md:p-10 transition-all duration-500 ease-out">
        {!hasContent ? (
          /* Placeholder state */
          <div className="text-center py-8">
            <p className="font-serif text-xl text-incense-300 placeholder-text">
              Set an intent and receive today's illuminated reading.
            </p>
          </div>
        ) : (
          /* Reading content state */
          <div className="space-y-8">
            <article className="reading-body space-y-3 text-base leading-relaxed text-ash-900/85">
              <SectionHeading label="Overview" />
              <p className="reading-text">
                {props.streaming?.overview || props.reading?.overview || ''}
              </p>
            </article>

            <div className="scrollwork-divider">
              <svg width="40" height="40" viewBox="0 0 40 40" className="text-gilded-400">
                <path d="M20 8 L24 16 L32 16 L26 22 L28 30 L20 26 L12 30 L14 22 L8 16 L16 16 Z" fill="currentColor" opacity="0.6"></path>
                <circle cx="20" cy="20" r="3" fill="currentColor"></circle>
              </svg>
            </div>

            <article className="space-y-3 text-base leading-relaxed text-ash-900/85">
              <SectionHeading label="Synthesis" />
              <p className="reading-text">
                {props.streaming?.synthesis || props.reading?.synthesis || ''}
              </p>
            </article>

            <div className="scrollwork-divider">
              <svg width="40" height="40" viewBox="0 0 40 40" className="text-gilded-400">
                <path d="M20 8 L24 16 L32 16 L26 22 L28 30 L20 26 L12 30 L14 22 L8 16 L16 16 Z" fill="currentColor" opacity="0.6"></path>
                <circle cx="20" cy="20" r="3" fill="currentColor"></circle>
              </svg>
            </div>

            <article className="space-y-3 text-base leading-relaxed text-ash-900/85">
              <SectionHeading label="Reflection" />
              <p className="reading-text">
                {props.streaming?.actionableReflection || props.reading?.actionableReflection || ''}
              </p>
            </article>
          </div>
        )}

        {/* Footer - only show when reading is complete */}
        {props.reading && (
          <footer className="text-[0.6rem] uppercase tracking-[0.3em] text-cardinal-500/80 mt-8">
            Prompt {props.reading.promptVersion} | {props.reading.model} | Seed {props.reading.seed.hmac.slice(0, 8)}...
          </footer>
        )}
      </div>
    </section>
  );
}

function CardSpread(props: { reading: Reading; streaming?: Record<string, string> }) {
  return (
    <div className="relative">
      {/* Sacred glow behind cards */}
      <div className="pointer-events-none absolute inset-x-0 -top-20 h-80 rounded-full border border-gilded-400/25 bg-gradient-to-b from-gilded-400/20 via-transparent to-transparent opacity-70 blur-3xl" />
      
      <div className="relative flex justify-center items-start gap-4 md:gap-8">
        {props.reading.cardBreakdowns.map((item, index) => {
          const card = props.reading.cards.find((entry) => entry.cardId === item.cardId);
          const title = formatCardTitle(card);
          const summary = props.streaming?.[`card:${item.cardId}`] ?? item.summary;

          const elevation = "";

          return (
            <div
              key={item.cardId}
              className={`relative transition-all duration-700 ${elevation}`}
            >
              {/* Tarot Card SVG */}
              <div className="relative w-52 h-96 md:w-60 md:h-96">
                <TarotCardSVG 
                  title={title}
                  position={formatPosition(card?.position)}
                  orientation={formatOrientation(card?.orientation)}
                  summary={summary}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CardPlaceholder(props: { streaming?: Record<string, string> }) {
  return (
    <div className="text-center">
      <div className="flex justify-center items-start gap-4 md:gap-8">
        {Array.from({ length: 3 }).map((_, index) => {
          const elevation = "";

          return (
            <div
              key={index}
              className={`relative w-52 h-96 md:w-60 md:h-96 ${elevation} opacity-100 transition-opacity duration-300`}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <TarotCardPlaceholderSVG />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TarotCardSVG({ title, position, orientation, summary }: {
  title: string;
  position: string;
  orientation: string;
  summary: string;
}) {
  const patternId = "cardPattern";
  
  return (
    <div className="relative w-full h-full rounded-lg border-2 border-gilded-400/60 bg-parchment-50 shadow-halo overflow-hidden">
      {/* Card back pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="w-full h-full" style={{
          backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
          backgroundSize: '10px 10px',
          backgroundPosition: '0 0, 5px 5px'
        }} />
      </div>

      {/* Card content */}
      <div className="relative p-4 h-full flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-2">
          <span className="text-[0.6rem] uppercase tracking-[0.3em] text-cardinal-600 font-serif">
            {position}
          </span>
          <span className="text-[0.6rem] uppercase tracking-[0.3em] text-cardinal-600 font-serif">
            {orientation}
          </span>
        </div>

        {/* Central emblem */}
        <div className="flex-1 flex items-center justify-center">
          <svg width="80" height="80" viewBox="0 0 80 80" className="text-gilded-400">
            <circle cx="40" cy="40" r="35" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
            <circle cx="40" cy="40" r="25" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
            <circle cx="40" cy="40" r="15" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.7"/>
            <path d="M40 20 L45 35 L60 35 L48 45 L53 60 L40 50 L27 60 L32 45 L20 35 L35 35 Z" 
                  fill="currentColor" opacity="0.8"/>
          </svg>
        </div>

        {/* Title */}
        <h3 className="font-display text-lg tracking-[0.06em] text-lapis-800 text-center mb-2">
          {title}
        </h3>

        {/* Summary */}
        <p className="text-xs leading-relaxed text-ash-900/75 text-center">
          {summary}
        </p>
      </div>

      {/* Corner ornaments */}
      <div className="absolute top-2 left-2 w-4 h-4">
        <svg viewBox="0 0 16 16" className="text-gilded-400">
          <path d="M2 2 Q8 6 14 2 Q10 8 14 14 Q8 10 2 14 Q6 8 2 2" fill="currentColor" opacity="0.6"/>
        </svg>
      </div>
      <div className="absolute top-2 right-2 w-4 h-4 rotate-90">
        <svg viewBox="0 0 16 16" className="text-gilded-400">
          <path d="M2 2 Q8 6 14 2 Q10 8 14 14 Q8 10 2 14 Q6 8 2 2" fill="currentColor" opacity="0.6"/>
        </svg>
      </div>
      <div className="absolute bottom-2 left-2 w-4 h-4 -rotate-90">
        <svg viewBox="0 0 16 16" className="text-gilded-400">
          <path d="M2 2 Q8 6 14 2 Q10 8 14 14 Q8 10 2 14 Q6 8 2 2" fill="currentColor" opacity="0.6"/>
        </svg>
      </div>
      <div className="absolute bottom-2 right-2 w-4 h-4 rotate-180">
        <svg viewBox="0 0 16 16" className="text-gilded-400">
          <path d="M2 2 Q8 6 14 2 Q10 8 14 14 Q8 10 2 14 Q6 8 2 2" fill="currentColor" opacity="0.6"/>
        </svg>
      </div>
    </div>
  );
}

function TarotCardPlaceholderSVG() {
  const patternId = "placeholderPattern";
  
  return (
    <div className="relative w-full h-full rounded-lg border-2 border-gilded-400/30 bg-parchment-100/50 shadow-lg overflow-hidden">
      {/* Placeholder pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="w-full h-full" style={{
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 19px, currentColor 19px, currentColor 20px),
                           repeating-linear-gradient(90deg, transparent, transparent 19px, currentColor 19px, currentColor 20px)`,
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 0 0',
          opacity: 0.1
        }} />
      </div>

      {/* Central placeholder emblem */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg 
          width="60" 
          height="60" 
          viewBox="0 0 60 60" 
          className="text-gilded-300/40"
          style={{ display: 'block' }}
        >
          <circle cx="30" cy="30" r="25" fill="none" stroke="currentColor" strokeWidth="1"/>
          <circle cx="30" cy="30" r="18" fill="none" stroke="currentColor" strokeWidth="1"/>
          <circle cx="30" cy="30" r="10" fill="none" stroke="currentColor" strokeWidth="1"/>
          <circle cx="30" cy="30" r="3" fill="currentColor"/>
        </svg>
      </div>

      {/* Corner ornaments */}
      <div className="absolute top-2 left-2 w-3 h-3">
        <svg viewBox="0 0 12 12" className="text-gilded-300/30" style={{ display: 'block' }}>
          <path d="M2 2 Q6 4 10 2 Q8 6 10 10 Q6 8 2 10 Q4 6 2 2" fill="currentColor"/>
        </svg>
      </div>
      <div className="absolute top-2 right-2 w-3 h-3 rotate-90">
        <svg viewBox="0 0 12 12" className="text-gilded-300/30" style={{ display: 'block' }}>
          <path d="M2 2 Q6 4 10 2 Q8 6 10 10 Q6 8 2 10 Q4 6 2 2" fill="currentColor"/>
        </svg>
      </div>
      <div className="absolute bottom-2 left-2 w-3 h-3 -rotate-90">
        <svg viewBox="0 0 12 12" className="text-gilded-300/30" style={{ display: 'block' }}>
          <path d="M2 2 Q6 4 10 2 Q8 6 10 10 Q6 8 2 10 Q4 6 2 2" fill="currentColor"/>
        </svg>
      </div>
      <div className="absolute bottom-2 right-2 w-3 h-3 rotate-180">
        <svg viewBox="0 0 12 12" className="text-gilded-300/30" style={{ display: 'block' }}>
          <path d="M2 2 Q6 4 10 2 Q8 6 10 10 Q6 8 2 10 Q4 6 2 2" fill="currentColor"/>
        </svg>
      </div>
    </div>
  );
}

function SectionHeading(props: { label: string }) {
  return (
    <span className="flex items-center gap-3 text-[0.65rem] uppercase tracking-[0.35em] text-cardinal-600 foliate-border">
      <span className="text-gilded-400/60">✦</span>
      {props.label}
      <span className="text-gilded-400/60">✦</span>
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

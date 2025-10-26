'use client';

import { FormEvent, useState } from "react";

interface IntentFormProps {
  defaultIntent?: string;
  onSubmit: (intent: string | undefined) => void;
  loading?: boolean;
}

export function IntentForm(props: IntentFormProps) {
  const [intent, setIntent] = useState(props.defaultIntent ?? "");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = intent.trim();
    props.onSubmit(trimmed ? trimmed : undefined);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="relative overflow-hidden rounded-[32px] border border-lapis-900/40 bg-ash-900/70 p-6 text-incense-200 shadow-halo space-y-5 md:p-8"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(230,199,92,0.18),transparent_65%)] opacity-80" />
      <div className="relative space-y-3">
        <header className="space-y-2">
          <span className="text-[0.65rem] uppercase tracking-[0.35em] text-gilded-300">Intent</span>
          <h3 className="font-display text-2xl tracking-[0.06em] text-gilded-200">Name your exploration</h3>
          <p className="text-sm leading-relaxed text-incense-200/85">
            One sentence is enough to guide the spread. Quiet detail invites sharper resonance.
          </p>
        </header>
        <textarea
          className="min-h-[120px] w-full rounded-3xl border border-lapis-700/40 bg-ash-950/80 p-4 text-sm text-parchment-50 shadow-inner focus:border-gilded-400/60 focus:outline-none focus:ring-0"
          rows={3}
          value={intent}
          onChange={(event) => setIntent(event.currentTarget.value.slice(0, 280))}
          placeholder="Intent (optional)"
        />
      </div>

      <div className="relative flex justify-end">
        <button
          type="submit"
          className="rounded-full border border-gilded-400/50 bg-gilded-400/80 px-6 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-ash-900 transition hover:bg-gilded-400 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={props.loading}
        >
          {props.loading ? "Drawing..." : "Draw today's cards"}
        </button>
      </div>
    </form>
  );
}

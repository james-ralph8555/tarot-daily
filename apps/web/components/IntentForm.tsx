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
      className="relative overflow-hidden rounded-[32px] border border-gilded-400/35 bg-parchment-50/95 p-8 text-ash-950 shadow-halo vellum space-y-6 acanthus-border"
    >
      <div className="ornate-corner ornate-corner-tl"></div>
      <div className="ornate-corner ornate-corner-tr"></div>
      <div className="ornate-corner ornate-corner-bl"></div>
      <div className="ornate-corner ornate-corner-br"></div>
      <div className="relative space-y-4">
        <header className="text-center space-y-3">
          <span className="text-[0.65rem] uppercase tracking-[0.35em] text-cardinal-600">Set Your Intent</span>
          <h3 className="font-display text-3xl tracking-[0.06em] text-lapis-800">Let's reflect</h3>
          <p className="font-serif text-base leading-relaxed text-ash-900/70 max-w-md mx-auto">
            A question to sit with… One sentence is enough to guide the spread.
          </p>
        </header>
        <textarea
          className="min-h-[120px] w-full rounded-2xl border border-lapis-700/30 bg-parchment-100/60 p-4 text-sm text-ash-900 shadow-inner transition-all duration-300 ease-out focus:border-gilded-400/60 focus:outline-none focus:ring-0 focus:shadow-halo placeholder:text-ash-900/40"
          rows={3}
          value={intent}
          onChange={(event) => setIntent(event.currentTarget.value.slice(0, 280))}
          placeholder="What seeks clarity today? (optional)"
        />
      </div>

      <div className="relative flex justify-center">
        <button
          type="submit"
          className="rounded-full border border-gilded-400/60 bg-gilded-400 px-8 py-3 text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-ash-900 transition-all duration-300 ease-out hover:bg-gilded-300 hover:shadow-halo hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60 disabled:transform-none"
          disabled={props.loading}
        >
          {props.loading ? "Revealing..." : "Draw today's cards"}
        </button>
      </div>
    </form>
  );
}

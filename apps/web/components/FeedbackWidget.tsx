'use client';

import { FormEvent, useEffect, useState } from "react";
import type { Feedback } from "@daily-tarot/common";
import { submitFeedback } from "../lib/api-client";

interface FeedbackWidgetProps {
  readingId?: string;
  existing?: Feedback | null;
  onSubmitted?: (feedback: Feedback) => void;
}

export function FeedbackWidget(props: FeedbackWidgetProps) {
  const [thumb, setThumb] = useState<number | null>(props.existing?.thumb ?? null);
  const [rationale, setRationale] = useState(props.existing?.rationale ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setThumb(props.existing?.thumb ?? null);
    setRationale(props.existing?.rationale ?? "");
  }, [props.existing?.thumb, props.existing?.rationale, props.readingId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!props.readingId || thumb === null) return;
    try {
      setPending(true);
      const response = await submitFeedback({
        readingId: props.readingId,
        thumb: thumb === 1 ? 1 : -1,
        rationale: rationale.trim() || undefined
      });
      setError(null);
      props.onSubmitted?.(response.feedback);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="relative overflow-hidden rounded-[32px] border border-gilded-400/35 bg-parchment-50/95 p-8 text-ash-950 shadow-halo vellum space-y-6 acanthus-border"
      onSubmit={handleSubmit}
    >
      <div className="ornate-corner ornate-corner-tl"></div>
      <div className="ornate-corner ornate-corner-tr"></div>
      <div className="ornate-corner ornate-corner-bl"></div>
      <div className="ornate-corner ornate-corner-br"></div>
      <div className="relative space-y-4">
        <header className="text-center space-y-3">
          <span className="text-[0.65rem] uppercase tracking-[0.35em] text-cardinal-600">Hold this lightly</span>
          <h3 className="font-display text-3xl tracking-[0.06em] text-lapis-800">How did this resonate?</h3>
          <p className="font-serif text-base leading-relaxed text-ash-900/70 max-w-md mx-auto">
            Your signal helps tomorrow's refinement speak with clearer voice.
          </p>
        </header>

        <div className="flex justify-center gap-4">
          <FeedbackChoice
            active={thumb === 1}
            disabled={pending}
            label="Resonated"
            tone="positive"
            onClick={() => setThumb(1)}
          />
          <FeedbackChoice
            active={thumb === -1}
            disabled={pending}
            label="Missed"
            tone="negative"
            onClick={() => setThumb(-1)}
          />
        </div>

        {thumb !== null ? (
          <label className="block space-y-2 text-sm">
            <span className="text-[0.65rem] uppercase tracking-[0.35em] text-lapis-600/80">Optional context</span>
            <textarea
              className="w-full rounded-2xl border border-lapis-700/30 bg-parchment-100/60 p-4 text-sm text-ash-900 shadow-inner focus:border-gilded-400/60 focus:outline-none focus:ring-0 placeholder:text-ash-900/40"
              rows={3}
              value={rationale}
              onChange={(event) => setRationale(event.currentTarget.value.slice(0, 1000))}
              placeholder="Share nuance or guidance for tomorrow's refinement."
              disabled={pending}
            />
          </label>
        ) : null}

        <div className="flex items-center justify-between pt-4">
          {error ? <p className="text-sm text-cardinal-600">{error}</p> : <span />}
          <button
            type="submit"
            className="rounded-full border border-gilded-400/60 bg-gilded-400 px-8 py-3 text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-ash-900 transition-all hover:bg-gilded-300 hover:shadow-halo disabled:cursor-not-allowed disabled:opacity-60"
            disabled={pending || thumb === null || !props.readingId}
          >
            {pending ? "Saving..." : "Submit feedback"}
          </button>
        </div>
      </div>
    </form>
  );
}

function FeedbackChoice(props: {
  active: boolean;
  disabled: boolean;
  label: string;
  onClick: () => void;
  tone: "positive" | "negative";
}) {
  const palette =
    props.tone === "positive"
      ? props.active
        ? "border-gilded-400/70 bg-gilded-400/30 text-lapis-800 shadow-halo"
        : "border-lapis-700/50 text-ash-900/70 hover:border-gilded-400/50 hover:text-lapis-800"
      : props.active
        ? "border-cardinal-400/70 bg-cardinal-400/20 text-cardinal-800"
        : "border-lapis-700/50 text-ash-900/70 hover:border-cardinal-400/50 hover:text-cardinal-800";

  return (
    <button
      type="button"
      className={[
        "rounded-full border px-8 py-3 text-[0.7rem] font-semibold uppercase tracking-[0.35em] transition-all",
        palette
      ].join(" ")}
      onClick={props.onClick}
      disabled={props.disabled}
    >
      {props.label}
    </button>
  );
}

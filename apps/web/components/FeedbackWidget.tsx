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
      className="relative overflow-hidden rounded-[32px] border border-lapis-900/40 bg-ash-900/70 p-6 text-incense-200 shadow-halo space-y-5 md:p-8"
      onSubmit={handleSubmit}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_-20%,rgba(106,31,27,0.35),transparent_60%)] opacity-90" />
      <div className="relative space-y-3">
        <header className="space-y-2">
          <span className="text-[0.65rem] uppercase tracking-[0.35em] text-cardinal-300">Feedback</span>
          <h3 className="font-display text-2xl tracking-[0.06em] text-gilded-200">How did this land?</h3>
          <p className="text-sm leading-relaxed text-incense-200/85">
            A binary signal, plus nuance if you have it, keeps the optimizer honest without diluting the ritual.
          </p>
        </header>

        <div className="flex flex-wrap gap-3">
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
            <span className="text-[0.65rem] uppercase tracking-[0.35em] text-gilded-200/80">Optional context</span>
            <textarea
              className="w-full rounded-3xl border border-lapis-700/40 bg-ash-950/80 p-4 text-sm text-parchment-50 shadow-inner focus:border-gilded-400/60 focus:outline-none focus:ring-0"
              rows={3}
              value={rationale}
              onChange={(event) => setRationale(event.currentTarget.value.slice(0, 1000))}
              placeholder="Share nuance or guidance for tomorrow's refinement."
              disabled={pending}
            />
          </label>
        ) : null}

        <div className="flex items-center justify-between pt-2">
          {error ? <p className="text-sm text-rose-300">{error}</p> : <span />}
          <button
            type="submit"
            className="rounded-full border border-gilded-400/40 bg-gilded-400/80 px-6 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-ash-900 transition hover:bg-gilded-400 disabled:cursor-not-allowed disabled:opacity-60"
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
        ? "border-emerald-400/70 bg-emerald-500/20 text-emerald-200"
        : "border-lapis-700/50 text-incense-200 hover:border-emerald-400/50 hover:text-emerald-200"
      : props.active
        ? "border-rose-400/70 bg-rose-500/20 text-rose-200"
        : "border-lapis-700/50 text-incense-200 hover:border-rose-400/50 hover:text-rose-200";

  return (
    <button
      type="button"
      className={[
        "rounded-full border px-6 py-2 text-[0.65rem] uppercase tracking-[0.35em] transition",
        palette
      ].join(" ")}
      onClick={props.onClick}
      disabled={props.disabled}
    >
      {props.label}
    </button>
  );
}

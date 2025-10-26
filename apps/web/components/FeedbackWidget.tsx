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
    <form className="card mt-6 space-y-4" onSubmit={handleSubmit}>
      <header>
        <h3 className="text-lg font-semibold text-amber-100">How did this land?</h3>
        <p className="mt-1 text-sm text-slate-200/80">
          Binary signal plus optional context helps the optimizer focus on what matters.
        </p>
      </header>

      <div className="flex items-center gap-4">
        <button
          type="button"
          className={`rounded-full border px-4 py-2 text-sm transition ${
            thumb === 1
              ? "border-emerald-400 bg-emerald-500/20 text-emerald-200"
              : "border-slate-500/50 text-slate-200/80 hover:border-emerald-400/60"
          }`}
          onClick={() => setThumb(1)}
          disabled={pending}
        >
          👍 Resonated
        </button>
        <button
          type="button"
          className={`rounded-full border px-4 py-2 text-sm transition ${
            thumb === -1
              ? "border-rose-400 bg-rose-500/20 text-rose-200"
              : "border-slate-500/50 text-slate-200/80 hover:border-rose-400/60"
          }`}
          onClick={() => setThumb(-1)}
          disabled={pending}
        >
          👎 Missed
        </button>
      </div>

      {thumb !== null ? (
        <label className="block">
          <span className="text-xs uppercase tracking-wide text-slate-400/80">Optional context</span>
          <textarea
            className="mt-2 w-full rounded-md border border-slate-500/50 bg-slate-900/40 p-3 text-sm text-slate-100 shadow-inner focus:border-indigo-400 focus:outline-none"
            rows={3}
            value={rationale}
            onChange={(event) => setRationale(event.currentTarget.value.slice(0, 1000))}
            placeholder="Share nuance or what to improve next time."
            disabled={pending}
          />
        </label>
      ) : null}

      <div className="flex items-center justify-between">
        {error ? <p className="text-sm text-rose-300">{error}</p> : <span />}
        <button
          type="submit"
          className="rounded bg-indigo-500/80 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400/80 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={pending || thumb === null || !props.readingId}
        >
          {pending ? "Saving..." : "Submit feedback"}
        </button>
      </div>
    </form>
  );
}

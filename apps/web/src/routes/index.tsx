import { createEffect, createMemo, createSignal } from "solid-js";
import { createServerData$ } from "@solidjs/start/server";
import { useRouteData } from "@solidjs/router";
import type { Reading, Feedback } from "@daily-tarot/common";
import { Navigation } from "../components/Navigation";
import { IntentForm } from "../components/IntentForm";
import { ReadingDisplay } from "../components/ReadingDisplay";
import { FeedbackWidget } from "../components/FeedbackWidget";
import { fetchReading, streamReading } from "../lib/api";
import { validateRequest } from "../server/auth";

type RouteData = {
  user: { id: string; email: string } | null;
};

export function routeData() {
  return createServerData$(async (_, event) => {
    const auth = await validateRequest(event.request);
    return {
      user: auth
        ? {
            id: auth.user.id,
            email: auth.user.email
          }
        : null
    } satisfies RouteData;
  });
}

export default function Home() {
  const data = useRouteData<typeof routeData>();
  const user = createMemo(() => data()?.user ?? null);
  const [reading, setReading] = createSignal<Reading | undefined>();
  const [feedback, setFeedback] = createSignal<Feedback | null>(null);
  const [streaming, setStreaming] = createSignal<Record<string, string>>({});
  const [isStreaming, setIsStreaming] = createSignal(false);

  createEffect(() => {
    if (!user()) return;
    void loadReading();
  });

  async function loadReading() {
    try {
      const existing = await fetchReading();
      setReading(existing);
    } catch (error) {
      console.error("Unable to load reading", error);
    }
  }

  async function handleIntentSubmit(intent?: string) {
    if (!user()) {
      window.location.href = "/login";
      return;
    }
    setStreaming({});
    setIsStreaming(true);
    try {
      await streamReading({ intent }, (event) => {
        if (event.type === "delta" && typeof event.data === "object" && event.data) {
          const { section, text } = event.data as { section: string; text: string };
          setStreaming((prev) => ({ ...prev, [section]: text }));
        } else if (event.type === "final") {
          setReading(event.data as Reading);
          setStreaming({});
        } else if (event.type === "error") {
          throw new Error((event.data as { message?: string })?.message ?? "Reading failed");
        }
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsStreaming(false);
    }
  }

  return (
    <main class="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 pb-16 pt-8">
      <Navigation user={user} />
      <section class="grid items-start gap-6 lg:grid-cols-[2fr,1fr]">
        <div>
          <ReadingDisplay reading={reading()} streaming={streaming()} />
          <FeedbackWidget readingId={reading()?.id} existing={feedback()} onSubmitted={setFeedback} />
        </div>
        <aside class="space-y-6">
          <IntentForm onSubmit={handleIntentSubmit} loading={isStreaming()} />
          <Callouts isStreaming={isStreaming()} />
        </aside>
      </section>
    </main>
  );
}

function Callouts(props: { isStreaming: boolean }) {
  return (
    <div class="card space-y-4 text-sm text-slate-200/80">
      <p>
        Your daily draw uses deterministic seeding, so you can revisit the same reading later and reproduce the exact
        spread.
      </p>
      <p>
        Feedback you share feeds the nightly DSPy optimizer. Prompts stay in staging until evaluation metrics improve or
        hold steady.
      </p>
      <p class="text-xs uppercase tracking-wide text-amber-200">
        {props.isStreaming ? "Streaming in progress…" : "Model: Groq GPT-OSS · Pipeline: DSPy + DuckDB"}
      </p>
    </div>
  );
}

import { Navigation } from "../components/Navigation";
import { createMemo } from "solid-js";
import { createServerData$ } from "@solidjs/start/server";
import { useRouteData } from "@solidjs/router";
import { validateRequest } from "../server/auth";

type LegalRouteData = {
  user: { id: string; email: string } | null;
};

export function routeData() {
  return createServerData$(async (_, event) => {
    const auth = await validateRequest(event.request);
    return {
      user: auth ? { id: auth.user.id, email: auth.user.email } : null
    } satisfies LegalRouteData;
  });
}

export default function Legal() {
  const data = useRouteData<typeof routeData>();
  const user = createMemo(() => data()?.user ?? null);

  return (
    <main class="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 pb-16 pt-8">
      <Navigation user={user} />
      <section class="card space-y-4 text-sm text-slate-200/90">
        <h1 class="text-xl font-semibold text-amber-100">Disclaimers & Terms</h1>
        <p>
          Tarot Daily is designed for reflection and entertainment. The guidance offered is not a substitute for
          professional medical, legal, financial, or mental health advice.
        </p>
        <p>
          Readings are generated using large language models hosted by Groq. While prompts are optimized with DSPy and
          evaluated nightly, outputs may still contain inaccuracies or hallucinations. Always use your own judgment.
        </p>
        <p>
          By using the service you consent to the collection of feedback data—thumbs up/down signals, optional rationale,
          and interaction metadata—for the purpose of improving prompt quality. Identifiers are stored in DuckDB with
          strict access controls.
        </p>
        <p>
          Web push notifications require explicit opt-in and can be revoked at any time from browser settings or this
          app’s settings page.
        </p>
        <p>
          Contact support at <a href="mailto:support@example.com">support@example.com</a>.
        </p>
      </section>
    </main>
  );
}

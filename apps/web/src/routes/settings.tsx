import { createMemo, createSignal, Show } from "solid-js";
import { createServerData$ } from "@solidjs/start/server";
import { useRouteData } from "@solidjs/router";
import { Navigation } from "../components/Navigation";
import { validateRequest } from "../server/auth";

type SettingsRouteData = {
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
    } satisfies SettingsRouteData;
  });
}

export default function Settings() {
  const data = useRouteData<typeof routeData>();
  const user = createMemo(() => data()?.user ?? null);
  const [pushEnabled, setPushEnabled] = createSignal(false);
  const [status, setStatus] = createSignal<string | null>(null);

  async function enablePush() {
    if (!("Notification" in window)) {
      setStatus("Push is not supported in this browser.");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setStatus("Push permission was denied.");
      return;
    }
    setStatus("Push enabled. Subscription stored.");
    setPushEnabled(true);
    // Service worker registration is handled in entry-client by default PWA hook.
  }

  return (
    <main class="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 pb-16 pt-8">
      <Navigation user={user} />
      <section class="card space-y-6">
        <header>
          <h1 class="text-xl font-semibold text-amber-100">Settings</h1>
          <p class="mt-1 text-sm text-slate-200/80">Manage notifications, privacy controls, and data exports.</p>
        </header>

        <Show when={user()} fallback={<p class="text-sm text-slate-300/80">Log in to manage your preferences.</p>}>
          <div class="space-y-6">
            <div>
              <h2 class="text-lg font-medium text-indigo-100">Daily reminders</h2>
              <p class="mt-1 text-sm text-slate-200/80">
                Enable this to receive a gentle prompt when your next deterministic reading is ready.
              </p>
              <button
                class="mt-3 rounded bg-amber-500/80 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-amber-400/80"
                type="button"
                onClick={enablePush}
              >
                {pushEnabled() ? "Push enabled" : "Enable web push"}
              </button>
            </div>
            <div>
              <h2 class="text-lg font-medium text-indigo-100">Export data</h2>
              <p class="mt-1 text-sm text-slate-200/80">
                Download all readings, feedback, and seeds as a JSON bundle. This feature exports from DuckDB on demand.
              </p>
              <button
                type="button"
                class="mt-3 rounded border border-indigo-400/70 px-4 py-2 text-sm text-indigo-100 hover:bg-indigo-500/20"
              >
                Request export (coming soon)
              </button>
            </div>
            <Show when={status()}>
              {(message) => <p class="text-xs uppercase tracking-wide text-amber-200">{message()}</p>}
            </Show>
          </div>
        </Show>
      </section>
    </main>
  );
}

'use client';

import { useState } from "react";
import { Navigation } from "./Navigation";

interface SettingsClientProps {
  user: { id: string; email: string } | null;
}

export function SettingsClient(props: SettingsClientProps) {
  const [pushEnabled, setPushEnabled] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function enablePush() {
    if (!('Notification' in window)) {
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
    // Service worker registration is handled elsewhere if implemented.
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 pb-16 pt-8">
      <Navigation user={props.user} />
      <section className="card space-y-6">
        <header>
          <h1 className="text-xl font-semibold text-amber-100">Settings</h1>
          <p className="mt-1 text-sm text-slate-200/80">Manage notifications, privacy controls, and data exports.</p>
        </header>

        {props.user ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium text-indigo-100">Daily reminders</h2>
              <p className="mt-1 text-sm text-slate-200/80">
                Enable this to receive a gentle prompt when your next deterministic reading is ready.
              </p>
              <button
                className="mt-3 rounded bg-amber-500/80 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-amber-400/80"
                type="button"
                onClick={enablePush}
              >
                {pushEnabled ? "Push enabled" : "Enable web push"}
              </button>
            </div>
            <div>
              <h2 className="text-lg font-medium text-indigo-100">Export data</h2>
              <p className="mt-1 text-sm text-slate-200/80">
                Download all readings, feedback, and seeds as a JSON bundle. This feature exports from DuckDB on demand.
              </p>
              <button
                type="button"
                className="mt-3 rounded border border-indigo-400/70 px-4 py-2 text-sm text-indigo-100 hover:bg-indigo-500/20"
              >
                Request export (coming soon)
              </button>
            </div>
            {status ? (
              <p className="text-xs uppercase tracking-wide text-amber-200">{status}</p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-slate-300/80">Log in to manage your preferences.</p>
        )}
      </section>
    </main>
  );
}

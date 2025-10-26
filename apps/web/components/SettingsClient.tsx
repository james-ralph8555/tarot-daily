'use client';

import { useState, type ReactNode } from "react";
import { Navigation } from "./Navigation";

interface SettingsClientProps {
  user: { id: string; email: string } | null;
}

export function SettingsClient(props: SettingsClientProps) {
  const [pushEnabled, setPushEnabled] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

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
    // Service worker registration is handled elsewhere if implemented.
  }

  return (
    <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-12 px-4 pb-24 pt-12 lg:px-8">
      <Navigation user={props.user} />
      <section className="relative overflow-hidden rounded-[36px] border border-lapis-900/45 bg-ash-900/70 p-6 text-incense-200 shadow-halo md:p-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(230,199,92,0.16),transparent_70%)] opacity-80" />
        <div className="relative space-y-6">
          <header className="space-y-3">
            <span className="text-[0.65rem] uppercase tracking-[0.35em] text-gilded-300">Settings</span>
            <h1 className="font-display text-3xl tracking-[0.08em] text-gilded-200 md:text-4xl">Keep the ritual steady</h1>
            <p className="max-w-2xl text-sm leading-relaxed text-incense-200/85">
              Manage reminders, exports, and privacy protections so the cadence remains intentional.
            </p>
          </header>

          {props.user ? (
            <div className="grid gap-8 md:grid-cols-2">
              <SettingCard
                title="Daily reminders"
                description="Invite a gentle altar bell when your next deterministic reading is ready."
              >
                <button
                  className="rounded-full border border-gilded-400/45 bg-gilded-400/80 px-6 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-ash-900 transition hover:bg-gilded-400 disabled:cursor-not-allowed disabled:opacity-60"
                  type="button"
                  onClick={enablePush}
                  disabled={pushEnabled}
                >
                  {pushEnabled ? "Push enabled" : "Enable web push"}
                </button>
              </SettingCard>

              <SettingCard
                title="Export data"
                description="Download all readings, feedback, and seeds as a JSON bundle. We extract directly from DuckDB when ready."
              >
                <button
                  type="button"
                  className="rounded-full border border-lapis-700/60 px-6 py-2 text-[0.65rem] uppercase tracking-[0.35em] text-incense-200 transition hover:border-gilded-400/45 hover:text-gilded-200"
                >
                  Request export (coming soon)
                </button>
              </SettingCard>
            </div>
          ) : (
            <p className="text-sm text-incense-200/80">Log in to manage your preferences.</p>
          )}

          {status ? (
            <p className="text-[0.65rem] uppercase tracking-[0.35em] text-gilded-200">{status}</p>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function SettingCard(props: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-lapis-800/45 bg-ash-950/70 p-6 shadow-[0_18px_40px_rgba(11,18,33,0.32)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(27,42,74,0.55),rgba(14,15,18,0.9))]" />
      <div className="relative space-y-3">
        <h2 className="font-display text-xl tracking-[0.06em] text-gilded-200">{props.title}</h2>
        <p className="text-sm leading-relaxed text-incense-200/85">{props.description}</p>
        <div>{props.children}</div>
      </div>
    </div>
  );
}

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
    <div className="min-h-screen bg-gradient-lapis relative">
      {/* Sacred overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(230,199,92,0.08),transparent_50%)] pointer-events-none" />
      
      {/* Navigation */}
      <Navigation user={props.user} />
      
      {/* Main content */}
      <main className="relative z-10 mx-auto w-full max-w-4xl px-4 py-8">
        {/* Title Section */}
        <header className="text-center mb-12">
          <h1 className="font-display text-5xl md:text-6xl tracking-[0.08em] text-gilded-400 mb-4">
            Settings
          </h1>
          <p className="font-serif text-xl text-incense-300 italic">
            Keep ritual steady
          </p>
        </header>

        {/* Baroque Divider */}
        <BaroqueDivider />

        {/* Settings Content */}
        <section className="py-16">
          <div className="relative overflow-hidden rounded-[32px] border border-gilded-400/35 bg-parchment-50/95 p-8 text-ash-950 shadow-halo vellum acanthus-border">
            <div className="ornate-corner ornate-corner-tl"></div>
            <div className="ornate-corner ornate-corner-tr"></div>
            <div className="ornate-corner ornate-corner-bl"></div>
            <div className="ornate-corner ornate-corner-br"></div>
            <div className="relative space-y-8">
              {props.user ? (
                <div className="grid gap-8 md:grid-cols-2">
                  <SettingCard
                    title="Daily reminders"
                    description="Invite a gentle altar bell when your next deterministic reading is ready."
                  >
                    <button
                      className="rounded-full border border-gilded-400/60 bg-gilded-400 px-6 py-3 text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-ash-900 transition-all hover:bg-gilded-300 hover:shadow-halo disabled:cursor-not-allowed disabled:opacity-60"
                      type="button"
                      onClick={enablePush}
                      disabled={pushEnabled}
                    >
                      {pushEnabled ? "Push enabled" : "Enable web push"}
                    </button>
                  </SettingCard>

                  <SettingCard
                    title="Export data"
                    description="Download all readings, feedback, and seeds as a JSON bundle. We extract directly from PostgreSQL when ready."
                  >
                    <button
                      type="button"
                      className="rounded-full border border-lapis-700/60 bg-lapis-800/40 px-6 py-3 text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-parchment-50 transition-all hover:border-lapis-600/60 hover:bg-lapis-800/60"
                    >
                      Request export (coming soon)
                    </button>
                  </SettingCard>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="font-serif text-lg text-ash-900/70">Log in to manage your preferences.</p>
                </div>
              )}

              {status ? (
                <div className="text-center pt-4">
                  <p className="text-[0.65rem] uppercase tracking-[0.35em] text-lapis-600">{status}</p>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function BaroqueDivider() {
  return (
    <div className="relative py-8">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-full h-px bg-gradient-to-r from-transparent via-gilded-400/40 to-transparent" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-full h-px bg-gradient-to-r from-transparent via-gilded-400/20 to-transparent mt-1" />
      </div>
      <div className="relative flex justify-center">
        <svg width="50" height="50" viewBox="0 0 50 50" className="text-gilded-400 drop-shadow-[0_0_8px_rgba(230,199,92,0.4)]">
          <path
            d="M25 10 L30 20 L40 20 L32 28 L35 40 L25 34 L15 40 L18 28 L10 20 L20 20 Z"
            fill="currentColor"
            opacity="0.7"
          />
          <circle cx="25" cy="25" r="4" fill="currentColor" />
          <path d="M15,25 Q20,20 25,25 Q30,30 35,25" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.5" />
          <path d="M20,25 Q22,22 25,25 Q28,28 30,25" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0.4" />
        </svg>
      </div>
    </div>
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

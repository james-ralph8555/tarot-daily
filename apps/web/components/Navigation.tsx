'use client';

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { logout } from "../lib/api-client";

interface NavigationProps {
  user?: { id: string; email: string } | null;
  actions?: ReactNode;
}

export function Navigation(props: NavigationProps = {}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    try {
      setPending(true);
      await logout();
      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("Failed to log out", error);
    } finally {
      setPending(false);
    }
  }

  return (
    <nav className="relative z-20 bg-gradient-to-b from-lapis-900/80 to-transparent px-4 py-6 scrollwork-top">
      <div className="scrollwork-corner scrollwork-corner-left"></div>
      <div className="scrollwork-corner scrollwork-corner-right"></div>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 md:grid md:grid-cols-[1fr_auto_1fr] md:items-center">
        <div className="flex flex-wrap items-center justify-center gap-3 text-[0.65rem] uppercase tracking-[0.35em] text-incense-300 md:justify-start acanthus-border">
          <Link href="/history" className="transition hover:text-gilded-300">
            History
          </Link>
          <span className="text-lapis-200/40">❦</span>
          <Link href="/tuning" className="transition hover:text-gilded-300">
            Tuning
          </Link>
          <span className="text-lapis-200/40">❦</span>
          <Link href="/settings" className="transition hover:text-gilded-300">
            Settings
          </Link>
          <span className="text-lapis-200/40">❦</span>
          <Link href="/legal" className="transition hover:text-gilded-300">
            Legal
          </Link>
        </div>

        <Link
          href="/"
          className="relative flex items-center justify-center font-display text-xl uppercase tracking-[0.35em] text-gilded-300 drop-shadow-[0_0_28px_rgba(230,199,92,0.35)] md:text-2xl transition hover:text-gilded-200"
        >
          <span className="text-gilded-400/60 mr-2">❦</span>
          Tarot Daily
          <span className="text-gilded-400/60 ml-2">❦</span>
        </Link>

        <div className="flex items-center justify-center gap-3 md:justify-end">
          {props.actions ?? null}
          <AuthState user={props.user ?? null} onLogout={handleLogout} pending={pending} />
        </div>
      </div>
    </nav>
  );
}

function AuthState(props: { user: { id: string; email: string } | null; onLogout: () => void; pending: boolean }) {
  if (!props.user) {
    return (
      <Link
        href="/login"
        className="rounded-full border border-gilded-400/40 bg-gilded-400/20 px-5 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-gilded-200 transition hover:bg-gilded-400/30"
      >
        Log in
      </Link>
    );
  }

  return (
    <span className="flex items-center gap-3 text-xs uppercase tracking-[0.28em] text-incense-200">
      <span className="rounded-full border border-gilded-400/40 bg-lapis-900/60 px-4 py-2 text-[0.6rem] font-medium">
        {props.user.email}
      </span>
      <button
        className="rounded-full border border-cardinal-400/40 bg-cardinal-700/50 px-4 py-2 text-[0.6rem] font-medium uppercase tracking-[0.35em] text-parchment-50 transition hover:border-cardinal-300/60 hover:bg-cardinal-700/60 disabled:opacity-50"
        type="button"
        onClick={props.onLogout}
        disabled={props.pending}
      >
        {props.pending ? "Logging out..." : "Log out"}
      </button>
    </span>
  );
}

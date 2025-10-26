'use client';

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { logout } from "../lib/api-client";

interface NavigationProps {
  user: { id: string; email: string } | null;
  actions?: ReactNode;
}

export function Navigation(props: NavigationProps) {
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
    <nav className="flex items-center justify-between rounded-b-xl border border-indigo-500/40 bg-indigo-950/60 px-6 py-4 shadow-lg backdrop-blur">
      <Link href="/" className="text-lg font-semibold uppercase tracking-wide text-amber-100">
        Tarot Daily
      </Link>
      <div className="flex items-center gap-4 text-sm text-slate-200/80">
        <Link href="/history" className="hover:text-amber-200">
          History
        </Link>
        <Link href="/settings" className="hover:text-amber-200">
          Settings
        </Link>
        <Link href="/legal" className="hover:text-amber-200">
          Legal
        </Link>
        <AuthState user={props.user} onLogout={handleLogout} pending={pending} />
      </div>
      {props.actions ?? null}
    </nav>
  );
}

function AuthState(props: { user: { id: string; email: string } | null; onLogout: () => void; pending: boolean }) {
  if (!props.user) {
    return (
      <Link
        href="/login"
        className="rounded bg-amber-500/30 px-3 py-1 text-xs font-semibold text-amber-100 transition hover:bg-amber-500/50"
      >
        Log in
      </Link>
    );
  }

  return (
    <span className="flex items-center gap-3">
      <span className="rounded-full border border-amber-200/40 px-3 py-[6px] text-xs uppercase tracking-wide text-amber-100">
        {props.user.email}
      </span>
      <button
        className="rounded bg-rose-500/20 px-3 py-1 text-xs font-medium text-rose-200 transition hover:bg-rose-500/30 disabled:opacity-50"
        type="button"
        onClick={props.onLogout}
        disabled={props.pending}
      >
        {props.pending ? "Logging out…" : "Log out"}
      </button>
    </span>
  );
}

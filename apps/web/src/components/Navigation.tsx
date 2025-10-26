import { A } from "@solidjs/router";
import type { Accessor } from "solid-js";
import { logout } from "../lib/api";

interface NavigationProps {
  user: Accessor<{ id: string; email: string } | null>;
}

export function Navigation(props: NavigationProps) {
  async function handleLogout() {
    await logout();
    window.location.href = "/login";
  }

  return (
    <nav class="flex items-center justify-between rounded-b-xl border border-indigo-500/40 bg-indigo-950/60 px-6 py-4 shadow-lg backdrop-blur">
      <A href="/" class="text-lg font-semibold uppercase tracking-wide text-amber-100">
        Tarot Daily
      </A>
      <div class="flex items-center gap-4 text-sm text-slate-200/80">
        <A href="/history" class="hover:text-amber-200">
          History
        </A>
        <A href="/settings" class="hover:text-amber-200">
          Settings
        </A>
        <A href="/legal" class="hover:text-amber-200">
          Legal
        </A>
        <ShowAuth user={props.user} onLogout={handleLogout} />
      </div>
    </nav>
  );
}

function ShowAuth(props: { user: Accessor<{ id: string; email: string } | null>; onLogout: () => void }) {
  const user = props.user;
  return (
    <span class="flex items-center gap-3">
      {user() ? (
        <>
          <span class="rounded-full border border-amber-200/40 px-3 py-[6px] text-xs uppercase tracking-wide text-amber-100">
            {user()?.email}
          </span>
          <button
            class="rounded bg-rose-500/20 px-3 py-1 text-xs font-medium text-rose-200 transition hover:bg-rose-500/30"
            type="button"
            onClick={props.onLogout}
          >
            Log out
          </button>
        </>
      ) : (
        <A href="/login" class="rounded bg-amber-500/30 px-3 py-1 text-xs font-semibold text-amber-100 hover:bg-amber-500/50">
          Log in
        </A>
      )}
    </span>
  );
}

'use client';

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { login } from "../../lib/api-client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      await login(email, password);
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError("Invalid credentials");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="relative overflow-hidden rounded-[36px] border border-lapis-900/45 bg-ash-900/70 p-6 text-incense-200 shadow-halo space-y-6 md:p-8"
      onSubmit={handleSubmit}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(27,42,74,0.55),transparent_70%)] opacity-90" />
      <div className="relative space-y-6">
        <header className="space-y-3">
          <span className="text-[0.65rem] uppercase tracking-[0.35em] text-gilded-300">Welcome back</span>
          <h1 className="font-display text-3xl tracking-[0.08em] text-gilded-200">Light the altar</h1>
          <p className="text-sm leading-relaxed text-incense-200/85">
            Sign in to continue your deterministic ritual and revisit the folios you have archived.
          </p>
        </header>

        <label className="block space-y-2 text-sm">
          <span className="text-[0.65rem] uppercase tracking-[0.35em] text-gilded-200/80">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.currentTarget.value)}
            className="w-full rounded-3xl border border-lapis-700/50 bg-ash-950/80 px-4 py-3 text-sm text-parchment-50 focus:border-gilded-400/60 focus:outline-none focus:ring-0"
            placeholder="you@example.com"
          />
        </label>
        <label className="block space-y-2 text-sm">
          <span className="text-[0.65rem] uppercase tracking-[0.35em] text-gilded-200/80">Password</span>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
            className="w-full rounded-3xl border border-lapis-700/50 bg-ash-950/80 px-4 py-3 text-sm text-parchment-50 focus:border-gilded-400/60 focus:outline-none focus:ring-0"
          />
        </label>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        <button
          type="submit"
          className="w-full rounded-full border border-gilded-400/45 bg-gilded-400/80 px-6 py-3 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-ash-900 transition hover:bg-gilded-400 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={pending}
        >
          {pending ? "Signing in..." : "Sign in"}
        </button>
        <p className="text-xs text-incense-200/80">
          No account?{" "}
          <Link href="/register" className="underline decoration-gilded-300/70 decoration-dashed underline-offset-4">
            Create one here.
          </Link>
        </p>
      </div>
    </form>
  );
}

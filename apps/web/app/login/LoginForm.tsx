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
    <form className="card space-y-5" onSubmit={handleSubmit}>
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-amber-100">Welcome back</h1>
        <p className="text-sm text-slate-200/80">Access deterministic daily readings and your history.</p>
      </header>
      <label className="block">
        <span className="text-xs uppercase tracking-wide text-slate-400/90">Email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.currentTarget.value)}
          className="mt-2 w-full rounded-md border border-slate-500/50 bg-slate-900/40 p-3 text-sm text-slate-100 focus:border-indigo-400 focus:outline-none"
          placeholder="you@example.com"
        />
      </label>
      <label className="block">
        <span className="text-xs uppercase tracking-wide text-slate-400/90">Password</span>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.currentTarget.value)}
          className="mt-2 w-full rounded-md border border-slate-500/50 bg-slate-900/40 p-3 text-sm text-slate-100 focus:border-indigo-400 focus:outline-none"
        />
      </label>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      <button
        type="submit"
        className="w-full rounded bg-amber-500/80 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-amber-400/80 disabled:opacity-50"
        disabled={pending}
      >
        {pending ? "Signing in..." : "Sign in"}
      </button>
      <p className="text-xs text-slate-300/80">
        No account?{" "}
        <Link href="/register" className="underline decoration-amber-200/70 decoration-dashed">
          Create one here.
        </Link>
      </p>
    </form>
  );
}

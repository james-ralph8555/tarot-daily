'use client';

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { register } from "../../lib/api-client";

export function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setPending(true);
    try {
      await register(email, password);
      // Small delay to ensure cookies are processed
      setTimeout(() => {
        router.replace("/");
        router.refresh();
      }, 100);
    } catch (err) {
      setError((err as Error).message || "Registration failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="relative overflow-hidden rounded-[36px] border border-lapis-900/45 bg-ash-900/70 p-6 text-incense-200 shadow-halo space-y-6 md:p-8"
      onSubmit={handleSubmit}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(106,31,27,0.45),transparent_70%)] opacity-90" />
      <div className="relative space-y-6">
        <header className="space-y-3">
          <span className="text-[0.65rem] uppercase tracking-[0.35em] text-gilded-300">Create your account</span>
          <h1 className="font-display text-3xl tracking-[0.08em] text-gilded-200">Join the daily ritual</h1>
          <p className="text-sm leading-relaxed text-incense-200/85">
            Begin receiving deterministic readings with prompts that sharpen every night they are tested.
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
          {pending ? "Creating..." : "Create account"}
        </button>
        <p className="text-xs text-incense-200/80">
          Already have an account?{" "}
          <Link href="/login" className="underline decoration-gilded-300/70 decoration-dashed underline-offset-4">
            Sign in
          </Link>
          .
        </p>
      </div>
    </form>
  );
}

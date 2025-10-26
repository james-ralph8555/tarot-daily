import { createSignal } from "solid-js";
import { A, useNavigate } from "@solidjs/router";
import { login } from "../lib/api";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  async function handleSubmit(event: Event) {
    event.preventDefault();
    setPending(true);
    try {
      await login(email(), password());
      navigate("/");
    } catch (err) {
      setError("Invalid credentials");
    } finally {
      setPending(false);
    }
  }

  return (
    <main class="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-4">
      <form class="card space-y-5" onSubmit={handleSubmit}>
        <header class="space-y-2">
          <h1 class="text-2xl font-semibold text-amber-100">Welcome back</h1>
          <p class="text-sm text-slate-200/80">Access deterministic daily readings and your history.</p>
        </header>
        <label class="block">
          <span class="text-xs uppercase tracking-wide text-slate-400/90">Email</span>
          <input
            type="email"
            required
            value={email()}
            onInput={(event) => setEmail(event.currentTarget.value)}
            class="mt-2 w-full rounded-md border border-slate-500/50 bg-slate-900/40 p-3 text-sm text-slate-100 focus:border-indigo-400 focus:outline-none"
            placeholder="you@example.com"
          />
        </label>
        <label class="block">
          <span class="text-xs uppercase tracking-wide text-slate-400/90">Password</span>
          <input
            type="password"
            required
            minlength={8}
            value={password()}
            onInput={(event) => setPassword(event.currentTarget.value)}
            class="mt-2 w-full rounded-md border border-slate-500/50 bg-slate-900/40 p-3 text-sm text-slate-100 focus:border-indigo-400 focus:outline-none"
          />
        </label>
        {error() && <p class="text-sm text-rose-300">{error()}</p>}
        <button
          type="submit"
          class="w-full rounded bg-amber-500/80 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-amber-400/80 disabled:opacity-50"
          disabled={pending()}
        >
          {pending() ? "Signing in…" : "Sign in"}
        </button>
        <p class="text-xs text-slate-300/80">
          No account? <A href="/register">Create one here.</A>
        </p>
      </form>
    </main>
  );
}

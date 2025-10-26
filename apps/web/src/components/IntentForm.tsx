import { createSignal } from "solid-js";

interface IntentFormProps {
  defaultIntent?: string;
  onSubmit: (intent: string | undefined) => void;
  loading?: boolean;
}

export function IntentForm(props: IntentFormProps) {
  const [intent, setIntent] = createSignal(props.defaultIntent ?? "");

  function handleSubmit(event: Event) {
    event.preventDefault();
    props.onSubmit(intent().trim() ? intent().trim() : undefined);
  }

  return (
    <form onSubmit={handleSubmit} class="card space-y-4">
      <header>
        <h3 class="text-lg font-semibold text-amber-100">Set your intent</h3>
        <p class="mt-1 text-sm text-slate-200/80">
          A single sentence about what you want to explore today helps contextualize the draw.
        </p>
      </header>
      <textarea
        class="w-full rounded-md border border-slate-500/50 bg-slate-900/40 p-3 text-sm text-slate-100 shadow-inner focus:border-indigo-400 focus:outline-none"
        rows={3}
        value={intent()}
        onInput={(event) => setIntent(event.currentTarget.value.slice(0, 280))}
        placeholder="Intent (optional)"
      />

      <div class="flex justify-end">
        <button
          type="submit"
          class="rounded bg-amber-500/80 px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-amber-400/80 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={props.loading}
        >
          {props.loading ? "Drawing…" : "Draw today&apos;s cards"}
        </button>
      </div>
    </form>
  );
}

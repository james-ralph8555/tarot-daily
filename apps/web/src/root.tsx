import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import { ErrorBoundary } from "solid-js/web";
import "./styles/app.css";

export default function App() {
  return (
    <Router
      root={props => (
        <>
          <Suspense>
            <ErrorBoundary fallback={(err) => <ErrorView error={err} />}>
              {props.children}
            </ErrorBoundary>
          </Suspense>
        </>
      )}
    >
      <FileRoutes />
    </Router>
  );
}

function ErrorView(props: { error: unknown }) {
  return (
    <main class="mx-auto max-w-2xl p-6 text-center text-white">
      <h1 class="text-2xl font-semibold">We hit a snag</h1>
      <p class="mt-2 opacity-80">
        Something went wrong while loading the page. Please refresh — if the issue persists, reach out via
        settings.
      </p>
      <pre class="mt-4 overflow-auto rounded bg-black/50 p-4 text-left text-xs">{String(props.error)}</pre>
    </main>
  );
}

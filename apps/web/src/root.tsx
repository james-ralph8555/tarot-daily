import { Suspense } from "solid-js";
import { Body, ErrorBoundary, FileRoutes, Head, Html, Meta, Scripts, Title } from "@solidjs/start";
import { Router } from "@solidjs/router";
import "./styles/app.css";

export default function Root() {
  return (
    <Html lang="en">
      <Head>
        <Title>Tarot Daily</Title>
        <Meta name="description" content="Deterministic daily tarot readings with evolving prompts." />
        <Meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta name="theme-color" content="#3b0764" />
        <link rel="manifest" href="/manifest.webmanifest" />
      </Head>
      <Body>
        <Suspense>
          <ErrorBoundary fallback={(err) => <ErrorView error={err} />}>
            <Router>
              <FileRoutes />
            </Router>
          </ErrorBoundary>
        </Suspense>
        <Scripts />
      </Body>
    </Html>
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

# Daily Tarot Monorepo

Deterministic daily tarot readings delivered via a SolidStart SSR web app and a Python DSPy pipeline.

## Prerequisites
- Docker (optional, for container builds)

Copy the appropriate template from `infra/env/*.env` to `.env` files at the repo root and within `apps/web`. Populate
the placeholders such as `GROQ_API_KEY`, `HMAC_SECRET`, Lucia session secrets, and VAPID keys before running locally.

## Quick Start

```bash
tarot-pipeline --help
tarot-pipeline nightly
```

## Repository Layout
- `apps/web` – SolidStart app, API routes, Lucia auth, and PWA assets.
- `apps/pipeline` – DSPy pipelines, DuckDB schema, and Typer CLI entrypoints.
- `packages/common` – Shared TypeScript models and Zod schemas.
- `infra` – Environment manifests and operational docs.

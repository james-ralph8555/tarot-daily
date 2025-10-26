# Daily Tarot Monorepo

Deterministic daily tarot readings delivered via a SolidStart SSR web app and a Python DSPy pipeline.

## Prerequisites
- [Nix](https://nixos.org/download.html) with flakes enabled
- Docker (optional, for container builds)

Copy the appropriate template from `infra/env/*.env` to `.env` files at the repo root and within `apps/web`. Populate
the placeholders such as `GROQ_API_KEY`, `HMAC_SECRET`, Lucia session secrets, and VAPID keys before running locally.

## Quick Start

```bash
nix develop
tarot-pipeline --help
tarot-pipeline nightly
```

## Repository Guidelines

Always enter the Nix shell before running Python: `nix develop` for an interactive session or prefix commands with `nix develop --command …`.

### NEVER RUN THE DEV SERVER

NEVER RUN npm dev

## Repository Layout
- `apps/web` – SolidStart app, API routes, Lucia auth, and PWA assets.
- `apps/pipeline` – DSPy pipelines, DuckDB schema, and Typer CLI entrypoints.
- `packages/common` – Shared TypeScript models and Zod schemas.
- `infra` – Environment manifests and operational docs.

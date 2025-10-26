# Daily Tarot Monorepo

Deterministic daily tarot readings delivered via a SolidStart SSR web app and a Python DSPy pipeline.

## Prerequisites
- [Nix](https://nixos.org/download.html) with flakes enabled (recommended)
- Docker (optional, for container builds)

Copy the appropriate template from `infra/env/*.env` to `.env` files at the repo root and within `apps/web`. Populate
the placeholders such as `GROQ_API_KEY`, `HMAC_SECRET`, Lucia session secrets, and VAPID keys before running locally.

## Quick Start with Nix

```bash
# Enter development environment
nix develop

# Install Python dependencies (first time only)
pip install -r apps/pipeline/requirements.txt

# Run the tarot pipeline
tarot-pipeline --help
tarot-pipeline nightly

# Web app development
cd apps/web
npm install
npm run build
```

## Traditional Setup (without Nix)

> Note: Nix is strongly recommended for reproducible builds. Use this only if you cannot install Nix.

- Node.js 20+ and npm
- Python 3.11+
- DuckDB CLI or Python package (for pipeline jobs)

```bash
npm install
npm install --workspace @daily-tarot/web

python -m venv .venv
source .venv/bin/activate
pip install -e apps/pipeline
```

## Repository Guidelines

### Build, Test, and Development Commands

Always enter the Nix shell before running Python: `nix develop` for an interactive session or prefix commands with `nix develop --command …`.

### NEVER RUN THE DEV SERVER

NEVER RUN npm dev

## Use the Pipeline CLI

```bash
# Inside Nix shell
tarot-pipeline dataset build dev_snapshot
tarot-pipeline nightly --target dev_snapshot
```
The CLI manages DuckDB-backed datasets, prompt optimization, and nightly batch runs defined in `apps/pipeline`.

## Repository Layout
- `apps/web` – SolidStart app, API routes, Lucia auth, and PWA assets.
- `apps/pipeline` – DSPy pipelines, DuckDB schema, and Typer CLI entrypoints.
- `packages/common` – Shared TypeScript models and Zod schemas.
- `infra` – Dockerfiles, environment manifests, and operational docs.

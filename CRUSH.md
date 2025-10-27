# CRUSH.md - Development Guide

## Commands

### Database Setup
- **Start PostgreSQL**: `docker compose -f apps/db/docker-compose.yml up -d postgres`
- **Stop PostgreSQL**: `docker compose -f apps/db/docker-compose.yml down`
- **Reset Database**: `docker compose -f apps/db/docker-compose.yml down -v && docker compose -f apps/db/docker-compose.yml up -d postgres`

### Database Query 

docker exec daily-tarot-postgres psql "postgresql://tarot:tarot123@postgres:5432/daily_tarot" -c "<QUERY>" 
docker exec daily-tarot-postgres psql "postgresql://tarot:tarot123@localhost:5432/daily_tarot" -c "<QUERY>" 

### Web App (apps/web/)
- **Build**: `npm run build`
- **Dev**: `npm run dev` 
- **Lint**: `npm run lint`
- **Format**: `npm run format`
- **Single test**: `npm run test` (currently echo placeholder)

### Python Pipeline (apps/pipeline/)
- **CLI**: `tarot-pipeline dataset build`, `tarot-pipeline optimize mipro`, `tarot-pipeline eval dataset`
- **Tests**: `pytest`

### Root Workspace
- **All workspaces**: `npm run build`, `npm run lint`, `npm run format`

## Code Style

### TypeScript
- Strict mode, `'use client'` for client components
- PascalCase components, camelCase functions/variables
- Import order: React hooks → external libs → local imports
- Zod schemas for validation

### Python  
- Type hints required, Pydantic models
- snake_case functions, PascalCase classes
- Typer CLI with subcommands

### UI/Visual (critical)
- Follow DESIGN_GUIDE.md sacred aesthetic system
- Colors: lapis.800, cardinal.700, parchment.50, gilded.400, ash.950
- Typography: Cinzel (display), EB Garamond (editorial), Inter (UI)
- Dark theme first, semantic naming
- Tailwind utilities only, no custom CSS without reason

### Error Handling
- Specific error types in try-catch
- Graceful fallbacks with user feedback
- Zod validation for external data

## Performance
- SVG sprites for icons/ornaments
- CSS effects over raster images
- Font subsetting, font-display: swap
- content-visibility:auto for long content

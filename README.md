# Rift

Rift is a greenfield monorepo for a League of Legends analytics and coaching platform. The product ingests ranked Solo/Duo match data from Riot, normalizes it into clean tables, computes deterministic analytics, and then sends a narrower report contract to OpenAI to produce structured coaching reports.

The repository now includes the full T001-T007 backend/product foundation, a premium T008 overview surface, and a first live T009 pillar pass. The current focus is disciplined stabilization and refinement rather than broad scope expansion.

## Repository layout

```text
apps/
  web/          Next.js + TypeScript + Tailwind product surface and workbench
  api/          FastAPI backend service
  worker/       Python worker/job shell
packages/
  analytics/    Deterministic analytics package
  prompts/      Versioned prompt assets and guidance
  shared-types/ Shared frontend contracts
infra/
  docker/       Lightweight placeholder for future local infra assets
  migrations/   Placeholder for database migrations
docs/           Product, architecture, roadmap, journal, and changelog docs
tickets/        Delivery roadmap tickets
```

## Local development

### Web

1. Install Node dependencies from the repo root:

   ```powershell
   npm install
   ```

2. Start the frontend:

   ```powershell
   npm run dev:web
   ```

3. Open `http://localhost:3000`.

The frontend expects the API base URL in `apps/web/.env.local`. Start from [`apps/web/.env.example`](./apps/web/.env.example).

### API

1. Create and activate a virtual environment:

   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```

2. Install the analytics package and API package in editable mode:

   ```powershell
   pip install -e packages/analytics
   pip install -e apps/api
   ```

3. Start the API:

   ```powershell
   uvicorn api_service.main:app --app-dir apps/api/src --reload
   ```

4. Check `http://localhost:8000/health`.

The API environment variables are documented in [`apps/api/.env.example`](./apps/api/.env.example).

### Worker

The worker shell uses only the Python standard library for now.

```powershell
$env:PYTHONPATH = "apps/worker/src"
python -m worker_service.cli --job placeholder
```

## Current implemented scope

- Email/password auth shell
- User-owned Riot profiles
- Raw ranked Solo/Duo ingestion
- Clean normalization from persisted raw payloads
- Deterministic analytics from the latest clean snapshot
- Structured report generation from persisted analytics summaries
- Premium overview dashboard surface
- First live T009 pillar pass:
  - Champion Form
  - Macro Lens
  - Coaching Board
- First live T010 contextual chat MVP:
  - Grounded to the selected profile and the displayed persisted report artifact
  - Ephemeral local history only with no persisted chat threads or generic assistant system

## Current deferred scope

- Final pillar polish and richer chart treatment
- Broader chat persistence, richer interaction design, and any generic thread or assistant architecture beyond the current grounded T010 MVP
- Production-grade PostgreSQL, migrations discipline, queue infra, and broader test coverage

## Repo continuity

- Current delivery state: see [`docs/roadmap.md`](./docs/roadmap.md)
- Ongoing engineering log: see [`docs/dev-journal.md`](./docs/dev-journal.md)
- Change history: see [`docs/changelog.md`](./docs/changelog.md)
- Ticket status: see [`tickets/`](./tickets)

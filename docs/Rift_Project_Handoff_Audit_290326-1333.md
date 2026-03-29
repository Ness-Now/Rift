# Rift — Technical Handoff, Delivery History, Architecture Audit, And Resume Guide

> Purpose: this document is a **developer handoff pack** for the current Rift repository. A developer who receives **this markdown + the project zip** should be able to understand the product strategy, repository structure, delivery history, runtime flow, current implementation state, known issues, and the recommended way to continue development **without guessing**.

---

# 1. Executive Summary

## What Rift is
Rift is a **League of Legends analytics and coaching platform** built as a monorepo. The product takes the player from:
1. authenticated account ownership,
2. owned Riot profile resolution,
3. raw Riot match ingestion,
4. clean deterministic normalization,
5. deterministic analytics summary generation,
6. structured AI coaching report generation,
7. premium dashboard rendering of those persisted artifacts.

The core philosophy is:
- **deterministic calculations first**,
- **LLM interpretation second**,
- **presentation third**,
- **chat later**.

The system is explicitly designed so that the model **does not replace analytics**. Instead, the LLM reads a **narrow, auditable report-input contract** derived from persisted analytics summaries.

## Current implementation status
### Implemented in code
- **T001** foundation
- **T002** auth shell
- **T003** owned Riot profiles
- **T004** raw ranked Solo/Duo ingestion
- **T005** clean normalization
- **T006** deterministic analytics engine
- **T007** structured report generation via OpenAI Responses API contract
- **T008** premium dashboard overview
- **T009** first live dashboard pillar pass

### Not implemented yet
- **T010** contextual chat surface
- production-grade infra/migrations/postgres/queueing/test suite
- final dashboard polish and deeper pillar interactions

## Current repo reality in one sentence
**The backend data pipeline is real and coherent from auth to persisted reports, and the frontend now has a real premium product surface, but repo discipline/document freshness still needs tightening.**

---

# 2. Product Strategy And Architectural Intent

## Product strategy
The product is deliberately staged in this order:
1. **Ownership boundary** — user account owns Riot profiles.
2. **Trusted raw data capture** — Riot data stored raw, not mixed directly into product logic.
3. **Normalization** — raw vendor JSON converted into internal relational clean tables.
4. **Deterministic analytics** — all core stats/features calculated from clean tables, not inferred by prompts.
5. **LLM interpretation** — structured coaching report generated from a **curated analytics contract**.
6. **Dashboard presentation** — overview and pillars render persisted artifacts.
7. **Contextual chat** — later, and only using approved dashboard/report context.

## Why the architecture is shaped this way
The repository is intentionally split so each layer has one responsibility:
- **apps/api** orchestrates HTTP, persistence, external API access, and model calls.
- **packages/analytics** owns deterministic calculations, independent of FastAPI.
- **packages/prompts** owns versioned prompt assets.
- **packages/shared-types** owns frontend-facing TypeScript contracts.
- **apps/web** renders product surfaces and workbench controls.
- **apps/worker** is a future async execution shell.

## Design principles that must not be broken
1. **No raw Riot payloads in UI logic**.
2. **No analytics computed inside prompts**.
3. **No prompt access directly to raw tables**.
4. **Owned Riot profile is the central ownership root for data domains**.
5. **Run tables and artifact tables must remain auditable**.
6. **Presentation should consume persisted artifacts, not rebuild business logic ad hoc**.
7. **Chat (T010+) must consume approved context, not bypass contracts**.

---

# 3. Delivery History Ticket By Ticket

## T001 — Foundation
### Goal
Create the monorepo skeleton, app shells, docs, and next tickets.

### Delivered
- repo layout for `apps/`, `packages/`, `docs/`, `tickets/`, `infra/`
- Next.js + Tailwind web shell
- FastAPI backend shell
- worker shell
- foundational docs and roadmap tickets

### Why it matters
This established the **boundary-first** development style. Later tickets were expected to stay narrow and vertical.

---

## T002 — Auth Shell
### Goal
Create a minimal authenticated boundary so later work is user-owned.

### Delivered
- email/password signup and login
- token handling
- `/auth/me`
- frontend login/signup/protected shell
- user persistence in SQLite

### Result
Every later domain now anchors to a user.

---

## T003 — Riot Profile Ownership
### Goal
Allow authenticated users to own Riot profiles before ingesting matches.

### Delivered
- Riot ID parsing and routing
- Riot `account-v1` lookup to resolve Riot ID → PUUID
- owned profile CRUD and verification
- primary profile logic
- frontend profile manager

### Result
The ownership chain became:
`users -> riot_profiles`

---

## T004 — Match Ingestion
### Goal
Fetch recent ranked Solo/Duo matches and persist raw payloads.

### Delivered
- `ingestion_runs`
- Riot match-v5 client
- recent queue-420 match id fetch
- raw match detail persistence
- raw timeline persistence
- ingestion UI manager

### Important rule
Queue `420` is validated again from returned match detail, not just from the match list request.

### Result
The system now persists **vendor truth first**.

---

## T005 — Normalization / Clean Schema
### Goal
Turn raw Riot payloads into stable internal tables.

### Delivered
- `normalization_runs`
- `matches_clean`
- `participants_clean`
- `teams_clean`
- `timeline_clean`
- `events_clean`
- deduplication by `match_id`
- canonical raw source selection from the latest completed raw payload row
- clean snapshot replacement for a profile

### Result
Analytics no longer depend on raw JSON.

---

## T006 — Analytics Engine
### Goal
Build deterministic analytics summaries from normalized data.

### Delivered
- `packages/analytics`
- `analytics_runs`
- `analytics_summaries`
- persisted sections:
  - `overview`
  - `progression`
  - `splits`
  - `carry_context`
  - `macro`
  - `early_mid`
  - `data_quality`
- frontend analytics manager

### Result
Structured product features exist before any model interpretation.

---

## T007 — Report Generation
### Goal
Generate structured coaching output from analytics summaries using OpenAI.

### Delivered
- `report_runs`
- `report_artifacts`
- deterministic `report_input` contract
- versioned prompt assets in `packages/prompts/player-report/v1`
- OpenAI Responses API client path with strict structured JSON output handling
- persisted report input + report output artifacts
- frontend report manager

### Result
The LLM sits **on top of analytics**, not instead of analytics.

---

## T008 — Dashboard Overview
### Goal
Create the first premium product-facing dashboard page.

### Delivered
- dark premium shell
- left navigation
- selected profile overview hero
- KPI band
- executive summary block from persisted report artifact
- recent form snapshots
- strengths / weaknesses / next actions panels
- workbench moved into a secondary collapsible area

### Result
The app stopped feeling like an admin stack and started feeling like a product surface.

---

## T009 — Dashboard Pillars (first pass)
### Goal
Deepen the product with dedicated pillar surfaces.

### Delivered
Three live sections beneath the overview:
1. **Champion Form**
   - champion pool distribution
   - champion split board
   - main-champion progression
   - early/lane checkpoint context
   - time/day/session form patterns
2. **Macro Lens**
   - objective conversion in wins/losses
   - duration-shape comparison
   - carry/team context signals
   - macro interpretation overlays
3. **Coaching Board**
   - priority stack
   - coaching focus blocks
   - execution steps
   - risk flags
   - confidence state
   - analytics evidence guardrails

### Result
T009 exists in code as a **first real pass**, not just placeholder navigation.

---

## T010 — Contextual Chat
### Status
Not implemented.

### Intended role
A constrained contextual chat using existing dashboard/report context, not a generic assistant.

---

# 4. End-To-End Runtime Flow

## Ownership chain
The central ownership chain is:
- `users`
- `riot_profiles.user_id`
- `ingestion_runs.riot_profile_id`
- `normalization_runs.riot_profile_id`
- `analytics_runs.riot_profile_id`
- `report_runs.riot_profile_id`

Every later domain inherits user ownership through the owned Riot profile.

## Full data flow
1. User signs up / logs in.
2. User creates a Riot profile.
3. Backend resolves Riot ID to PUUID via Riot account-v1.
4. User starts ingestion for an owned profile.
5. Backend fetches queue-420 match ids + match payloads + timelines.
6. Backend stores raw payloads and finalizes ingestion run.
7. User starts normalization for the same profile.
8. Backend scans completed raw payloads, deduplicates duplicate `match_id`, selects canonical raw rows, and writes clean snapshot tables.
9. User starts analytics for the profile.
10. Backend loads clean snapshot tables and computes a structured analytics summary.
11. User starts report generation.
12. Backend selects a completed analytics run, narrows it into a report-input contract, loads versioned prompt assets, and generates strict structured JSON via OpenAI.
13. Backend stores both report input and report output as an auditable artifact.
14. Frontend overview and pillars render latest analytics and report artifacts.

## API route map
- `GET /health`
- `GET /version`
- `POST /auth/signup`
- `POST /auth/login`
- `GET /auth/me`
- `POST /riot-profiles`
- `GET /riot-profiles`
- `GET /riot-profiles/{profile_id}`
- `DELETE /riot-profiles/{profile_id}`
- `POST /riot-profiles/{profile_id}/verify`
- `POST /riot-profiles/{profile_id}/make-primary`
- `POST /ingestion-runs`
- `GET /ingestion-runs`
- `GET /ingestion-runs/{run_id}`
- `GET /ingestion-runs/{run_id}/matches`
- `POST /normalization-runs`
- `GET /normalization-runs`
- `GET /normalization-runs/{run_id}`
- `POST /analytics-runs`
- `GET /analytics-runs`
- `GET /analytics-runs/{run_id}`
- `GET /analytics-runs/{run_id}/summary`
- `POST /report-runs`
- `GET /report-runs`
- `GET /report-runs/{run_id}`
- `GET /report-runs/{run_id}/input-preview`
- `GET /report-runs/{run_id}/report`

---

# 5. How The Team Has Been Working So Far

## Actual working style observed in the project
The repo shows a consistent delivery style:
- **ticket-driven development**
- **narrow vertical slices**
- **domain-by-domain backend first**
- **persisted contracts before UI polish**
- **LLM added only after deterministic analytics existed**
- **frontend premium surface added after data contracts stabilized**

## Practical implementation pattern used so far
Typical ticket flow has been:
1. define scope in ticket/doc terms,
2. implement backend domain + persistence + service + routes,
3. add minimal operational frontend manager,
4. verify compile/build/typecheck/fixtures,
5. update docs/tickets,
6. only then move to richer product UI.

## What this means for future developers
Do **not** restart from the UI. Continue from the same principles:
- keep layers narrow,
- do not let frontend re-derive backend logic,
- do not let reports or chat bypass analytics contracts,
- avoid big refactors unless a boundary is actually broken,
- prefer additive ticket-sized changes.

## Recommended workflow going forward
For every new ticket:
1. write/adjust the ticket objective,
2. define the exact contract change,
3. implement backend or shared logic first,
4. expose minimal operational UI if needed,
5. verify with compile/typecheck/build/fixture,
6. update docs/journal/changelog,
7. only then do premium UI refinement.

## Strong recommendation
Add and maintain:
- `docs/dev-journal.md`
- `docs/changelog.md`

The project has advanced faster than its internal documentation discipline. A new developer should introduce those immediately.

---

# 6. Environment, Setup, And Local Commands

## Web
### Env
`apps/web/.env.example`
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

### Install
From repo root:
```bash
npm install
```

### Run
```bash
npm run dev:web
```

### Typecheck
```bash
npm run typecheck:web
```

## API
### Env
`apps/api/.env.example`
```env
API_ENVIRONMENT=development
APP_VERSION=0.1.0
AUTH_SECRET_KEY=change-me-for-local-dev
AUTH_TOKEN_TTL_SECONDS=604800
WEB_ORIGIN=http://localhost:3000
RIOT_API_KEY=
RIOT_API_TIMEOUT_SECONDS=10
RIOT_API_MAX_RETRIES=3
RIOT_API_RETRY_BACKOFF_SECONDS=1.0
OPENAI_API_KEY=
OPENAI_REPORT_MODEL=gpt-5-mini
OPENAI_API_TIMEOUT_SECONDS=30
```

### Install
```bash
python -m venv .venv
source .venv/bin/activate
pip install -e packages/analytics
pip install -e apps/api
```

### Run
```bash
uvicorn api_service.main:app --app-dir apps/api/src --reload
```

## Worker
### Run placeholder worker
```bash
PYTHONPATH=apps/worker/src python -m worker_service.cli --job placeholder
```

---

# 7. Audit Results On The Supplied Zip

## Validation run performed during this audit
### Python compile
Command used:
```bash
python -m compileall apps/api/src packages/analytics/src apps/worker/src
```
Result: **passed**.

### Frontend typecheck
Important: on the raw extracted zip, TypeScript workspace resolution initially failed for `@rift/shared-types`. After a fresh root `npm install`, the workspace linked correctly.

Command used after fresh install:
```bash
npm install
npm run typecheck:web
```
Result: **passed**.

### Frontend production build
Command used:
```bash
npm run build:web
```
Result: **fails offline because `next/font/google` tries to fetch Manrope and Space Grotesk from Google Fonts**.

Observed failure:
- `app/layout.tsx`
- `Failed to fetch Manrope from Google Fonts`
- `Failed to fetch Space Grotesk from Google Fonts`

This is a **real known issue** for offline/CI environments without outbound access. The code itself is not necessarily broken, but the build currently assumes network access for fonts.

## Audit conclusion
### Strong positives
- backend domains are coherent and actually implemented,
- T001 through T009 first pass are real in code,
- the core product boundary strategy is good,
- deterministic before LLM is respected,
- report input/output artifacts are auditable,
- frontend now has a real premium product surface.

### Weak points / repo debt
1. **Docs lag behind code** in places.
2. **T008/T009 ticket files are stale** relative to actual implementation.
3. **Public landing page is outdated** and still describes normalization/analytics/dashboard as future work.
4. **No persistent dev journal/changelog yet**.
5. **Production build depends on remote Google Fonts**.
6. **Test suite is still weak**; verification currently relies mostly on build/typecheck/fixture passes.

## Rule for future maintainers
When docs and code disagree, **current code wins**, but docs must be corrected immediately after the next stabilization pass.

---

# 8. Project Tree For Orientation

```text
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── api_service/
│   │   │   │   ├── analytics/
│   │   │   │   ├── api/
│   │   │   │   ├── auth/
│   │   │   │   ├── core/
│   │   │   │   ├── ingestion/
│   │   │   │   ├── normalization/
│   │   │   │   ├── reports/
│   │   │   │   ├── riot_profiles/
│   │   │   │   ├── users/
│   │   │   │   └── main.py
│   │   ├── .env.example
│   │   └── pyproject.toml
│   ├── web/
│   │   ├── app/
│   │   │   ├── app/page.tsx
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/
│   │   │   ├── analytics/
│   │   │   ├── auth/
│   │   │   ├── dashboard/
│   │   │   ├── ingestion/
│   │   │   ├── normalization/
│   │   │   ├── reports/
│   │   │   └── riot-profiles/
│   │   ├── lib/
│   │   ├── .env.example
│   │   ├── next.config.ts
│   │   ├── package.json
│   │   ├── postcss.config.mjs
│   │   ├── tailwind.config.ts
│   │   └── tsconfig.json
│   └── worker/
│       ├── src/worker_service/
│       │   ├── jobs/
│       │   └── cli.py
│       ├── .env.example
│       └── pyproject.toml
├── docs/
│   ├── architecture.md
│   ├── data-schema.md
│   ├── product-spec.md
│   ├── prompting.md
│   └── roadmap.md
├── infra/
│   ├── docker/README.md
│   └── migrations/README.md
├── packages/
│   ├── analytics/
│   │   └── src/analytics_engine/
│   ├── prompts/
│   │   ├── player-report/v1/
│   │   └── riot-match-report/v1/
│   └── shared-types/
│       ├── contracts/README.md
│       └── src/index.ts
├── tickets/
│   ├── T001-foundation.md
│   ├── T002-auth-shell.md
│   ├── T003-riot-profile-ingestion.md
│   ├── T004-match-ingestion.md
│   ├── T005-normalization-clean-schema.md
│   ├── T006-analytics-engine.md
│   ├── T007-report-generation.md
│   ├── T008-dashboard-overview.md
│   ├── T009-dashboard-pillars.md
│   └── T010-chat-contextual.md
├── .gitignore
├── package-lock.json
├── package.json
└── README.md
```

---

# 9. Detailed File-By-File Inventory

## 9.1 Root files
### `README.md`
Root repo introduction. Explains the monorepo, current scope, and basic local setup. **Partially outdated**: it still undersells the existence of the dashboard surface.

### `package.json`
Root npm workspace config. Web scripts are run from here. Workspaces include `apps/web` and `packages/shared-types`.

### `package-lock.json`
NPM lockfile for the root workspaces.

### `.gitignore`
Ignore policy. Developer should verify it excludes local DBs, build artifacts, and temp files appropriately.

---

## 9.2 Docs and tickets
### `docs/architecture.md`
The best high-level architecture reference. Describes boundaries, ownership chain, data flow, and persistence direction.

### `docs/data-schema.md`
Explains the conceptual schema direction, especially raw vs clean vs analytics/report artifacts.

### `docs/product-spec.md`
High-level product intent and current scope description.

### `docs/prompting.md`
Prompting guidance and boundary philosophy. Useful when continuing T007/T010 work.

### `docs/roadmap.md`
Roadmap summary. **Currently stale**: T008/T009 code exists but roadmap still presents them as future work.

### `tickets/T001-foundation.md`
Foundation ticket definition.

### `tickets/T002-auth-shell.md`
Completed auth shell ticket.

### `tickets/T003-riot-profile-ingestion.md`
Completed owned profile ticket.

### `tickets/T004-match-ingestion.md`
Completed raw ingestion ticket.

### `tickets/T005-normalization-clean-schema.md`
Completed normalization ticket.

### `tickets/T006-analytics-engine.md`
Completed deterministic analytics ticket.

### `tickets/T007-report-generation.md`
Completed structured report-generation ticket.

### `tickets/T008-dashboard-overview.md`
Overview ticket. **Implementation exists, ticket status/update should be refreshed.**

### `tickets/T009-dashboard-pillars.md`
Pillar ticket. **Implementation exists in first pass; ticket should be refreshed accordingly.**

### `tickets/T010-chat-contextual.md`
Not implemented yet. Future constrained contextual chat.

---

## 9.3 Backend — app shell and cross-cutting
### `apps/api/pyproject.toml`
API package metadata and dependencies. Includes `fastapi`, `itsdangerous`, `openai`, and `uvicorn`.

### `apps/api/src/api_service/__init__.py`
Package marker for the API service package.

### `apps/api/src/api_service/main.py`
FastAPI entry point. Creates the app, attaches router, and initializes SQLite storage for users, Riot profiles, ingestion, normalization, analytics, and reports at startup.

### `apps/api/src/api_service/core/__init__.py`
Core package marker.

### `apps/api/src/api_service/core/config.py`
Settings loader. Centralizes env config for auth, Riot, OpenAI, app version, and data directory.

---

## 9.4 Backend — route layer
### `apps/api/src/api_service/api/__init__.py`
API package marker.

### `apps/api/src/api_service/api/router.py`
Master router registration file. Includes auth, Riot profiles, ingestion, normalization, analytics, reports, and system routes.

### `apps/api/src/api_service/api/routes/__init__.py`
Routes package marker.

### `apps/api/src/api_service/api/routes/auth.py`
HTTP route handlers for signup, login, and current user retrieval.

### `apps/api/src/api_service/api/routes/riot_profiles.py`
HTTP handlers for owned Riot profile CRUD, verify, and make-primary.

### `apps/api/src/api_service/api/routes/ingestion_runs.py`
HTTP handlers for ingestion run creation/list/detail/raw-match listing.

### `apps/api/src/api_service/api/routes/normalization_runs.py`
HTTP handlers for normalization run creation/list/detail.

### `apps/api/src/api_service/api/routes/analytics_runs.py`
HTTP handlers for analytics run creation/list/detail plus analytics summary fetch.

### `apps/api/src/api_service/api/routes/report_runs.py`
HTTP handlers for report run creation/list/detail plus input preview and final report artifact fetch.

### `apps/api/src/api_service/api/routes/system.py`
Health/version routes.

### `apps/api/src/api_service/api/routes/schemas.py`
Small route-level shared response/request schemas for system endpoints.

---

## 9.5 Backend — auth and users
### `apps/api/src/api_service/users/__init__.py`
Users package marker.

### `apps/api/src/api_service/users/models.py`
User dataclasses / simple storage-facing models.

### `apps/api/src/api_service/users/repository.py`
SQLite repository for user persistence and lookup.

### `apps/api/src/api_service/auth/__init__.py`
Auth package marker.

### `apps/api/src/api_service/auth/security.py`
Password hashing and verification helpers.

### `apps/api/src/api_service/auth/tokens.py`
Signed token creation/verification helpers using `itsdangerous`.

### `apps/api/src/api_service/auth/schemas.py`
Auth request/response schemas.

### `apps/api/src/api_service/auth/service.py`
Auth business logic for signup/login/current user resolution.

### `apps/api/src/api_service/auth/dependencies.py`
FastAPI dependency helpers, especially authenticated user resolution.

---

## 9.6 Backend — Riot profile ownership
### `apps/api/src/api_service/riot_profiles/__init__.py`
Package marker.

### `apps/api/src/api_service/riot_profiles/errors.py`
Domain-specific exceptions for Riot profile workflows.

### `apps/api/src/api_service/riot_profiles/models.py`
Dataclasses for Riot profile persistence and creation/update flows.

### `apps/api/src/api_service/riot_profiles/parsing.py`
Parses Riot ID strings into game name + tagline safely.

### `apps/api/src/api_service/riot_profiles/routing.py`
Central Riot region routing logic. Converts user-facing region into platform/account routing values.

### `apps/api/src/api_service/riot_profiles/client.py`
External Riot API client for account-v1 lookup.

### `apps/api/src/api_service/riot_profiles/repository.py`
SQLite repository for owned Riot profiles. Handles ownership, uniqueness, and primary-profile state.

### `apps/api/src/api_service/riot_profiles/schemas.py`
Request/response schemas for Riot profile routes.

### `apps/api/src/api_service/riot_profiles/service.py`
Business logic for create/list/get/delete/verify/make-primary flows.

---

## 9.7 Backend — ingestion
### `apps/api/src/api_service/ingestion/__init__.py`
Package marker.

### `apps/api/src/api_service/ingestion/errors.py`
Domain exceptions for ingestion.

### `apps/api/src/api_service/ingestion/models.py`
Dataclasses for ingestion runs and raw payload storage.

### `apps/api/src/api_service/ingestion/client.py`
Riot match-v5 client. Fetches match ids, match detail, timeline payloads, with retry behavior for transient/rate-limit issues.

### `apps/api/src/api_service/ingestion/repository.py`
SQLite repository for `ingestion_runs` and raw match/timeline payload tables.

### `apps/api/src/api_service/ingestion/schemas.py`
HTTP schemas for ingestion requests and responses.

### `apps/api/src/api_service/ingestion/service.py`
Business logic that starts ingestion from an owned `riot_profile_id`, enforces queue 420, fetches raw payloads, and finalizes the run.

---

## 9.8 Backend — normalization
### `apps/api/src/api_service/normalization/__init__.py`
Package marker.

### `apps/api/src/api_service/normalization/errors.py`
Domain exceptions for normalization.

### `apps/api/src/api_service/normalization/models.py`
Dataclasses for normalization runs and all clean-record structures (`MatchCleanRecord`, `ParticipantCleanRecord`, `TeamCleanRecord`, `TimelineCleanRecord`, `EventCleanRecord`).

### `apps/api/src/api_service/normalization/repository.py`
SQLite storage for:
- `normalization_runs`
- `matches_clean`
- `participants_clean`
- `teams_clean`
- `timeline_clean`
- `events_clean`
It also owns canonical raw source selection and clean snapshot replacement.

### `apps/api/src/api_service/normalization/schemas.py`
HTTP schemas for normalization run creation/list/detail.

### `apps/api/src/api_service/normalization/service.py`
Orchestrates normalization for an owned profile: counts raw rows, loads canonical raw rows, calls transformers, replaces clean snapshot, finalizes run.

### `apps/api/src/api_service/normalization/transformers.py`
Pure raw-to-clean transformation logic. Recomputes stable metrics like KDA, CS/min, vision/min, DPM, role-opponent context, team objectives, timeline rows, and event rows.

---

## 9.9 Backend — analytics
### `apps/api/src/api_service/analytics/__init__.py`
Package marker.

### `apps/api/src/api_service/analytics/errors.py`
Domain exceptions for analytics.

### `apps/api/src/api_service/analytics/models.py`
Dataclasses for analytics runs and persisted analytics summary records.

### `apps/api/src/api_service/analytics/repository.py`
SQLite repository for:
- `analytics_runs`
- `analytics_summaries`
Also loads the latest clean snapshot into `packages/analytics` input models.

### `apps/api/src/api_service/analytics/schemas.py`
HTTP schemas for analytics run creation/list/detail and analytics summary response.

### `apps/api/src/api_service/analytics/service.py`
Orchestrates analytics runs: loads latest clean snapshot, invokes deterministic analytics package, persists the structured summary.

---

## 9.10 Backend — reports
### `apps/api/src/api_service/reports/__init__.py`
Package marker.

### `apps/api/src/api_service/reports/errors.py`
Domain exceptions for reporting.

### `apps/api/src/api_service/reports/models.py`
Dataclasses for `report_runs` and `report_artifacts`.

### `apps/api/src/api_service/reports/contracts.py`
Pydantic contracts for report input and report output. This is the key schema boundary between deterministic analytics and LLM interpretation.

### `apps/api/src/api_service/reports/input_builder.py`
Transforms persisted analytics summary into a **narrower report-input contract** with:
- overview signals,
- progression signals,
- split signals,
- carry-context signals,
- macro signals,
- early/mid signals,
- data-quality flags,
- priority candidates.

### `apps/api/src/api_service/reports/prompting.py`
Loads versioned prompt assets from `packages/prompts/player-report/v1`.

### `apps/api/src/api_service/reports/client.py`
OpenAI client wrapper. Uses Responses API path and strict JSON schema output expectations. Requires `OPENAI_API_KEY`.

### `apps/api/src/api_service/reports/repository.py`
SQLite repository for:
- `report_runs`
- `report_artifacts`
Stores both `report_input_json` and `report_output_json`.

### `apps/api/src/api_service/reports/schemas.py`
HTTP schemas for report run creation/list/detail, report artifact fetch, and report input preview fetch.

### `apps/api/src/api_service/reports/service.py`
Orchestrates report generation: resolves the analytics run, loads analytics summary, builds report input, loads prompt asset, calls OpenAI client, persists artifact, finalizes run.

---

## 9.11 Frontend — app shell and pages
### `apps/web/package.json`
Frontend package metadata and scripts.

### `apps/web/tsconfig.json`
TypeScript config for the web app.

### `apps/web/tailwind.config.ts`
Tailwind design tokens, extended color/shadow palette for the premium dark dashboard.

### `apps/web/postcss.config.mjs`
PostCSS configuration.

### `apps/web/next.config.ts`
Next config.

### `apps/web/next-env.d.ts`
Next TypeScript env typing.

### `apps/web/.env.example`
Frontend env template. Currently just the API base URL.

### `apps/web/app/layout.tsx`
Global Next layout. Loads fonts (`Manrope`, `Space_Grotesk`) and injects `AuthProvider`. This file is responsible for the current offline build limitation because of `next/font/google`.

### `apps/web/app/globals.css`
Global theme and premium material system for the dashboard. Contains dark layered background, panel material styling, tactical labels, orbit overlays, and shared dashboard utility classes.

### `apps/web/app/page.tsx`
Public landing page. **Currently outdated relative to implemented product scope**.

### `apps/web/app/login/page.tsx`
Login page entry.

### `apps/web/app/signup/page.tsx`
Signup page entry.

### `apps/web/app/app/page.tsx`
Authenticated app route. Renders `ProtectedAppShell`.

---

## 9.12 Frontend — auth
### `apps/web/components/auth/auth-provider.tsx`
Client-side auth/session state. Stores token, resolves current user, exposes login/logout/session context.

### `apps/web/components/auth/auth-form.tsx`
Shared auth form component used for login and signup flows.

### `apps/web/components/auth/protected-app-shell.tsx`
Main authenticated shell. Current responsibilities:
- redirect unauthenticated users to login,
- render the premium left navigation,
- mount the overview desk,
- expose a collapsible operations workbench,
- provide top-level section anchors for overview and live pillars.

---

## 9.13 Frontend — operational managers
These are not the product surface; they are the **operations workbench**.

### `apps/web/components/riot-profiles/riot-profile-manager.tsx`
Create/list/manage owned Riot profiles.

### `apps/web/components/ingestion/ingestion-run-manager.tsx`
Trigger ingestion runs and inspect raw-ingestion outcomes.

### `apps/web/components/normalization/normalization-run-manager.tsx`
Trigger normalization and inspect counts of written clean rows.

### `apps/web/components/analytics/analytics-run-manager.tsx`
Trigger analytics runs, inspect analytics runs, preview persisted analytics summary sections.

### `apps/web/components/reports/report-run-manager.tsx`
Trigger report runs, choose analytics run context, preview stored structured report output.

---

## 9.14 Frontend — dashboard system
### `apps/web/lib/api.ts`
Frontend API client layer. Central fetch wrapper + typed functions for auth, profiles, ingestion, normalization, analytics, and reports.

### `apps/web/lib/dashboard.ts`
Small UI/data formatting utility layer for dashboard rendering.

### `apps/web/components/dashboard/primitives.tsx`
Shared premium dashboard component primitives. Includes section panels, tactical labels, KPI cards, insight lists, pillar tiles, status chips, tables/rails added in T009.

### `apps/web/components/dashboard/overview-dashboard.tsx`
Main premium overview page logic. Loads latest analytics/report artifacts for the selected profile and renders hero, KPI strip, executive summary, strengths/weaknesses/next actions, and pillar entry points.

### `apps/web/components/dashboard/pillar-sections.tsx`
T009 pillar implementation. Renders:
- Champion Form,
- Macro Lens,
- Coaching Board,
from persisted analytics and report artifacts.

---

## 9.15 Worker
### `apps/worker/pyproject.toml`
Worker package metadata.

### `apps/worker/src/worker_service/__init__.py`
Worker package marker.

### `apps/worker/src/worker_service/cli.py`
CLI entry point for worker job execution.

### `apps/worker/src/worker_service/jobs/__init__.py`
Jobs package marker.

### `apps/worker/src/worker_service/jobs/base.py`
Base job shape.

### `apps/worker/src/worker_service/jobs/placeholder.py`
Placeholder worker job. No production workload yet.

### Meaning for future devs
Worker exists as a structural placeholder. It is **not yet part of the real data flow**.

---

## 9.16 Shared packages
### `packages/analytics/pyproject.toml`
Analytics package metadata.

### `packages/analytics/README.md`
Explains the package purpose: deterministic analytics only, no prompt logic.

### `packages/analytics/src/analytics_engine/__init__.py`
Exports analytics package public API.

### `packages/analytics/src/analytics_engine/models.py`
Input snapshot models used by the deterministic analytics engine.

### `packages/analytics/src/analytics_engine/summary.py`
Core deterministic analytics logic. This is one of the most important files in the repo.

### `packages/prompts/README.md`
Explains prompt asset philosophy and versioning intent.

### `packages/prompts/player-report/v1/metadata.yml`
Prompt metadata for the current structured player report prompt.

### `packages/prompts/player-report/v1/system.md`
System prompt for report generation. Instructs the model to interpret only the provided contract, avoid inventing stats, and return strict JSON.

### `packages/prompts/riot-match-report/v1/metadata.yml`
Additional prompt asset namespace. Likely legacy/adjacent prompt path, not the current active report surface.

### `packages/prompts/riot-match-report/v1/system.md`
System prompt in the alternate riot-match-report prompt namespace.

### `packages/shared-types/package.json`
Shared frontend contract package metadata.

### `packages/shared-types/tsconfig.json`
TS config for shared types.

### `packages/shared-types/README.md`
Explains the package’s role.

### `packages/shared-types/contracts/README.md`
Notes on frontend-facing contract intent.

### `packages/shared-types/src/index.ts`
Central exported TypeScript contracts shared by the frontend. Mirrors the backend response shapes for auth, Riot profiles, ingestion runs, normalization runs, analytics summaries, report artifacts, and dashboard-facing payloads.

---

# 10. Current Frontend Product Surface Map

## Public routes
- `/` — public landing page (currently outdated)
- `/login`
- `/signup`

## Authenticated route
- `/app`

## `/app` current structure
### Premium shell
- left sidebar navigation
- identity + product framing
- top nav anchors for overview and live pillars

### Main overview desk
- identity hero for selected profile
- KPI band
- executive summary / scouting read
- form snapshot
- confidence + limits
- support telemetry
- strengths / weaknesses / next block
- pillar tiles

### Live pillars (first pass)
- `#champion-form`
- `#macro-lens`
- `#coaching-board`

### Secondary workbench
- profiles manager
- ingestion manager
- normalization manager
- analytics manager
- report manager

---

# 11. Known Issues And Caveats

## 1. Public landing page is stale
`apps/web/app/page.tsx` still talks like normalization/analytics/dashboard are future work.

## 2. T008/T009 tickets and roadmap are stale
The code is ahead of those docs.

## 3. Offline build limitation from Google Fonts
`apps/web/app/layout.tsx` uses remote Google Fonts via `next/font/google`.
Options:
- keep as-is and require network access in build environments,
- or migrate to local/self-hosted font assets.

## 4. TypeScript workspace resolution requires fresh `npm install`
On a raw extracted copy of the repo, workspace module linking may not be ready until root install is run.

## 5. No serious automated test suite yet
The project currently relies heavily on:
- compile checks,
- typecheck,
- build checks,
- fixture-style service verifications,
not on a full test suite.

## 6. Worker is a scaffold, not a deployed runtime path
Do not assume job queueing exists yet.

## 7. Report/OpenAI integration path is implemented but still environment-dependent
A developer needs a real `OPENAI_API_KEY` to exercise the live report generation flow.

---

# 12. Resume Strategy For The Next Developer

## Immediate first move
Do **not** jump into a new feature immediately.
Do a short stabilization pass first.

### Recommended stabilization tasks
1. create `docs/dev-journal.md`
2. create `docs/changelog.md`
3. update `README.md`, `docs/roadmap.md`, `tickets/T008-dashboard-overview.md`, `tickets/T009-dashboard-pillars.md`
4. decide whether to keep or localize Google Fonts
5. optionally add first smoke/integration tests for auth → profiles → ingestion → normalization → analytics → reports

## After stabilization, choose one path
### Path A — T009 pass 2
Deepen the pillar surfaces:
- richer visual identity per pillar,
- charts instead of table-first presentation in some areas,
- stronger interactions between overview and pillars,
- clearer evidence/narrative fusion.

### Path B — T010 contextual chat
Add constrained chat that:
- reads only approved analytics/report context,
- never bypasses deterministic artifacts,
- complements the dashboard rather than replacing it.

## Important rule for continuation
Do not reopen T001–T007 architecture casually. The current layering is sound enough. Future work should primarily add:
- better docs,
- better tests,
- better presentation,
- controlled additional features.

---

# 13. Recommended “Do Not Break” Checklist

Any new developer should preserve these constraints:
- keep owned Riot profile as the data root,
- keep raw payloads persisted separately,
- keep normalization deterministic,
- keep analytics deterministic and outside prompt logic,
- keep reports as interpretation of analytics, not replacement of analytics,
- keep dashboard surfaces consuming persisted artifacts,
- do not let future chat bypass report/analytics contracts,
- do not overload the overview page with backend logic.

---

# 14. Final Summary For A New Developer

If you are taking over this project, the shortest correct mental model is:

1. **This is not a chatbot project first.** It is a **data pipeline + analytics + coaching interpretation** product.
2. **Backend contracts matter more than UI improvisation.**
3. **The current product state is real up through T009 first pass.**
4. **Your first job is repo discipline and continuity, not reinvention.**
5. **If in doubt, keep the existing architecture and build forward from the current persisted artifacts.**

---

# 15. Suggested Next Prompt For A New Developer

If you hand this repo to a new developer, the first task prompt should be something like:

```text
Read the handoff markdown and inspect the repo. Do a short stabilization pass before adding new features.

Goals:
1. add docs/dev-journal.md
2. add docs/changelog.md
3. update README.md, docs/roadmap.md, tickets/T008-dashboard-overview.md, and tickets/T009-dashboard-pillars.md so they match the implemented state
4. decide whether to keep remote Google Fonts or localize them
5. do not redesign product surfaces in this pass
6. summarize exactly what you changed and what still remains intentionally unresolved
```

That is the cleanest next step before deeper T009 refinement or T010 chat work.

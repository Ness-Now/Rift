# Architecture

## Monorepo Intent

This repository is a polyglot monorepo with explicit boundaries between presentation, API orchestration, worker execution, analytics logic, prompt assets, and infrastructure placeholders.

## Top-Level Responsibilities

- `apps/web`: Next.js frontend shell and authenticated product surfaces
- `apps/api`: FastAPI application for auth, Riot profile ownership, ingestion runs, and future orchestration
- `apps/worker`: Python worker shell for longer-running ingestion and processing jobs
- `packages/analytics`: deterministic analytics code shared across backend services
- `packages/prompts`: versioned prompt assets and prompt metadata
- `packages/shared-types`: shared frontend-facing contracts
- `infra/migrations`: future database migration assets
- `infra/docker`: future local container assets

## Current Ownership Chain

The MVP ownership path is now:
- `users`
- `riot_profiles.user_id`
- `ingestion_runs.riot_profile_id`
- `normalization_runs.riot_profile_id`
- `analytics_runs.riot_profile_id`
- `report_runs.riot_profile_id`

Later domains should continue from this chain rather than bypass it. Match normalization, analytics requests, and reports should all attach to owned Riot profiles and therefore inherit user ownership.

## Riot Routing Design

Riot routing stays centralized in one module. A user-facing region such as `EUW`, `NA`, or `KR` is translated into:
- `platform_region` for platform-routed services
- `account_region_routing` for regional Riot account and match-v5 calls

That mapping is reused across Riot profile resolution and match ingestion. Route handlers do not contain routing rules.

## Current Data Flow

1. Authenticated user selects an owned `riot_profile_id`.
2. API creates an `ingestion_run` in `running` status.
3. API uses Riot match-v5 to fetch recent queue-420 match ids for that profile's `puuid`.
4. API fetches raw match detail payloads and raw timeline payloads for those ids.
5. API validates queue 420 again from each returned match detail before storing it as ranked raw data.
6. API stores raw vendor payloads in raw ingestion tables.
7. API finalizes the ingestion run as `completed` or `failed` with counts and any error message.
8. Authenticated user selects an owned `riot_profile_id` for normalization.
9. API creates a `normalization_run` in `running` status.
10. The normalization service scans persisted completed raw payloads for that profile only.
11. Duplicate `match_id` values are deduplicated during normalization by selecting the most recently ingested raw row using the highest raw payload id.
12. The service writes a fresh clean snapshot for that profile into explicit clean tables and finalizes the normalization run.
13. Authenticated user selects an owned `riot_profile_id` for analytics.
14. API creates an `analytics_run` that always uses the current clean snapshot for that profile.
15. The analytics service loads `matches_clean`, `participants_clean`, and `teams_clean`, then selectively uses `timeline_clean` and `events_clean` for early and mid-game metrics.
16. The deterministic analytics engine persists a structured summary payload for later dashboard and report consumption.
17. Authenticated user selects an owned `riot_profile_id` and optionally a completed `analytics_run_id` for reporting.
18. The report service loads the persisted analytics summary for that run and builds a narrower deterministic report-input contract.
19. The backend loads a versioned prompt asset from `packages/prompts`.
20. The LLM receives only the prompt instructions, report version metadata, and the deterministic report-input contract.
21. The generated structured report artifact is persisted separately from analytics outputs.

## Boundary Rules

- The route layer handles HTTP concerns only.
- The Riot clients own external Riot API calls.
- The ingestion service owns business rules such as ownership checks, queue validation, and run status finalization.
- The normalization service owns canonical raw selection, deterministic field derivation, and clean snapshot replacement.
- The analytics service owns run orchestration and persistence, while the analytics package owns pure deterministic calculations.
- The reports service owns analytics-summary selection, deterministic report-input shaping, prompt loading, and structured report persistence.
- The repositories own SQLite persistence and query shape.
- Raw Riot payloads are stored before any normalization work.
- T005 normalizes from persisted raw payloads only, never from live HTTP responses.
- T006 analytics should depend on clean tables rather than raw vendor JSON.
- T007 should interpret persisted analytics outputs rather than recomputing raw statistics inside prompt flows.
- Prompt/runtime code must not bypass the report-input contract and hand raw analytics summaries straight to the model.
- Prompt assets and analytics remain separate from ingestion runtime logic.

## Persistence Direction

PostgreSQL remains the target system of record. SQLite is still the bootstrap persistence layer behind repositories.

Current persistent areas:
- users
- Riot profiles
- ingestion runs
- raw match payloads including timelines
- normalization runs
- clean match, participant, team, timeline, and event tables
- analytics runs
- persisted analytics summaries
- report runs
- persisted report artifacts containing report-input and report-output payloads

## Queue And Worker Direction

Redis and job queue infrastructure are still deferred. T004 uses synchronous ingestion with bounded retries and respectful backoff against Riot rate limits. If ingestion later moves behind the worker boundary, the run and raw payload model can remain intact.

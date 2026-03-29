# T006 Analytics Engine

## Status

Completed for the MVP deterministic analytics layer.

## Objective

Implement the deterministic analytics layer that converts normalized match data into stable product features.

## Context

Analytics should be reusable across API, worker, and reporting flows without depending on HTTP or prompt concerns. This stage must read only from the latest clean snapshot and persist structured outputs that later report generation can interpret without recomputing raw stats.

## Scope Delivered

- Added an authenticated `analytics_runs` domain
- Added deterministic calculations in `packages/analytics`
- Added persisted analytics summaries with stable top-level sections
- Added API routes to create, list, inspect, and fetch analytics summaries
- Added minimal frontend controls to launch analytics runs and preview persisted summaries

## What Is Now Done

- Analytics reads from clean tables only
- Analytics always uses the latest clean snapshot for an owned Riot profile
- Overview, progression, split, carry/context, macro, early/mid, and data-quality sections are persisted
- `matches_clean`, `participants_clean`, and `teams_clean` are the primary sources
- `timeline_clean` and `events_clean` are used selectively for checkpoint and first-action metrics
- The summary contract is ready for T007 report generation and later dashboard surfaces

## What Remains For Later

- Prompt-based interpretation of analytics outputs in T007
- Final dashboard mapping of analytics sections into pillar-specific UI
- Broader feature tables if dashboard/report needs outgrow the persisted summary payload
- PostgreSQL migration and formal migration tooling

## Intentionally Deferred

- Any prose or AI commentary generation
- Full dashboard redesign
- Fake rating or MMR logic
- Heavy temporal analytics beyond the initial checkpoint and first-action metrics

## Non-Goals

- Prompt engineering
- Frontend rendering
- Raw data ingestion logic
- Non-deterministic scoring or opaque heuristics

## Definition Of Done

- Deterministic analytics code exists outside the API layer
- Inputs and outputs are explicit and testable
- Analytics are reproducible from normalized data
- Report generation work has a stable feature contract to consume

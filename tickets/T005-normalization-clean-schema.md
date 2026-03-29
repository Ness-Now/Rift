# T005 Normalization Clean Schema

## Status

Completed for the MVP clean normalization layer.

## Objective

Transform raw Riot payloads into a clean, queryable internal schema that supports analytics and reporting.

## Context

The product depends on a durable separation between source payloads and normalized product facts. Normalization must read from persisted raw ingestion data only, deduplicate duplicate raw matches deterministically, and write stable clean tables that T006 analytics can trust.

## Scope Delivered

- Added an authenticated `normalization_runs` domain
- Added clean persisted tables for `matches_clean`, `participants_clean`, and `teams_clean`
- Added `timeline_clean` and `events_clean` while keeping the schema explicit and bounded
- Added deterministic normalization from persisted raw payloads only
- Added normalization-time deduplication by `match_id` using the most recently ingested raw row
- Added minimal frontend controls to launch and inspect normalization runs

## What Is Now Done

- Normalization starts from an explicit owned `riot_profile_id`
- Completed ingestion payloads are scanned through the existing ownership chain
- Duplicate raw rows are deduplicated by `match_id`
- Canonical raw source selection uses the highest raw payload id as the most recent row
- Clean rows keep source lineage through `raw_source_run_id` and `raw_source_payload_id`
- Derived metrics such as KDA, CS per minute, vision per minute, and damage per minute are recalculated
- T006 can now depend on clean tables rather than raw vendor JSON

## What Remains For Later

- Deterministic feature engineering beyond the first clean table cut in T006
- Higher-level aggregates and windowed analytics
- OpenAI report generation and prompt orchestration
- Final dashboard pillar presentation

## Intentionally Deferred

- Final analytics engine logic
- AI commentary generation
- Broader schema expansion for every possible Riot field
- PostgreSQL migration and formal migration tooling
- Background normalization workers or queued execution

## Non-Goals

- Advanced analytics feature computation
- AI commentary generation
- Dashboard implementation
- Support for every possible Riot field

## Definition Of Done

- A first normalized schema exists and is documented
- Data lineage from raw payloads to normalized tables is clear
- The schema is suitable for deterministic analytics work
- Duplicate raw matches are normalized deterministically
- Migration tooling is introduced only as needed for the approved design

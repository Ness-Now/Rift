# T004 Match Ingestion

## Status

Completed for the MVP raw ingestion shell.

## Objective

Fetch ranked Solo/Duo match data from Riot and store the raw payloads needed for downstream normalization.

## Context

Once Riot account identity is resolved, the system must collect the relevant ranked match set without yet mixing in analytics logic.

## Scope Delivered

- Added an authenticated `ingestion_runs` domain
- Added Riot match-v5 lookup for recent match ids, match detail, and timeline payloads
- Added synchronous bounded retry behavior for Riot rate limits and transient failures
- Persisted ingestion runs separately from raw payload storage
- Persisted raw match detail and raw timeline payloads before normalization
- Added minimal frontend controls to trigger and inspect ingestion runs

## What Is Now Done

- Match ingestion starts from an explicit owned `riot_profile_id`
- The ingestion window uses recent `max_matches` with default `50` and max `200`
- Queue filter is locked to ranked Solo/Duo queue `420`
- Queue `420` is validated again from returned match detail before storage counts as ranked ingestion
- Ingestion runs are owned through `users -> riot_profiles -> ingestion_runs`
- Raw persisted match data is available for T005 normalization

## What Remains For Later

- Clean normalized match tables in T005
- Participant and stats normalization in T005
- Deterministic analytics and reporting in later tickets
- Background worker execution if synchronous ingestion becomes too limiting

## Intentionally Deferred

- Final clean schema transformation
- Analytics calculations
- OpenAI report generation
- Chat
- Distributed retry or queue infrastructure

## Non-Goals

- Clean schema transformation
- Deterministic analytics calculations
- Dashboard rendering
- OpenAI calls

## Definition Of Done

- Ranked Solo/Duo match ingestion works for the defined input flow
- Raw vendor data is stored separately from product-facing structures
- Ingestion runs can be traced and retried safely
- Normalization work has the required raw source inputs available

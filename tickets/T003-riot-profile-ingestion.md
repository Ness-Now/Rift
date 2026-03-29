# T003 Riot Profile Ingestion

## Status

Completed for the MVP Riot profile ownership shell.

## Objective

Implement backend retrieval of Riot account identity so authenticated users can own Riot profiles before match ingestion begins.

## Context

The product begins with a Riot ID, but the system now needs a real user-owned Riot profile layer rather than anonymous lookup.

## Scope Delivered

- Added an authenticated `riot_profiles` domain
- Added Riot ID parsing plus centralized Riot routing resolution
- Added Riot `account-v1` lookup for Riot ID to PUUID resolution
- Added owned profile create, list, read, delete, verify, and make-primary routes
- Added frontend UI for managing owned Riot profiles
- Documented the ownership chain from `users` to `riot_profiles`

## What Is Now Done

- Authenticated users can add multiple Riot profiles
- Riot profiles are globally unique by `puuid`
- A `puuid` cannot belong to multiple users
- The first owned profile becomes primary automatically
- Deleting a primary profile promotes the next available owned profile when one exists
- Riot profile verification can re-check Riot ID to PUUID consistency

## What Remains For Later

- Match id ingestion for owned Riot profiles in T004
- Raw vendor payload persistence for match endpoints
- Analysis job creation anchored to Riot profiles
- Report generation anchored to Riot profiles

## Intentionally Deferred

- Match ingestion
- Timeline ingestion
- Background workers for Riot profile creation
- Broader Riot API coverage beyond account lookup

## Non-Goals

- Match ingestion
- Analytics calculations
- AI commentary generation
- Broad Riot API coverage beyond required profile endpoints

## Definition Of Done

- Backend can resolve a Riot ID into the identifiers needed for downstream ingestion
- Riot profiles are owned by authenticated users
- Conflict and ownership rules are enforced cleanly
- The profile ingestion surface is ready for match ingestion work

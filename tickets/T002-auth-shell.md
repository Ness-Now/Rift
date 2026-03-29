# T002 Auth Shell

## Status

Completed for the MVP auth shell.

## Objective

Add the initial authentication shell so future user-specific dashboards and reports have a secure application boundary.

## Context

The product needs a user ownership root before Riot-linked data, analysis jobs, and reports are introduced.

## Scope Delivered

- Added backend user creation and login routes
- Added backend current-user route for authenticated identity resolution
- Added a small user domain, auth service layer, token handling, and SQLite-backed persistence
- Added minimal frontend signup, login, and authenticated placeholder screens
- Added ownership notes in the docs for future Riot profiles, jobs, and reports

## What Is Now Done

- Email/password signup works through the backend
- Email/password login works through the backend
- Authenticated requests can resolve the current user via `/auth/me`
- The frontend has a minimal auth shell and protected placeholder app area
- Future user-owned domains now have a documented ownership root

## What Remains For Later

- Replace the SQLite bootstrap with PostgreSQL-backed persistence
- Add real session hardening, rotation, and production secret management
- Introduce Riot profile ownership flows in T003
- Introduce analysis job and report ownership in later tickets

## Intentionally Deferred

- Social auth
- Magic links
- Password reset
- Full RBAC or role systems
- Riot account linking details beyond basic ownership preparation

## Non-Goals

- Billing or subscription logic
- Deep authorization policies for every future feature
- Riot account linking flows beyond what is needed for the auth shell

## Definition Of Done

- Authentication approach is documented and scaffolded
- Web and API have a consistent auth boundary
- Unauthenticated and authenticated application shells are distinguishable
- Follow-on ingestion work has a clear ownership entry point
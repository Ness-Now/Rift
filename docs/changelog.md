# Changelog

## Unreleased

### Added
- Monorepo foundation for web, API, worker, shared packages, docs, infra placeholders, and ticket roadmap.
- MVP auth shell with user ownership groundwork.
- Owned Riot profile domain with Riot ID to PUUID resolution and primary-profile behavior.
- Raw ranked Solo/Duo ingestion runs with persisted match and timeline payloads.
- Clean normalization runs with stable clean tables derived from persisted raw Riot data.
- Deterministic analytics runs and persisted analytics summaries.
- Structured report generation runs with versioned prompts and persisted report artifacts.
- Premium overview dashboard and first live T009 pillar surfaces.
- Persistent developer journal and repository changelog.

### Changed
- The web app evolved from a functional shell into a premium dark product surface with an overview desk plus live Champion Form, Macro Lens, and Coaching Board sections.
- Operational controls were moved behind a secondary workbench so the product-facing experience leads.
- Repository-facing documentation now reflects the implemented T001-T009 state instead of the earlier roadmap-only state.

### Fixed
- README, roadmap, and dashboard ticket files now match the actual implementation state.
- The current continuation point is documented chronologically for future contributors.

### Known issues
- `apps/web/app/layout.tsx` uses `next/font/google` (`Manrope` and `Space_Grotesk`), so `npm run build:web` may fail in offline or network-restricted environments.
- SQLite remains the lightweight persistence layer for the current development phase; production-grade PostgreSQL, migrations discipline, and queue infra are still deferred.
- T009 is live but still in its first pass; deeper charting, tighter pillar interactions, and final polish remain.
- T010 contextual chat has not started.

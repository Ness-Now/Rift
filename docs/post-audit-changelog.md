# Post-Audit Changelog

Tracks changes made after the baseline described in [Rift_Project_Handoff_Audit_290326-1333.md](/d:/Users/nessi/Documents/Projets/Rift/docs/Rift_Project_Handoff_Audit_290326-1333.md).

## 2026-03-29 - Stabilization Pass

- Added repository continuity files:
  - `docs/dev-journal.md`
  - `docs/changelog.md`
- Updated `README.md`, `docs/roadmap.md`, `tickets/T008-dashboard-overview.md`, and `tickets/T009-dashboard-pillars.md` so they match the implemented T001-T009 state.
- Documented the current `next/font/google` offline/restricted-build limitation in repo-facing docs.

## 2026-03-29 - T009 Second Refinement Pass

- Refined the live T009 pillar surfaces without changing backend contracts.
- Added reusable dashboard primitives:
  - `SignalSpotlight`
  - `RankedSignalList`
  - `OrderedBoard`
- Reworked Champion Form, Macro Lens, and Coaching Board toward clearer scan order and stronger product presentation.

## 2026-03-29 - T009 Champion Form Comparison Pass

- Narrowed the pass to Champion Form only.
- Added a comparison deck that contrasts:
  - main champion
  - overall profile baseline
  - latest recent-form window
- Added a dedicated main-pick edge read so champion performance versus overall baseline is clearer at a glance.
- Left Macro Lens, Coaching Board, backend contracts, and overview composition unchanged.

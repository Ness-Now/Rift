# Post-Audit Changelog

Tracks changes made after the baseline described in [Rift_Project_Handoff_Audit_290326-1333.md](./Rift_Project_Handoff_Audit_290326-1333.md).

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

## 2026-03-29 - T009 Macro Lens Command Table Pass

- Narrowed the pass to Macro Lens only.
- Reworked the top of Macro Lens into a stronger win-vs-loss objective board with a clearer primary macro contrast.
- Added a command-table layer that ties the strongest objective swing to duration and session reinforcement before the supporting split lists.
- Kept overview, shell, backend contracts, Champion Form, and Coaching Board stable.

## 2026-03-29 - T009 Coaching Board Execution Pass

- Narrowed the pass to Coaching Board only.
- Reworked the pillar so the lead directive, immediate next move, and top execution order read more clearly at a glance.
- Separated interpretation overlay from evidence-and-limits framing so coaching directives and guardrails feel less like a stacked report dump.
- Extended the shared ordered-board primitive to emphasize the first item without reopening overview, shell, backend contracts, Champion Form, or Macro Lens.

## 2026-03-29 - T009 Cross-Pillar Coherence Pass

- Narrowed the pass to page-level coherence between overview and the three live pillars.
- Added a clearer station-map route in the overview and a matching deep-dive route above the live pillar surfaces.
- Standardized station/status language across Champion Form, Macro Lens, and Coaching Board so the page reads more like one connected analysis desk.
- Kept backend contracts, analytics/report schemas, API routes, shell structure, and isolated pillar deep-redesign work unchanged.

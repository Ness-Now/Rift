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

## 2026-03-29 - T009 Workflow Readiness Pass

- Narrowed the pass to coaching-workflow clarity across the current live dashboard.
- Added a clearer evidence -> interpretation -> execution reading path across the overview and the deep pillar area.
- Updated labels and grouping so the live surface reads more like coaching delivery and less like a polished report stack.
- Kept backend contracts, analytics/report schemas, API routes, shell structure, and isolated deep pillar redesign work unchanged.

## 2026-03-29 - T009 Simplification And Signal-Density Pass

- Narrowed the pass to simplification rather than another new polish layer.
- Removed overlapping route/guidance surfaces so the dashboard keeps the coaching flow with less repetition.
- Reduced repeated station/live labeling and kept only the cues that materially help navigation and comprehension.
- Kept backend contracts, analytics/report schemas, API routes, shell structure, and isolated deep pillar redesign work unchanged.

## 2026-03-29 - T009 First-User Orchestration Pass

- Narrowed the pass to the current self-use workflow rather than adding a new subsystem.
- Added one overview-level orchestration surface that lets the user choose a Riot profile, run ingestion -> normalization -> analytics -> report in sequence, and see the latest stage state in one place.
- Kept the secondary operational workbench available as a fallback instead of making the user operate five separate panels by default.
- Kept backend contracts, analytics/report schemas, API routes, and the broader shell architecture unchanged.

## 2026-03-29 - T009 Orchestration Readiness And Robustness Pass

- Narrowed the pass to orchestration trust rather than another broad product-surface redesign.
- Added a minimal backend readiness signal so the dashboard can tell whether the current self-use environment has Riot/OpenAI server-side configuration available.
- Strengthened the Run Full Analysis surface with explicit readiness, latest blocking issue, coaching freshness, and stage-specific failure messaging.
- Kept the broader architecture, analytics/report contracts, shell structure, and T010 scope unchanged.

## 2026-03-30 - T009 Artifact Truth And Displayed-Result Integrity Pass

- Narrowed the pass to artifact-truth semantics rather than adding another new product layer.
- Changed the overview and pillar handoff so the displayed analytics summary follows the analytics run that actually backs the displayed report artifact whenever a report exists.
- Tightened orchestration wording and truth-state labels so the UI says "displayed" and "coherent" where that is what the code can actually justify.
- Kept backend scope unchanged for this pass and derived the stricter truth states from existing persisted runs and artifacts.

## 2026-03-30 - T009 Stabilization And Final-Readiness Pass

- Narrowed the pass to one remaining stabilization issue rather than adding further polish.
- Clarified the distinction between displayed interpretation integrity and end-to-end pipeline freshness so the live dashboard no longer blurs those two truth layers.
- Left the broader product surface stable and treated T009 as close to freeze rather than reopening more refinement scope.

## 2026-03-30 - T010 First Grounded Contextual Chat Pass

- Started T010 with one narrow grounded chat seam instead of a broader assistant system.
- Added an authenticated contextual chat reply route that answers only from the selected Riot profile and the displayed persisted report artifact, including the report input contract plus report output.
- Added versioned `contextual-chat/v1` prompt assets and a dashboard chat panel with explicit grounding context, stale/missing-artifact warnings, and ephemeral local history only.
- Reset local chat history whenever the selected profile or displayed report artifact changes so the surface does not silently mix contexts.

## 2026-03-30 - T010 Audit And Hardening Pass

- Audited the current T010 chat implementation across the route, service, prompt asset, shared contracts, frontend panel, and overview integration before making changes.
- Tightened the contextual chat reply contract so every answer now carries an explicit support status (`grounded` or `limited`) plus a scope/bounds note.
- Updated the prompt, backend deterministic limit handling, and frontend rendering so contextual chat truthfulness no longer depends on implied grounding alone.

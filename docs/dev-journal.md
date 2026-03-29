# Development Journal

## 2026-03-29 - T009 Cross-Pillar Coherence Pass

### What was completed
- Refined T009 at the page-coherence level rather than inside a single pillar.
- Added a clearer overview-to-pillar station route and a matching deep-dive route above the live pillar surfaces.
- Standardized pillar header status language so Champion Form, Macro Lens, and Coaching Board read as one connected product surface.

### Decisions made
- Keep the pass strictly on overview-to-pillar continuity, cross-pillar hierarchy, and shared navigation language.
- Reuse shared navigation and status patterns instead of reopening any one pillar deeply.
- Leave backend contracts, shell structure, and underlying analytics/report architecture unchanged.

### Issues found
- The three pillars had become stronger individually, but the transition from overview into the live deep-dive surfaces still felt too loose.
- Badge language and section framing were not yet consistent enough to read like one premium analysis route.

### Next step
- Continue T009 only if another narrow product-surface pass is needed after reviewing the coherence improvements across the full page.

## 2026-03-29 - T009 Coaching Board Execution Pass

### What was completed
- Refined only the Coaching Board pillar in T009.
- Reworked the execution surface so the lead directive, immediate next move, priority order, and next-action order are easier to scan.
- Separated interpretation overlay from evidence-and-limits framing so coaching directives and guardrails no longer read like one blended stack.

### Decisions made
- Keep the pass narrow to Coaching Board only.
- Extend the shared ordered-board primitive to emphasize the first item instead of inventing a Coaching Board-only layout pattern.
- Keep Champion Form, Macro Lens, overview, shell, and backend contracts stable.

### Issues found
- Coaching Board still felt too much like evenly weighted stacked report cards.
- The single highest-priority lever and the first real next action were present, but not visually decisive enough.

### Next step
- Continue T009 only with another narrow presentation pass if a remaining pillar-specific weakness is identified after review.

## 2026-03-29 - T009 Macro Lens Command Table Pass

### What was completed
- Refined only the Macro Lens pillar in T009.
- Reworked the top of Macro Lens into a clearer win-vs-loss objective board with a stronger primary contrast read.
- Added a command-table layer that ties deterministic macro contrast to duration and session reinforcement before the supporting lists.

### Decisions made
- Keep the pass narrow to Macro Lens only.
- Reuse the existing dashboard primitive system instead of reopening overview or shell structure.
- Keep duration and session lists as secondary support rather than the lead read.

### Issues found
- Macro Lens still read too much like a supporting section, even after the earlier T009 refinement.
- The strongest macro contrast was present in the data but not yet obvious enough at a glance.

### Next step
- Continue T009 in another narrow pass only after this Macro Lens command-table surface is stable and reviewed.

## 2026-03-29 - T009 Champion Form Comparison Pass

### What was completed
- Refined only the Champion Form pillar in T009.
- Added a stronger main-pick comparison surface so the pillar now contrasts the main champion, overall baseline, and latest recent-form window directly.
- Added a dedicated main-pick edge read to make the champion-vs-profile performance gap easier to scan.

### Decisions made
- Keep the pass narrow to Champion Form only.
- Reuse a shared comparison primitive instead of adding more one-off Champion Form markup.
- Leave Macro Lens, Coaching Board, backend contracts, and overview composition unchanged.

### Issues found
- Champion Form still had one of the more table-like supporting reads despite the prior refinement pass.

### Next step
- Continue T009 in another narrow pass, likely on either Macro Lens primary comparison storytelling or Coaching Board execution polish.

## 2026-03-29 - T009 Second Refinement Pass

### What was completed
- Refined the live T009 pillar surfaces without changing backend contracts or reopening T008 overview scope.
- Reworked Champion Form to emphasize main-pick identity, recent form windows, progression, and lane/checkpoint reads before secondary tabular support.
- Reworked Macro Lens to foreground win/loss objective shape and macro interpretation ahead of supporting split details.
- Reworked Coaching Board to feel more like an execution board with a lead directive, ordered priorities, focus blocks, next actions, and clearer guardrails.

### Decisions made
- Keep overview stable and use T009 to deepen pillar-specific product presentation.
- Prefer reusable shared visual blocks over one-off markup inside each pillar.
- Keep tables as supporting tools only where they still add value.

### Issues found
- The first T009 pass still leaned too heavily on table/card repetition and did not always make primary signals obvious enough at a glance.

### Next step
- Continue T009 polish with richer chart language, tighter motion/interaction polish, and cleaner pillar-specific visual identity where it materially improves comprehension.

## 2026-03-29 - Stabilization Baseline After T009 First Pass

### What was completed
- T001 through T007 backend and product foundations are in place: auth, Riot profile ownership, raw ingestion, normalization, analytics, and structured report generation.
- T008 shipped the first premium product-facing dashboard overview in the web app.
- T009 began with live pillar surfaces for Champion Form, Macro Lens, and Coaching Board, all consuming persisted analytics and report artifacts.
- A secondary operational workbench remains available for profile, ingestion, normalization, analytics, and report controls.

### Decisions made
- Overview remains the briefing layer for identity, top KPIs, and executive summary.
- Pillars are the deeper product surfaces:
  - Champion Form for champion pool, progression, and lane/checkpoint context.
  - Macro Lens for objective conversion and team-context reads.
  - Coaching Board for prioritized report interpretation and execution steps.
- Backend contracts remain unchanged for presentation work; UI consumes persisted analytics/report structures directly.

### Issues found
- Repo-facing documentation drifted behind implementation after T008 and the first T009 pass.
- Ticket files for T008 and T009 were still future-tense instead of reflecting delivered work plus remaining refinement.
- The web build still depends on remote Google Fonts via `next/font/google`, which is a known limitation for offline or restricted CI environments.

### Next step
- Continue T009 refinement in the pillar surfaces: stronger chart treatment, tighter evidence-to-narrative coupling, and deeper interaction polish without reopening backend contracts.

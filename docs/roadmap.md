# Roadmap

## Delivery Sequence

### Phase 1: Foundation And Ownership

- T001 foundation completed
- T002 auth shell completed as MVP ownership groundwork

### Phase 2: Data Acquisition

- T003 Riot profile ingestion completed
- T004 match ingestion completed
- T005 normalization and clean schema completed

### Phase 3: Product Intelligence

- T006 analytics engine completed
- T007 report generation completed

### Phase 4: Product Surfaces

- T008 dashboard overview completed
- T009 dashboard pillars frozen at the current product-logic level after the first live pass
- T010 contextual chat MVP frozen as a narrow grounded product seam after narrow hardening passes

## Current Product Surface State

- Overview Desk is the premium briefing layer for identity, top KPIs, executive summary, and cross-pillar orientation.
- Champion Form is live as the frozen first deeper pillar surface for champion pool, progression, lane/checkpoint context, and time-based patterning.
- Macro Lens is live as the frozen first deeper pillar surface for objective conversion, game-shape reads, and team-context metrics.
- Coaching Board is live as the frozen first deeper pillar surface for priority levers, coaching focus, risk flags, confidence, and execution steps.
- Contextual Chat is live as the frozen narrow grounded interrogation surface tied to the selected profile plus the displayed persisted report artifact, with ephemeral local history only.
- Operational data controls remain available in a secondary workbench rather than leading the product UI.

## Near-Term Priorities

1. Keep repo-facing documentation and continuation notes aligned with the current frozen T009 and T010 state so future work resumes from truthful source-of-truth docs.
2. Continue narrow repository hardening where concrete build or verification risks remain, without reopening product semantics.
3. Focus future product work on other concrete risks or later deliberate reopens rather than routine T009 or T010 refinement by default.
4. Keep ingestion, normalization, analytics, report, and presentation boundaries explicit unless a later deliberate reopen requires a justified change.

## Risks To Manage Early

- Reopening T009 dashboard refinement by default instead of waiting for a concrete defect or a later deliberate product revisit
- Letting dashboard changes drift into backend contract churn without a product need
- Letting raw Riot shapes leak into UI or report presentation logic
- Letting analytics depend directly on raw Riot payloads instead of clean normalized tables
- Letting prompt/report code bypass the persisted analytics summary contract
- Mixing deterministic calculations with prompt behavior or presentation logic
- Reopening or expanding T010 beyond its current grounded ephemeral scope without a concrete defect or a later deliberate product revisit

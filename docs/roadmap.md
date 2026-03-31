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
- T009 dashboard pillars first live pass completed
- T010 contextual chat not started

## Current Product Surface State

- Overview Desk is the premium briefing layer for identity, top KPIs, executive summary, and cross-pillar orientation.
- Champion Form is live as the first deeper pillar surface for champion pool, progression, lane/checkpoint context, and time-based patterning.
- Macro Lens is live as the first deeper pillar surface for objective conversion, game-shape reads, and team-context metrics.
- Coaching Board is live as the first deeper pillar surface for priority levers, coaching focus, risk flags, confidence, and execution steps.
- Operational data controls remain available in a secondary workbench rather than leading the product UI.

## Near-Term Priorities

1. Stabilize repo-facing documentation and continuation notes so the current state is trustworthy and easy to resume from.
2. Continue T009 refinement with stronger chart treatment, tighter evidence-to-narrative coupling, and deeper interaction polish inside each pillar.
3. Continue narrow repository hardening so offline/restricted build expectations stay satisfied without reopening product semantics.
4. Keep ingestion, normalization, analytics, report, and presentation boundaries explicit while T009 deepens.

## Risks To Manage Early

- Letting dashboard refinement drift into backend contract churn without a product need
- Letting raw Riot shapes leak into UI or report presentation logic
- Letting analytics depend directly on raw Riot payloads instead of clean normalized tables
- Letting prompt/report code bypass the persisted analytics summary contract
- Mixing deterministic calculations with prompt behavior or presentation logic
- Expanding into T010 before T009 surfaces are stable enough to anchor chat context

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
- First T010 grounded contextual chat pass with one authenticated reply endpoint, versioned prompt assets, and a dashboard chat panel tied to the selected profile plus displayed report artifact.

### Changed
- The web app evolved from a functional shell into a premium dark product surface with an overview desk plus live Champion Form, Macro Lens, and Coaching Board sections.
- Operational controls were moved behind a secondary workbench so the product-facing experience leads.
- The web app now uses local/system fallback font stacks behind the existing `--font-sans` and `--font-display` variables instead of `next/font/google`.
- T010 gained an actionability-structure pass that adds one explicit next-step field to contextual chat replies so bounded coaching answers are easier to act on immediately.
- T010 gained a comparative-answer guardrail pass that downgrades dominant-winner and interpretive tradeoff answers more conservatively, so priority-like coaching reads do not silently become proven strongest causes.
- T010 gained a multi-turn continuity pass that feeds a compact recap of prior assistant trust metadata back through ephemeral chat history so short follow-up questions stay bounded to the earlier answer’s basis and limits.
- T010 gained a limited-answer separation pass that makes bounded chat replies distinguish more clearly between what the displayed artifact supports and what it cannot conclude.
- T010 gained an evidence-layer separation pass that makes each contextual chat reply declare whether it relies mainly on deterministic artifact evidence, interpreted report output, or a mix of both.
- T010 gained an answer-traceability pass that adds compact artifact-area trace labels to each contextual chat reply and renders them lightly in the chat UI.
- T010 gained an audit-and-hardening pass that requires each contextual chat reply to declare whether it is fully grounded or limited, plus an explicit scope/bounds note.
- T010 gained an evaluation-and-hardening pass that adds a deterministic artifact digest/source map to contextual chat grounding so common coaching questions can be answered more specifically from persisted artifacts.
- T009 gained a first-user orchestration pass that adds one overview-level "Run Full Analysis" surface on top of the existing run domains, making the self-use flow feel closer to one coaching action instead of five separate admin panels.
- T009 gained an orchestration readiness and robustness pass that adds explicit environment-readiness, stage-failure, coaching-freshness, and coaching-handoff states to the Run Full Analysis surface.
- T009 gained an artifact-truth pass that makes the overview and pillar handoff follow one displayed analytics/report chain more strictly and replaces overly optimistic freshness/current labels with more conservative artifact-truth language.
- T009 gained a stabilization/readiness pass that separates displayed interpretation integrity from end-to-end pipeline freshness more clearly, reducing one remaining semantic mismatch in the live dashboard.
- The authenticated product shell now exposes a first grounded contextual chat surface and updates its top-level framing from T009-only language to T010 contextual grounding.
- Repository-facing documentation now reflects the implemented T001-T010 state instead of the earlier roadmap-only state.
- T009 second-pass refinement reduced the table-first feel in the pillar surfaces and improved scan order, signal emphasis, and coaching-board decisiveness.
- T009 Champion Form gained a narrower comparison pass that makes the main pick, overall baseline, and latest recent-form window easier to compare at a glance.
- T009 Macro Lens gained a narrower command-table pass that makes the win/loss macro contrast, strongest objective swing, and duration/session reinforcement easier to read before supporting splits.
- T009 Coaching Board gained a narrower execution pass that makes the lead priority, immediate next move, ordered priorities, and evidence-versus-guardrail separation clearer.
- T009 gained a narrow cross-pillar coherence pass that strengthens overview-to-pillar continuity, station-map navigation, and shared hierarchy language across the three live pillars.
- T009 gained a workflow-readiness pass that makes evidence, interpretation, and execution guidance more explicit across the current live dashboard.
- T009 gained a simplification pass that removes redundant route/guidance layers and improves signal density without changing the coaching logic.

### Fixed
- README, roadmap, and dashboard ticket files now match the actual implementation state.
- The current continuation point is documented chronologically for future contributors.
- The web build no longer depends on outbound Google Fonts access at build time.
- Contextual chat replies now expose one explicit next coaching move instead of leaving the immediate action buried inside answer prose.
- Comparative T010 answers now preserve a clearer boundary between artifact-supported priority/contrast and a proven dominant winner.
- Short follow-up chat turns now preserve prior answer bounds, evidence basis, and artifact areas more reliably instead of relying on plain assistant prose alone.
- Partially answerable contextual chat questions now get clearer support-versus-boundary separation instead of leaving that split to prompt quality alone.
- Contextual chat replies now separate deterministic-versus-interpretive answer basis more explicitly instead of leaving that distinction implicit behind trace labels alone.
- Contextual chat replies now expose explicit support-status semantics instead of implying that every answer is equally well-supported by the displayed artifact.
- Contextual chat now sends a tighter deterministic source digest to the model, reducing the risk of generic answers when the persisted artifact already contains enough evidence to answer concretely.
- Contextual chat replies now expose which artifact areas they relied on, making grounded answers more auditable without adding a heavy citation system.
- README, roadmap, and the T010 ticket no longer describe the current grounded contextual chat MVP as deferred or not started.

### Known issues
- SQLite remains the lightweight persistence layer for the current development phase; production-grade PostgreSQL, migrations discipline, and queue infra are still deferred.
- T009 is live but still in its first pass; deeper charting, tighter pillar interactions, and final polish remain.
- T010 has started with a narrow ephemeral contextual chat surface only; persisted chat history, richer interaction design, and any broader thread architecture are still intentionally deferred.

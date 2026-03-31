# Development Journal

## 2026-03-31 - Web Build Font-Dependency Hardening Pass

### What was completed
- Inspected the web app shell, global styling, Tailwind config, repo continuity docs, and local asset locations before making changes.
- Confirmed there were no committed project font assets available to reuse outside dependency folders or `.next` artifacts.
- Removed the app shell dependency on `next/font/google` and kept the existing `--font-sans` / `--font-display` structure by defining disciplined local/system fallback stacks in CSS instead.
- Updated repo-facing docs so they no longer describe remote Google Fonts as a known unresolved build limitation.

### Decisions made
- Keep the pass narrow and build-focused: no dashboard, chat, contract, or architecture changes.
- Prefer a local/system fallback over introducing new font assets, because no committed source font files were present and the smallest robust fix was to eliminate outbound fetching entirely.
- Preserve the current typography intent as closely as practical by keeping `Manrope` and `Space Grotesk` at the front of the stacks for environments where they are already installed locally.

### Issues found
- The app shell was loading `Manrope` and `Space_Grotesk` through `next/font/google`, which creates a build-time dependency on outbound Google Fonts access.
- In this checkout, `npm run build:web` was also initially blocked by a non-executable `node_modules/.bin/next` shim, which had to be worked around during verification before the repo-level font hardening could be validated.

### Next step
- Resume repository hardening and stabilization without reopening T009/T010 product semantics unless a later build or verification pass requires it.


## 2026-03-30 - T010 Actionability-Structure Pass

### What was completed
- Inspected the current T010 reply contract, service shaping, prompt asset, chat panel rendering, shared types, and continuity docs before making changes.
- Identified that the strongest remaining weakness was not grounding but reply actionability: answers could still be honest and bounded while leaving the immediate next coaching move buried inside prose or implied only through follow-up text.
- Added one compact `action_step` field to the reply shape and rendered it as a lightweight `Do next` block in the chat UI.

### Decisions made
- Keep the pass narrow and reply-structure focused instead of adding any new T010 capability or surface.
- Add one explicit action field rather than overloading `answer` or misusing `suggested_follow_up`, so the user can see the next coaching move without losing the existing trust signals.
- Preserve all existing trust safeguards: `answer_mode`, `evidence_mode`, `scope_note`, `trace_labels`, stale/current handling, limited-answer safeguards, and comparative guardrails.

### Issues found
- The current contract exposed answer, evidence, limits, and follow-up, but it did not expose a first-class �do this next� slot.
- That made bounded answers readable but still more diffuse than necessary for immediate coaching use, especially when the reply was otherwise short and honest.

### Next step
- Reassess whether the current T010 MVP now has enough reply-level action structure to shift the next narrow pass away from format hardening and toward only clearly observed interaction issues.

## 2026-03-30 - T010 Comparative-Answer Guardrail Pass

### What was completed
- Inspected the current T010 service shaping, prompt instructions, and chat UI after the multi-turn continuity pass, with emphasis on comparative, ranking, and tradeoff questions.
- Built a compact evaluation set around asks like “macro or laning?”, “fundamentals or champion pool?”, “main reason I lose?”, and “is X clearly worse than Y?” to isolate the remaining comparative overclaiming risk.
- Added a narrow backend guardrail so comparative answers now downgrade conservatively when the question asks for a dominant winner or when the reply relies on interpretive/mixed evidence instead of deterministic comparison support.

### Decisions made
- Keep the pass narrow and semantic rather than adding any new T010 capability or UI surface.
- Prefer deterministic service hardening over prompt-only hope for comparison-heavy questions.
- Preserve the current reply contract and trust stack; this pass only tightens when comparative answers must be limited.

### Issues found
- The strongest remaining weakness was that the chat could still let a priority or interpretive emphasis read like a proven dominant cause on binary comparison questions.
- That was especially risky for questions that ask for the “main reason,” “more important,” or a clean winner between two candidate issues.

### Next step
- Reassess whether the current T010 MVP now constrains comparative answers enough to shift future hardening toward interaction clarity rather than more semantic guardrails.

## 2026-03-30 - T010 Multi-Turn Continuity Pass

### What was completed
- Inspected the current T010 multi-turn path across the frontend chat panel, request payload shaping, reply contract, backend service, and prompt instructions before changing anything.
- Built a compact evaluation set of realistic short follow-up exchanges, focusing on cases like “what specifically supports that?”, “only from the artifact, what can you really say?”, and correction-style turns.
- Hardened ephemeral multi-turn continuity by sending a compact structured recap of prior assistant trust metadata back through local history, so follow-up questions retain the previous answer’s bounds, basis, and artifact areas.

### Decisions made
- Keep the fix narrow and local to ephemeral T010 history shaping instead of adding new persistence, memory, or contract complexity.
- Prefer deterministic frontend history shaping over hoping the model will preserve prior trust signals from plain assistant prose alone.
- Preserve the existing visible chat UI and trust model; this pass only improves what the model sees on follow-up turns.

### Issues found
- The strongest remaining multi-turn weakness was that prior assistant turns were sent back to the backend as plain answer text only.
- That meant short follow-ups could lose the earlier answer’s support status, evidence basis, trace labels, limits, and scope bounds even though the UI already had those trust signals locally.

### Next step
- Reassess whether the current T010 MVP now preserves enough bounded continuity across short exchanges to shift future hardening toward response quality rather than history semantics.

## 2026-03-30 - T010 Limited-Answer Separation Pass

### What was completed
- Inspected the current T010 chat contract, service shaping, prompt asset, traceability rendering, and stale/missing-context handling before making changes.
- Built a compact evaluation set of realistic T010 questions with emphasis on partially answerable asks, where the main risk is over-soft or weakly separated limited answers.
- Hardened limited replies so the system now enforces a clearer split between what the displayed artifact supports and what it cannot conclude when the model leaves that boundary too soft.

### Decisions made
- Keep the pass narrow and behavior-focused rather than adding any new capability or contract surface.
- Prefer deterministic backend hardening for limited replies over relying on prompt quality alone.
- Preserve the existing chat trust model (`answer_mode`, `scope_note`, `trace_labels`, `evidence_mode`) and tighten only how limited answers use those existing fields.

### Issues found
- The strongest remaining weakness was in partially answerable questions: the contract already had evidence and limitation fields, but nothing ensured limited replies used them clearly enough to separate support from uncertainty.
- That created a risk of limited answers sounding polite but still too generic about what the artifact truly supports versus what it cannot conclude.

### Next step
- Reassess whether T010 now has enough bounded-answer clarity to shift the next narrow hardening pass toward interaction quality rather than more semantics around limited-answer trust.

## 2026-03-30 - T010 Evidence-Layer Separation Pass

### What was completed
- Inspected the current T010 reply contract, trace label handling, artifact digest, prompt instructions, and frontend chat rendering before changing anything.
- Added one compact reply-level field, `evidence_mode`, so each contextual chat answer now declares whether it relies mainly on deterministic artifact evidence, interpreted report output, or a mix of both.
- Updated the chat UI to render that evidence-layer basis lightly alongside the existing support-status and trace labels.

### Decisions made
- Keep the pass narrow and semantic rather than adding any new capability, retrieval, or provenance system.
- Derive `evidence_mode` conservatively in the backend from the actual `trace_labels` instead of trusting the model alone to self-classify its answer basis.
- Preserve the existing `answer_mode`, `scope_note`, `artifact_digest`, and `trace_labels` architecture; this pass only separates deterministic versus interpretive reliance more clearly.

### Issues found
- The chat could already show which artifact areas it used, but users still could not tell whether an answer was leaning on deterministic report-input evidence, interpreted report-output coaching, or both.
- That left one remaining trust blur between “which fields were used” and “what kind of grounding basis the answer really has.”

### Next step
- Reassess whether the current T010 chat now has enough grounding honesty to shift the next narrow pass toward interaction quality rather than more reply-semantics hardening.

## 2026-03-30 - T010 Answer Traceability Pass

### What was completed
- Inspected the current T010 reply contract, artifact digest, service shaping, prompt asset, chat panel rendering, and displayed-artifact truth logic before making changes.
- Added a compact answer-traceability field so each contextual chat reply now carries explicit artifact-area labels for the parts of the displayed artifact it relied on.
- Updated the frontend chat panel to render those trace labels lightly as trust-supporting source chips rather than a heavier citations system.

### Decisions made
- Keep the pass narrow and traceability-focused instead of expanding capability or building provenance infrastructure.
- Use a compact enumerated `trace_labels` field rather than freeform citations so the trace stays auditable, stable, and lightweight.
- Leave stale/current bounds, answer modes, and the artifact digest architecture intact; this pass only makes the answer’s source areas more visible to the user.

### Issues found
- The chat already exposed evidence text and scope bounds, but it still did not clearly tell the user which displayed artifact areas the answer actually drew from.
- That left one remaining trust gap between “grounded in principle” and “auditable in practice.”

### Next step
- Review whether the current T010 surface now provides enough trust and answer auditability to focus the next pass on interaction quality rather than additional grounding semantics.

## 2026-03-30 - T010 Evaluation And Reply-Quality Hardening Pass

### What was completed
- Audited the first T010 contextual chat MVP by inspecting the route, service, prompt asset, shared contracts, frontend panel, and displayed-artifact truth logic.
- Ran a compact offline evaluation set of realistic user questions against the current artifact-grounding shape because this environment does not have `OPENAI_API_KEY` available for live model completions.
- Hardened the chat payload with a deterministic artifact digest/source map so the model no longer has to infer common coaching answers from a large raw report payload alone.

### Decisions made
- Fix the highest-value reply-quality weakness at the prompt/context-shaping layer instead of adding any new chat capability.
- Keep the pass narrow: no persistence, no thread model, no generic assistant behavior, no T009 reopening.
- Use the digest as a primary routing surface for common grounded questions while keeping the full persisted report input/output available for deeper supported detail.

### Issues found
- The grounded chat had the right persisted artifact context, but directly answerable questions still depended on the model discovering the right evidence inside a large unshaped payload.
- That made generic-sounding answers the biggest remaining reply-quality risk even when the artifact already contained enough information to answer concretely.

### Next step
- Review whether the contextual chat now answers common artifact-grounded questions with enough specificity to justify the next narrow T010 pass being about interaction quality rather than grounding or trust semantics.

## 2026-03-30 - T010 Audit And Hardening Pass

### What was completed
- Audited the first grounded contextual chat MVP across the route, service, prompt asset, shared contracts, frontend panel, and overview integration before making any change.
- Tightened the chat reply contract so every assistant answer must now declare whether it is fully grounded or limited, plus a short scope/bounds note.
- Updated the prompt and frontend rendering so reply trust now depends on explicit answer support status instead of implied grounding alone.

### Decisions made
- Fix the highest-value weakness at the contract/prompt boundary rather than adding more chat features.
- Keep the pass narrow: no persistence, no new architecture, no thread system, no broader T010 behavior expansion.
- Prefer explicit support-status semantics over optimistic “grounded by default” UI language.

### Issues found
- The first T010 pass was grounded in the right persisted artifact, but the reply schema still allowed answers to sound more fully supported than they might actually be.
- The UI showed evidence and limits, but it did not require an explicit answer-level declaration of whether the response was grounded or limited.

### Next step
- Review whether the contextual chat now feels semantically strict enough to continue T010 with another narrow interaction-quality pass instead of reopening trust foundations again.

## 2026-03-30 - T010 First Grounded Contextual Chat Pass

### What was completed
- Inspected the existing persisted artifact chain and started T010 with the narrowest coherent grounded chat seam instead of adding a broader assistant system.
- Added an authenticated contextual chat route that answers only from the selected profile plus the displayed persisted report artifact and its backing report input contract.
- Added a dashboard chat panel with explicit grounding context, stale/missing-artifact handling, and ephemeral local history that resets when the profile or displayed report artifact changes.

### Decisions made
- Use the persisted report artifact as the chat grounding source of truth, specifically `report_input_json` plus `report_output_json`, rather than recomputing analytics or building a new context store.
- Keep the first pass ephemeral with no persisted chat threads, no memory, and no orchestration/chat coupling beyond reading the currently displayed artifact context.
- Keep truth semantics strict: the chat can answer over a stale displayed artifact, but it must say that it is stale and remain limited to that artifact.

### Issues found
- The repo already had the right report-artifact grounding seam, but no authenticated route or product surface to interrogate it.
- Local chat state would have become misleading if it survived profile/report changes, so the panel now resets on context changes.

### Next step
- Review whether the first T010 pass is sufficient as a truthful contextual interrogation surface, then decide whether the next pass should stay on narrow interaction quality or add only the smallest missing chat capability.

## 2026-03-30 - T009 Stabilization And Final-Readiness Pass

### What was completed
- Reviewed the live dashboard after the artifact-truth pass specifically to judge whether T009 was close to freeze rather than to add more polish.
- Tightened one remaining semantic weak spot: the distinction between displayed interpretation integrity and end-to-end pipeline freshness.
- Left the product otherwise stable and avoided adding another new T009 concept layer.

### Decisions made
- Treat the dashboard as close to freeze and only fix the single highest-value remaining ambiguity instead of continuing cosmetic churn.
- Keep the overview/pillar banner responsible for displayed interpretation truth, and keep the orchestration surface responsible for end-to-end freshness.
- Avoid backend scope, feature work, shell redesign, or new product systems in this pass.

### Issues found
- The current dashboard had become strong enough that the main remaining risk was semantic overlap, not missing capability.
- "Coherent" and "current/latest" language across overview and orchestration could still blur displayed artifact integrity with full upstream freshness.

### Next step
- T009 now looks close to stabilization. The next step should be a deliberate freeze/readiness review rather than another routine surface-refinement pass unless a concrete product friction is discovered.

## 2026-03-30 - T009 Artifact Truth And Displayed-Result Integrity Pass

### What was completed
- Tightened the live dashboard so the visible coaching interpretation no longer silently drifts ahead of or behind the artifact chain it actually displays.
- Changed the overview and deep-read handoff to anchor the displayed analytics summary to the same analytics run that backs the displayed report artifact whenever a report exists.
- Tightened orchestration wording and status semantics so the UI now distinguishes more carefully between displayed, coherent, mixed, and launch-ready states.

### Decisions made
- Keep the pass strictly inside T009 and avoid any new backend scope; all truth-state tightening was derived from existing persisted run/artifact relationships already available in the frontend.
- Prefer conservative copy like "displayed" and "coherent" over more optimistic labels like "current" or "latest" unless the code could actually justify them.
- Keep stale-or-mixed truth visible at both the overview and pillar-handoff layers instead of burying it inside the orchestration panel only.

### Issues found
- The overview was loading the latest completed analytics summary and latest completed report independently, which could silently pair newer deterministic evidence with older interpretation.
- The orchestration surface still used a few optimistic labels that implied stronger freshness/currentness than the displayed artifact chain could always justify.

### Next step
- Review whether the dashboard now tells a strict enough truth about displayed artifacts, or whether T009 should stop here and shift toward stabilization rather than further product-surface layering.

## 2026-03-29 - T009 Orchestration Readiness And Robustness Pass

### What was completed
- Strengthened the new overview-level orchestration surface without broadening the product scope.
- Added explicit readiness, blocking, freshness, and handoff states so the current self-use mode feels less opaque.
- Added a minimal backend-backed readiness signal for the current server-configured environment and used it in the premium dashboard surface.

### Decisions made
- Keep the pass narrowly focused on orchestration trust rather than redesigning any run domain or starting T010.
- Add only one tiny backend support endpoint so the frontend can stop guessing whether Riot/OpenAI server-side configuration is present.
- Continue to build trust primarily from existing run history and existing persisted report linkage instead of reopening analytics/report contracts.

### Issues found
- The first orchestration pass improved flow, but it still assumed environment readiness instead of proving it.
- Stage history was visible, but the user still lacked a clear answer to whether the latest coaching chain was current enough to trust or what the next move should be when something failed.

### Next step
- Review whether the orchestration surface now feels trustworthy enough for the current self-use phase before deciding if T009 needs one more narrow trust/comprehension pass or is ready to stabilize.

## 2026-03-29 - T009 First-User Orchestration Pass

### What was completed
- Added a single orchestration surface to the premium overview so the current self-use flow now reads more like one product action.
- Connected profile selection, full pipeline triggering, latest stage state, and coaching handoff into one overview-level panel.
- Kept the operational workbench available below for manual control while moving the default user path into the main dashboard surface.

### Decisions made
- Stay strictly inside T009 by building orchestration on top of the existing ingestion, normalization, analytics, and report run domains.
- Keep the backend contract layer unchanged and sequence the current workflow through existing frontend API helpers.
- Make the overview own the default self-use action while preserving the workbench as a secondary fallback.

### Issues found
- The product already had all the core foundations, but the live experience still required the user to mentally stitch together five separate operational panels.
- The current self-use path did not yet feel like "choose profile -> run pipeline -> read coaching" even though the underlying domains already supported it.

### Next step
- Review whether the current orchestration surface is enough for the self-use phase or whether a later T009 pass should tighten status feedback and final handoff language even further without reopening architecture.

## 2026-03-29 - T009 Simplification And Signal-Density Pass

### What was completed
- Refined T009 by reducing redundant route and guidance layers rather than adding anything new.
- Removed overlapping navigation/explanation surfaces so the page keeps the coaching flow with less tutorial friction.
- Tightened local labels and header badges so the live dashboard carries more useful signal with fewer repeated cues.

### Decisions made
- Keep one concise coaching-flow cue and remove the extra route repetition around the live pillars.
- Preserve the evidence -> interpretation -> execution logic while making it feel more self-evident.
- Leave backend contracts, analytics/report schemas, shell structure, and isolated pillar redesign work unchanged.

### Issues found
- The previous T009 passes improved clarity, but they also introduced duplicated route and workflow framing.
- Repeated station/live cues and overlapping navigation widgets reduced signal density.

### Next step
- Continue T009 only if another narrow refinement is needed after reviewing whether the current dashboard now feels clearer and more confident without losing coaching comprehension.

## 2026-03-29 - T009 Workflow Readiness Pass

### What was completed
- Refined T009 at the coaching-workflow level rather than adding a new feature.
- Added a clearer evidence -> interpretation -> execution reading path across the overview and the live pillar area.
- Updated overview and pillar labels so the current dashboard reads more like coaching delivery and less like a polished report surface.

### Decisions made
- Keep the pass strictly on sequencing, local UI wording, and workflow comprehension.
- Reuse shared workflow/navigation primitives instead of reopening individual pillars deeply.
- Leave backend contracts, analytics/report schemas, shell structure, and T010 untouched.

### Issues found
- The live surface had strong sections, but the user journey still relied too much on inference.
- Evidence, interpretation, and execution guidance were present, but not yet explicit enough for a first-time coaching workflow.

### Next step
- Continue T009 only if another narrow presentation pass is needed after reviewing whether the live dashboard now feels usable as a first coaching product surface.

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

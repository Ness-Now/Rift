# T010 Chat Contextual

## Objective

Add a contextual chat surface that uses existing dashboard and report context without turning the product into a generic chatbot.

## Context

T010 is frozen as a narrow grounded contextual chat MVP that builds on the existing analytics, reports, and dashboard pillars without broadening into a general assistant system.

## Status

Frozen as the current narrow grounded MVP.

## Implemented Scope

- Authenticated contextual chat reply route grounded only in the selected profile and the displayed persisted report artifact
- Versioned prompt assets and backend shaping that keep replies bounded to approved artifact context
- Constrained dashboard chat panel with stale/missing-artifact handling and explicit grounding context
- Ephemeral local history that resets when the selected profile or displayed report artifact changes
- Narrow hardening passes for support-status semantics, artifact trace labels, evidence-basis labeling, bounded follow-up continuity, comparative guardrails, and one explicit action step

## Remaining Deferred Scope

- Persisted chat threads or memory
- Richer chat interaction design beyond the current grounded MVP
- Any broader assistant or thread architecture disconnected from the displayed artifact context

## Non-Goals

- General-purpose assistant behavior
- Independent prompt flows disconnected from dashboard context
- Expanding the ingestion or analytics scope without product need
- Replacing the fixed pillar experience with chat

## Definition Of Done

- Chat is explicitly contextual to the player report
- Inputs and outputs are bounded and documented
- The feature complements rather than replaces the dashboard
- Product limitations and safety boundaries are clear
- Persisted memory, generic assistant behavior, and broader thread architecture remain out of scope unless T010 is deliberately reopened beyond this frozen MVP

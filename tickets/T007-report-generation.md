# T007 Report Generation

## Status

Completed for the MVP structured report-generation layer.

## Objective

Generate structured AI commentary from deterministic analytics using versioned prompts on the backend.

## Context

AI output should sit on top of analytics rather than replacing it, and the prompt system must remain auditable. This stage must consume persisted analytics summaries, build a narrower report-input contract before the model call, and persist structured report artifacts.

## Scope Delivered

- Added an authenticated `report_runs` domain
- Added a deterministic report-input contract derived from persisted analytics summaries
- Added versioned prompt assets in `packages/prompts/player-report/v1`
- Added backend OpenAI report generation with strict structured JSON output handling
- Added persisted report artifacts with stored input and output payloads
- Added minimal frontend controls to generate and preview structured reports

## What Is Now Done

- Report generation consumes persisted analytics summaries rather than raw tables
- The backend can default to the latest completed analytics run for a selected owned Riot profile
- `analytics_version`, `report_version`, and `source_snapshot_type` are persisted on report runs
- Prompt assets are versioned outside runtime code
- The model receives only prompt instructions, report version metadata, and the deterministic report-input contract
- Structured report sections are persisted and ready for later dashboard surfaces

## What Remains For Later

- T008 dashboard overview built on persisted analytics and report artifacts
- T009 pillar-specific presentation
- T010 contextual chat
- Any future competitive-self-awareness framing, if product direction explicitly chooses it later

## Intentionally Deferred

- Final dashboard UI
- Conversational chat
- Delusional/not-delusional primary branding
- Rank estimation logic
- Multi-agent orchestration or complex report workflows

## Non-Goals

- Free-form chatbot behavior
- Replacing analytics with prompt inference
- Expanding the scope beyond the defined dashboard commentary use case
- Fine-tuning or model experimentation infrastructure

## Definition Of Done

- Backend can generate commentary from structured analytics features
- Prompt version and analytics version are traceable in outputs
- Output shape is defined and usable by the frontend
- Failure handling exists for model or prompt issues

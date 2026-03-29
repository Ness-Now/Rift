# Prompting

## Prompting Role In The System

Prompting is a presentation layer that turns deterministic backend features into coaching commentary. It should never replace the analytics layer or become the source of factual match interpretation.

## Prompt Design Rules

- Prompts receive structured features, not raw Riot payloads.
- Prompt text is versioned outside runtime application code.
- Output should align with fixed dashboard pillars once those are defined.
- The system should prefer grounded, evidence-based commentary over motivational filler.
- Missing or low-confidence inputs should be surfaced explicitly.

## Repository Layout

Prompt assets live under `packages/prompts/<prompt-family>/<version>/`.

Recommended contents per version:
- `metadata.yml`
- `system.md`
- optional developer guidance
- optional output contract notes

## Versioning Strategy

Each prompt family should keep explicit versions so that generated reports can be traced to:
- analytics version
- prompt version
- model identifier
- generation timestamp

## Deferred For Later Tickets

- Exact prompt inputs for each dashboard pillar
- Output schema for commentary blocks
- Evaluation workflow for prompt quality and regressions

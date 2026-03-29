# Data Schema

## Schema Philosophy

The data model should separate raw external payloads from normalized internal records. Normalized tables should describe product-level facts, not mirror Riot JSON directly.

## Ownership Zone

Users are the root ownership entity. Riot profiles are the next ownership anchor.

Candidate table:
- `users`: id, email, password_hash, created_at

Candidate table:
- `riot_profiles`: id, user_id, game_name, tag_line, riot_id_display, riot_id_norm, region, puuid, account_region_routing, platform_region, is_primary, created_at, updated_at, last_verified_at

Rules:
- email/password auth is an MVP shell, not the long-term auth strategy commitment
- password hashes are stored, never raw passwords
- `puuid` is globally unique
- one `puuid` cannot belong to multiple users
- future player-linked records should reference `riot_profiles.id` and therefore inherit `users.id`

## Raw Zone

Used to retain vendor payloads for traceability and replay.

Candidate tables:
- `ingestion_runs`: id, user_id, riot_profile_id, status, requested_max_matches, queue_id, started_at, completed_at, error_message, match_ids_requested, match_ids_ingested_count, match_payloads_ingested_count, timeline_payloads_ingested_count
- `raw_match_payloads`: id, ingestion_run_id, riot_profile_id, match_id, queue_id, game_version, platform_id, raw_match_json, raw_timeline_json, ingested_at

Rules:
- raw match detail and raw timeline payloads are persisted before normalization
- ingestion runs are owned through `users -> riot_profiles -> ingestion_runs`
- T005 should read from raw persisted data rather than live Riot HTTP responses
- raw payloads may contain duplicate `match_id` values across multiple ingestion runs
- queue 420 is validated again from stored match detail before the run counts a match as ingested

## Normalized Core Zone

Used for stable application facts.

Candidate tables:
- `normalization_runs`: id, user_id, riot_profile_id, status, started_at, completed_at, error_message, raw_match_rows_scanned, unique_matches_normalized, participants_rows_written, teams_rows_written, timeline_rows_written, events_rows_written
- `matches_clean`: one row per unique `match_id` and owned `riot_profile_id`, derived from the canonical raw source row
- `participants_clean`: one row per participant per normalized match with stable final stat columns and relation to the owned player
- `teams_clean`: one row per team per normalized match with bans and objective outcome columns
- `timeline_clean`: participant frame snapshots kept separate from final stats
- `events_clean`: selected timeline events kept in explicit event rows rather than nested JSON dumps

## Derived Zone

Used for deterministic outputs computed from normalized data.

Candidate tables or materializations:
- `analytics_runs`: id, user_id, riot_profile_id, status, started_at, completed_at, error_message, matches_analyzed, source_snapshot_type, analytics_version
- `analytics_summaries`: analytics_run_id, user_id, riot_profile_id, analytics_version, source_snapshot_type, summary_json, created_at
- future analytic feature tables can still be added later if the persisted summary payload becomes too coarse for dashboard needs
- `report_runs`: id, user_id, riot_profile_id, analytics_run_id, status, started_at, completed_at, error_message, analytics_version, report_version, source_snapshot_type
- `report_artifacts`: report_run_id, user_id, riot_profile_id, analytics_run_id, analytics_version, report_version, source_snapshot_type, prompt_id, prompt_version, report_input_json, report_output_json, created_at

## Presentation Zone

Optional persisted artifacts for generated outputs.

Candidate tables:
- `reports`: id, user_id, riot_profile_id, prompt_version, analytics_version, generated_at
- `report_sections`: report_id, pillar_key, content, created_at

## Important Rules

- Raw payloads are append-oriented and never treated as the canonical analytics source.
- Clean normalization deduplicates by `match_id`.
- The canonical raw source for duplicate `match_id` values is the most recently ingested raw row, defined as the highest raw payload id.
- Normalized tables should use internal naming and relational integrity.
- Analytics read the latest clean snapshot only for a given `riot_profile_id`.
- Analytics outputs are deterministic, persisted, and auditable.
- Derived analytics should be reproducible from normalized data plus versioned analytics code.
- T007 should consume persisted analytics outputs instead of recomputing raw statistics in prompt execution.
- Report generation should derive a narrower deterministic input contract from the persisted analytics summary before any LLM call.
- Report outputs should remain structured and versioned so later UI surfaces can render them without reparsing free-form blobs.
- Generated AI outputs should always be traceable to a user, analytics version, and prompt version.
- Match datasets and analysis requests should attach to `riot_profiles` rather than only to `users`.

## Deferred Decisions

- Exact PostgreSQL schema and migration tooling
- Exact long-term normalized columns for analytics features beyond the first clean schema cut
- Retention policy for raw payload storage
- Whether reports are always persisted or sometimes generated on demand

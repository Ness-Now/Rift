from dataclasses import dataclass


@dataclass(slots=True)
class IngestionRun:
    id: int
    user_id: int
    riot_profile_id: int
    status: str
    requested_max_matches: int
    queue_id: int
    started_at: str
    completed_at: str | None
    error_message: str | None
    match_ids_requested: int
    match_ids_ingested_count: int
    match_payloads_ingested_count: int
    timeline_payloads_ingested_count: int


@dataclass(slots=True)
class CreateIngestionRunInput:
    user_id: int
    riot_profile_id: int
    status: str
    requested_max_matches: int
    queue_id: int


@dataclass(slots=True)
class FinalizeIngestionRunInput:
    status: str
    error_message: str | None
    match_ids_requested: int
    match_ids_ingested_count: int
    match_payloads_ingested_count: int
    timeline_payloads_ingested_count: int


@dataclass(slots=True)
class RawMatchPayloadRecord:
    id: int
    ingestion_run_id: int
    riot_profile_id: int
    match_id: str
    queue_id: int
    game_version: str | None
    platform_id: str | None
    raw_match_json: str
    raw_timeline_json: str
    ingested_at: str


@dataclass(slots=True)
class CreateRawMatchPayloadInput:
    ingestion_run_id: int
    riot_profile_id: int
    match_id: str
    queue_id: int
    game_version: str | None
    platform_id: str | None
    raw_match_json: str
    raw_timeline_json: str

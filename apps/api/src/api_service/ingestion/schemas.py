from api_service.ingestion.models import IngestionRun, RawMatchPayloadRecord
from pydantic import BaseModel, ConfigDict, Field


class CreateIngestionRunRequest(BaseModel):
    riot_profile_id: int = Field(gt=0)
    max_matches: int = Field(default=50, ge=1, le=200)


class IngestionRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

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

    @classmethod
    def from_run(cls, run: IngestionRun) -> "IngestionRunResponse":
        return cls.model_validate(run)


class RawMatchPayloadSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ingestion_run_id: int
    riot_profile_id: int
    match_id: str
    queue_id: int
    game_version: str | None
    platform_id: str | None
    ingested_at: str

    @classmethod
    def from_record(cls, record: RawMatchPayloadRecord) -> "RawMatchPayloadSummaryResponse":
        return cls.model_validate(record)

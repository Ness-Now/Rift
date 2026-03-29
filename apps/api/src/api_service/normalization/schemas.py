from api_service.normalization.models import NormalizationRun
from pydantic import BaseModel, ConfigDict, Field


class CreateNormalizationRunRequest(BaseModel):
    riot_profile_id: int = Field(gt=0)


class NormalizationRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    riot_profile_id: int
    status: str
    started_at: str
    completed_at: str | None
    error_message: str | None
    raw_match_rows_scanned: int
    unique_matches_normalized: int
    participants_rows_written: int
    teams_rows_written: int
    timeline_rows_written: int
    events_rows_written: int

    @classmethod
    def from_run(cls, run: NormalizationRun) -> "NormalizationRunResponse":
        return cls.model_validate(run)

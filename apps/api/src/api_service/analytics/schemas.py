from typing import Any

from api_service.analytics.models import AnalyticsRun
from pydantic import BaseModel, ConfigDict, Field


class CreateAnalyticsRunRequest(BaseModel):
    riot_profile_id: int = Field(gt=0)


class AnalyticsRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    riot_profile_id: int
    status: str
    started_at: str
    completed_at: str | None
    error_message: str | None
    matches_analyzed: int
    source_snapshot_type: str
    analytics_version: str

    @classmethod
    def from_run(cls, run: AnalyticsRun) -> "AnalyticsRunResponse":
        return cls.model_validate(run)


class AnalyticsSummaryResponse(BaseModel):
    analytics_version: str
    source_snapshot_type: str
    overview: dict[str, Any]
    progression: dict[str, Any]
    splits: dict[str, Any]
    carry_context: dict[str, Any]
    macro: dict[str, Any]
    early_mid: dict[str, Any]
    data_quality: dict[str, Any]

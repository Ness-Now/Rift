from typing import Any

from api_service.reports.contracts import ReportInputContract, ReportOutput
from api_service.reports.models import ReportRun
from pydantic import BaseModel, ConfigDict, Field


class CreateReportRunRequest(BaseModel):
    riot_profile_id: int = Field(gt=0)
    analytics_run_id: int | None = Field(default=None, gt=0)


class ReportRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    riot_profile_id: int
    analytics_run_id: int
    status: str
    started_at: str
    completed_at: str | None
    error_message: str | None
    analytics_version: str
    report_version: str
    source_snapshot_type: str

    @classmethod
    def from_run(cls, run: ReportRun) -> "ReportRunResponse":
        return cls.model_validate(run)


class ReportArtifactResponse(BaseModel):
    report_run_id: int
    analytics_run_id: int
    analytics_version: str
    report_version: str
    source_snapshot_type: str
    prompt_id: str
    prompt_version: str
    report: ReportOutput


class ReportInputPreviewResponse(BaseModel):
    report_run_id: int
    analytics_run_id: int
    analytics_version: str
    report_version: str
    source_snapshot_type: str
    prompt_id: str
    prompt_version: str
    report_input: ReportInputContract


class ReportPreviewResponse(BaseModel):
    executive_summary: dict[str, Any]
    player_profile: dict[str, Any]
    strengths: list[dict[str, Any]]
    weaknesses: list[dict[str, Any]]
    priority_levers: list[dict[str, Any]]
    coaching_focus: list[dict[str, Any]]
    risk_flags: list[dict[str, Any]]
    confidence_and_limits: dict[str, Any]
    next_actions: list[dict[str, Any]]

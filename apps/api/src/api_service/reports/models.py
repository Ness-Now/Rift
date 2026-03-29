from dataclasses import dataclass


@dataclass(slots=True)
class ReportRun:
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


@dataclass(slots=True)
class CreateReportRunInput:
    user_id: int
    riot_profile_id: int
    analytics_run_id: int
    status: str
    analytics_version: str
    report_version: str
    source_snapshot_type: str


@dataclass(slots=True)
class FinalizeReportRunInput:
    status: str
    error_message: str | None


@dataclass(slots=True)
class ReportArtifact:
    report_run_id: int
    user_id: int
    riot_profile_id: int
    analytics_run_id: int
    analytics_version: str
    report_version: str
    source_snapshot_type: str
    prompt_id: str
    prompt_version: str
    report_input_json: str
    report_output_json: str
    created_at: str

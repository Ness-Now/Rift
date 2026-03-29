from dataclasses import dataclass


@dataclass(slots=True)
class AnalyticsRun:
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


@dataclass(slots=True)
class CreateAnalyticsRunInput:
    user_id: int
    riot_profile_id: int
    status: str
    source_snapshot_type: str
    analytics_version: str


@dataclass(slots=True)
class FinalizeAnalyticsRunInput:
    status: str
    error_message: str | None
    matches_analyzed: int


@dataclass(slots=True)
class AnalyticsSummaryRecord:
    analytics_run_id: int
    user_id: int
    riot_profile_id: int
    analytics_version: str
    source_snapshot_type: str
    summary_json: str
    created_at: str

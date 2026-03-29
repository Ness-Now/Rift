import json
import sqlite3
from dataclasses import dataclass

from analytics_engine import ANALYTICS_VERSION, build_analytics_summary
from api_service.analytics.errors import (
    AnalyticsError,
    AnalyticsNotFoundError,
    AnalyticsValidationError
)
from api_service.analytics.models import (
    AnalyticsRun,
    CreateAnalyticsRunInput,
    FinalizeAnalyticsRunInput
)
from api_service.analytics.repository import (
    AnalyticsRepository,
    build_analytics_repository
)
from api_service.analytics.schemas import CreateAnalyticsRunRequest
from api_service.riot_profiles.models import RiotProfile
from api_service.riot_profiles.repository import (
    RiotProfileRepository,
    build_riot_profile_repository
)
from fastapi import Depends


RUN_STATUS_RUNNING = "running"
RUN_STATUS_COMPLETED = "completed"
RUN_STATUS_FAILED = "failed"
SOURCE_SNAPSHOT_TYPE = "latest_clean_snapshot"


@dataclass(slots=True)
class AnalyticsService:
    runs: AnalyticsRepository
    profiles: RiotProfileRepository

    def compute(self, *, user_id: int, payload: CreateAnalyticsRunRequest) -> AnalyticsRun:
        profile = self._get_owned_profile(user_id=user_id, riot_profile_id=payload.riot_profile_id)
        run = self.runs.create_run(
            CreateAnalyticsRunInput(
                user_id=user_id,
                riot_profile_id=profile.id,
                status=RUN_STATUS_RUNNING,
                source_snapshot_type=SOURCE_SNAPSHOT_TYPE,
                analytics_version=ANALYTICS_VERSION
            )
        )

        matches_analyzed = 0

        try:
            snapshot = self.runs.load_clean_snapshot(riot_profile_id=profile.id)
            matches_analyzed = len(snapshot.matches)
            if matches_analyzed == 0:
                raise AnalyticsValidationError("No clean matches are available for this Riot profile.")

            summary = build_analytics_summary(snapshot)
            self.runs.upsert_summary(
                analytics_run_id=run.id,
                user_id=user_id,
                riot_profile_id=profile.id,
                analytics_version=ANALYTICS_VERSION,
                source_snapshot_type=SOURCE_SNAPSHOT_TYPE,
                summary=summary
            )
        except (AnalyticsError, sqlite3.Error, ValueError, TypeError) as exc:
            return self.runs.finalize_run(
                run_id=run.id,
                payload=FinalizeAnalyticsRunInput(
                    status=RUN_STATUS_FAILED,
                    error_message=str(exc),
                    matches_analyzed=matches_analyzed
                )
            )

        return self.runs.finalize_run(
            run_id=run.id,
            payload=FinalizeAnalyticsRunInput(
                status=RUN_STATUS_COMPLETED,
                error_message=None,
                matches_analyzed=matches_analyzed
            )
        )

    def list_for_user(self, *, user_id: int) -> list[AnalyticsRun]:
        return self.runs.list_runs_by_user_id(user_id)

    def get_owned_run(self, *, user_id: int, run_id: int) -> AnalyticsRun:
        run = self.runs.get_owned_run(user_id=user_id, run_id=run_id)
        if run is None:
            raise AnalyticsNotFoundError("Analytics run not found for this user.")
        return run

    def get_owned_summary(self, *, user_id: int, run_id: int) -> dict[str, object]:
        self.get_owned_run(user_id=user_id, run_id=run_id)
        summary = self.runs.get_owned_summary(user_id=user_id, run_id=run_id)
        if summary is None:
            raise AnalyticsNotFoundError("Analytics summary not found for this user.")
        loaded = json.loads(summary.summary_json)
        if not isinstance(loaded, dict):
            raise AnalyticsValidationError("Persisted analytics summary is invalid.")
        return loaded

    def _get_owned_profile(self, *, user_id: int, riot_profile_id: int) -> RiotProfile:
        profile = self.profiles.get_owned_by_id(user_id=user_id, profile_id=riot_profile_id)
        if profile is None:
            raise AnalyticsNotFoundError("Riot profile not found for this user.")
        return profile


def build_analytics_service(
    runs: AnalyticsRepository = Depends(build_analytics_repository),
    profiles: RiotProfileRepository = Depends(build_riot_profile_repository)
) -> AnalyticsService:
    return AnalyticsService(runs=runs, profiles=profiles)

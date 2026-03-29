import json
import sqlite3
from dataclasses import dataclass

from api_service.analytics.models import AnalyticsRun
from api_service.analytics.repository import (
    AnalyticsRepository,
    build_analytics_repository
)
from api_service.reports.client import (
    OpenAIReportClient,
    build_openai_report_client
)
from api_service.reports.contracts import ReportInputContract, ReportOutput
from api_service.reports.errors import (
    ReportNotFoundError,
    ReportValidationError
)
from api_service.reports.input_builder import REPORT_VERSION, build_report_input_contract
from api_service.reports.models import (
    CreateReportRunInput,
    FinalizeReportRunInput,
    ReportRun
)
from api_service.reports.prompting import load_prompt_asset
from api_service.reports.repository import (
    ReportRepository,
    build_report_repository
)
from api_service.reports.schemas import CreateReportRunRequest
from api_service.riot_profiles.models import RiotProfile
from api_service.riot_profiles.repository import (
    RiotProfileRepository,
    build_riot_profile_repository
)
from fastapi import Depends


RUN_STATUS_RUNNING = "running"
RUN_STATUS_COMPLETED = "completed"
RUN_STATUS_FAILED = "failed"


@dataclass(slots=True)
class ReportService:
    reports: ReportRepository
    profiles: RiotProfileRepository
    analytics: AnalyticsRepository
    openai_reports: OpenAIReportClient

    def generate(self, *, user_id: int, payload: CreateReportRunRequest) -> ReportRun:
        profile = self._get_owned_profile(user_id=user_id, riot_profile_id=payload.riot_profile_id)
        analytics_run = self._resolve_analytics_run(
            user_id=user_id,
            riot_profile_id=profile.id,
            analytics_run_id=payload.analytics_run_id
        )
        report_run = self.reports.create_run(
            CreateReportRunInput(
                user_id=user_id,
                riot_profile_id=profile.id,
                analytics_run_id=analytics_run.id,
                status=RUN_STATUS_RUNNING,
                analytics_version=analytics_run.analytics_version,
                report_version=REPORT_VERSION,
                source_snapshot_type=analytics_run.source_snapshot_type
            )
        )

        try:
            analytics_summary = self._load_analytics_summary(user_id=user_id, analytics_run=analytics_run)
            report_input = build_report_input_contract(analytics_summary)
            prompt_asset = load_prompt_asset()
            report_output = self.openai_reports.generate_report(
                report_version=REPORT_VERSION,
                system_prompt=prompt_asset.system_prompt,
                report_input=report_input
            )
            self.reports.upsert_artifact(
                report_run_id=report_run.id,
                user_id=user_id,
                riot_profile_id=profile.id,
                analytics_run_id=analytics_run.id,
                analytics_version=analytics_run.analytics_version,
                report_version=REPORT_VERSION,
                source_snapshot_type=analytics_run.source_snapshot_type,
                prompt_id=prompt_asset.prompt_id,
                prompt_version=prompt_asset.prompt_version,
                report_input_json=report_input.model_dump_json(),
                report_output_json=report_output.model_dump_json()
            )
        except (ReportValidationError, sqlite3.Error, ValueError, TypeError) as exc:
            return self.reports.finalize_run(
                run_id=report_run.id,
                payload=FinalizeReportRunInput(
                    status=RUN_STATUS_FAILED,
                    error_message=str(exc)
                )
            )

        return self.reports.finalize_run(
            run_id=report_run.id,
            payload=FinalizeReportRunInput(
                status=RUN_STATUS_COMPLETED,
                error_message=None
            )
        )

    def list_for_user(self, *, user_id: int) -> list[ReportRun]:
        return self.reports.list_runs_by_user_id(user_id)

    def get_owned_run(self, *, user_id: int, run_id: int) -> ReportRun:
        run = self.reports.get_owned_run(user_id=user_id, run_id=run_id)
        if run is None:
            raise ReportNotFoundError("Report run not found for this user.")
        return run

    def get_owned_report(self, *, user_id: int, run_id: int) -> dict[str, object]:
        artifact = self._get_owned_artifact(user_id=user_id, run_id=run_id)
        report_output = ReportOutput.model_validate_json(artifact.report_output_json)
        return {
            "report_run_id": artifact.report_run_id,
            "analytics_run_id": artifact.analytics_run_id,
            "analytics_version": artifact.analytics_version,
            "report_version": artifact.report_version,
            "source_snapshot_type": artifact.source_snapshot_type,
            "prompt_id": artifact.prompt_id,
            "prompt_version": artifact.prompt_version,
            "report": report_output
        }

    def get_owned_input_preview(self, *, user_id: int, run_id: int) -> dict[str, object]:
        artifact = self._get_owned_artifact(user_id=user_id, run_id=run_id)
        report_input = ReportInputContract.model_validate_json(artifact.report_input_json)
        return {
            "report_run_id": artifact.report_run_id,
            "analytics_run_id": artifact.analytics_run_id,
            "analytics_version": artifact.analytics_version,
            "report_version": artifact.report_version,
            "source_snapshot_type": artifact.source_snapshot_type,
            "prompt_id": artifact.prompt_id,
            "prompt_version": artifact.prompt_version,
            "report_input": report_input
        }

    def _resolve_analytics_run(
        self,
        *,
        user_id: int,
        riot_profile_id: int,
        analytics_run_id: int | None
    ) -> AnalyticsRun:
        if analytics_run_id is not None:
            run = self.analytics.get_owned_run(user_id=user_id, run_id=analytics_run_id)
            if run is None or run.riot_profile_id != riot_profile_id:
                raise ReportNotFoundError("Analytics run not found for this Riot profile.")
            if run.status != RUN_STATUS_COMPLETED:
                raise ReportValidationError("Analytics run must be completed before report generation.")
            return run

        latest_run = self.analytics.get_latest_completed_run_for_profile(
            user_id=user_id,
            riot_profile_id=riot_profile_id
        )
        if latest_run is None:
            raise ReportValidationError("No completed analytics run is available for this Riot profile.")
        return latest_run

    def _load_analytics_summary(self, *, user_id: int, analytics_run: AnalyticsRun) -> dict[str, object]:
        summary_record = self.analytics.get_owned_summary(user_id=user_id, run_id=analytics_run.id)
        if summary_record is None:
            raise ReportValidationError("Completed analytics summary is missing.")
        loaded = json.loads(summary_record.summary_json)
        if not isinstance(loaded, dict):
            raise ReportValidationError("Persisted analytics summary is invalid.")
        return loaded

    def _get_owned_artifact(self, *, user_id: int, run_id: int):
        self.get_owned_run(user_id=user_id, run_id=run_id)
        artifact = self.reports.get_owned_artifact(user_id=user_id, run_id=run_id)
        if artifact is None:
            raise ReportNotFoundError("Structured report artifact not found for this user.")
        return artifact

    def _get_owned_profile(self, *, user_id: int, riot_profile_id: int) -> RiotProfile:
        profile = self.profiles.get_owned_by_id(user_id=user_id, profile_id=riot_profile_id)
        if profile is None:
            raise ReportNotFoundError("Riot profile not found for this user.")
        return profile


def build_report_service(
    reports: ReportRepository = Depends(build_report_repository),
    profiles: RiotProfileRepository = Depends(build_riot_profile_repository),
    analytics: AnalyticsRepository = Depends(build_analytics_repository),
    openai_reports: OpenAIReportClient = Depends(build_openai_report_client)
) -> ReportService:
    return ReportService(
        reports=reports,
        profiles=profiles,
        analytics=analytics,
        openai_reports=openai_reports
    )

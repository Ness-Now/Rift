import sqlite3
from dataclasses import dataclass

from api_service.normalization.errors import (
    NormalizationError,
    NormalizationNotFoundError
)
from api_service.normalization.models import (
    CreateNormalizationRunInput,
    EventCleanRecord,
    FinalizeNormalizationRunInput,
    MatchCleanRecord,
    NormalizationRun,
    ParticipantCleanRecord,
    TeamCleanRecord,
    TimelineCleanRecord
)
from api_service.normalization.repository import (
    NormalizationRepository,
    build_normalization_repository
)
from api_service.normalization.schemas import CreateNormalizationRunRequest
from api_service.normalization.transformers import normalize_canonical_source
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
class NormalizationService:
    runs: NormalizationRepository
    profiles: RiotProfileRepository

    def normalize(self, *, user_id: int, payload: CreateNormalizationRunRequest) -> NormalizationRun:
        profile = self._get_owned_profile(user_id=user_id, riot_profile_id=payload.riot_profile_id)
        run = self.runs.create_run(
            CreateNormalizationRunInput(
                user_id=user_id,
                riot_profile_id=profile.id,
                status=RUN_STATUS_RUNNING
            )
        )

        raw_rows_scanned = 0
        unique_matches_normalized = 0
        participants_rows_written = 0
        teams_rows_written = 0
        timeline_rows_written = 0
        events_rows_written = 0

        try:
            raw_rows_scanned = self.runs.count_raw_rows_for_profile(riot_profile_id=profile.id)
            canonical_sources = self.runs.list_canonical_raw_sources(riot_profile_id=profile.id)

            match_rows: list[MatchCleanRecord] = []
            participant_rows: list[ParticipantCleanRecord] = []
            team_rows: list[TeamCleanRecord] = []
            timeline_rows: list[TimelineCleanRecord] = []
            event_rows: list[EventCleanRecord] = []

            for source in canonical_sources:
                (
                    match_row,
                    next_participants,
                    next_teams,
                    next_timeline_rows,
                    next_event_rows
                ) = normalize_canonical_source(source=source, player_puuid=profile.puuid)

                match_rows.append(match_row)
                participant_rows.extend(next_participants)
                team_rows.extend(next_teams)
                timeline_rows.extend(next_timeline_rows)
                event_rows.extend(next_event_rows)

            self.runs.replace_clean_snapshot(
                riot_profile_id=profile.id,
                matches=match_rows,
                participants=participant_rows,
                teams=team_rows,
                timeline_rows=timeline_rows,
                event_rows=event_rows
            )

            unique_matches_normalized = len(match_rows)
            participants_rows_written = len(participant_rows)
            teams_rows_written = len(team_rows)
            timeline_rows_written = len(timeline_rows)
            events_rows_written = len(event_rows)
        except (NormalizationError, sqlite3.Error, ValueError, TypeError) as exc:
            return self.runs.finalize_run(
                run_id=run.id,
                payload=FinalizeNormalizationRunInput(
                    status=RUN_STATUS_FAILED,
                    error_message=str(exc),
                    raw_match_rows_scanned=raw_rows_scanned,
                    unique_matches_normalized=unique_matches_normalized,
                    participants_rows_written=participants_rows_written,
                    teams_rows_written=teams_rows_written,
                    timeline_rows_written=timeline_rows_written,
                    events_rows_written=events_rows_written
                )
            )

        return self.runs.finalize_run(
            run_id=run.id,
            payload=FinalizeNormalizationRunInput(
                status=RUN_STATUS_COMPLETED,
                error_message=None,
                raw_match_rows_scanned=raw_rows_scanned,
                unique_matches_normalized=unique_matches_normalized,
                participants_rows_written=participants_rows_written,
                teams_rows_written=teams_rows_written,
                timeline_rows_written=timeline_rows_written,
                events_rows_written=events_rows_written
            )
        )

    def list_for_user(self, *, user_id: int) -> list[NormalizationRun]:
        return self.runs.list_runs_by_user_id(user_id)

    def get_owned_run(self, *, user_id: int, run_id: int) -> NormalizationRun:
        run = self.runs.get_owned_run(user_id=user_id, run_id=run_id)
        if run is None:
            raise NormalizationNotFoundError("Normalization run not found for this user.")
        return run

    def _get_owned_profile(self, *, user_id: int, riot_profile_id: int) -> RiotProfile:
        profile = self.profiles.get_owned_by_id(user_id=user_id, profile_id=riot_profile_id)
        if profile is None:
            raise NormalizationNotFoundError("Riot profile not found for this user.")
        return profile


def build_normalization_service(
    runs: NormalizationRepository = Depends(build_normalization_repository),
    profiles: RiotProfileRepository = Depends(build_riot_profile_repository)
) -> NormalizationService:
    return NormalizationService(runs=runs, profiles=profiles)

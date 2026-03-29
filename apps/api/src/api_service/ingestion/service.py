import json
import sqlite3
from dataclasses import dataclass

from api_service.ingestion.client import RiotMatchClient, build_riot_match_client
from api_service.ingestion.errors import IngestionError, IngestionNotFoundError
from api_service.ingestion.models import (
    CreateIngestionRunInput,
    CreateRawMatchPayloadInput,
    FinalizeIngestionRunInput,
    IngestionRun,
    RawMatchPayloadRecord
)
from api_service.ingestion.repository import (
    IngestionRepository,
    build_ingestion_repository
)
from api_service.ingestion.schemas import CreateIngestionRunRequest
from api_service.riot_profiles.models import RiotProfile
from api_service.riot_profiles.repository import (
    RiotProfileRepository,
    build_riot_profile_repository
)
from fastapi import Depends


RANKED_SOLO_DUO_QUEUE_ID = 420
RUN_STATUS_RUNNING = "running"
RUN_STATUS_COMPLETED = "completed"
RUN_STATUS_FAILED = "failed"


@dataclass(slots=True)
class IngestionService:
    runs: IngestionRepository
    profiles: RiotProfileRepository
    riot_matches: RiotMatchClient

    def ingest(self, *, user_id: int, payload: CreateIngestionRunRequest) -> IngestionRun:
        profile = self._get_owned_profile(user_id=user_id, riot_profile_id=payload.riot_profile_id)
        run = self.runs.create_run(
            CreateIngestionRunInput(
                user_id=user_id,
                riot_profile_id=profile.id,
                status=RUN_STATUS_RUNNING,
                requested_max_matches=payload.max_matches,
                queue_id=RANKED_SOLO_DUO_QUEUE_ID
            )
        )

        match_ids_requested = 0
        match_ids_ingested_count = 0
        match_payloads_ingested_count = 0
        timeline_payloads_ingested_count = 0

        try:
            batch = self.riot_matches.get_match_ids(
                puuid=profile.puuid,
                regional_routing=profile.account_region_routing,
                count=payload.max_matches,
                queue_id=RANKED_SOLO_DUO_QUEUE_ID
            )
            match_ids_requested = len(batch.match_ids)

            for match_id in batch.match_ids:
                detail_payload = self.riot_matches.get_match_detail(
                    regional_routing=profile.account_region_routing,
                    match_id=match_id
                )
                queue_id = _extract_queue_id(detail_payload)
                if queue_id != RANKED_SOLO_DUO_QUEUE_ID:
                    continue

                timeline_payload = self.riot_matches.get_match_timeline(
                    regional_routing=profile.account_region_routing,
                    match_id=match_id
                )
                self.runs.create_raw_match_payload(
                    CreateRawMatchPayloadInput(
                        ingestion_run_id=run.id,
                        riot_profile_id=profile.id,
                        match_id=match_id,
                        queue_id=queue_id,
                        game_version=_extract_game_version(detail_payload),
                        platform_id=_extract_platform_id(detail_payload),
                        raw_match_json=json.dumps(detail_payload, separators=(",", ":"), sort_keys=True),
                        raw_timeline_json=json.dumps(timeline_payload, separators=(",", ":"), sort_keys=True)
                    )
                )
                match_ids_ingested_count += 1
                match_payloads_ingested_count += 1
                timeline_payloads_ingested_count += 1
        except (IngestionError, sqlite3.Error) as exc:
            return self.runs.finalize_run(
                run_id=run.id,
                payload=FinalizeIngestionRunInput(
                    status=RUN_STATUS_FAILED,
                    error_message=str(exc),
                    match_ids_requested=match_ids_requested,
                    match_ids_ingested_count=match_ids_ingested_count,
                    match_payloads_ingested_count=match_payloads_ingested_count,
                    timeline_payloads_ingested_count=timeline_payloads_ingested_count
                )
            )

        return self.runs.finalize_run(
            run_id=run.id,
            payload=FinalizeIngestionRunInput(
                status=RUN_STATUS_COMPLETED,
                error_message=None,
                match_ids_requested=match_ids_requested,
                match_ids_ingested_count=match_ids_ingested_count,
                match_payloads_ingested_count=match_payloads_ingested_count,
                timeline_payloads_ingested_count=timeline_payloads_ingested_count
            )
        )

    def list_for_user(self, *, user_id: int) -> list[IngestionRun]:
        return self.runs.list_runs_by_user_id(user_id)

    def get_owned_run(self, *, user_id: int, run_id: int) -> IngestionRun:
        run = self.runs.get_owned_run(user_id=user_id, run_id=run_id)
        if run is None:
            raise IngestionNotFoundError("Ingestion run not found for this user.")
        return run

    def list_run_matches(self, *, user_id: int, run_id: int) -> list[RawMatchPayloadRecord]:
        self.get_owned_run(user_id=user_id, run_id=run_id)
        return self.runs.list_raw_matches_for_run(run_id=run_id)

    def _get_owned_profile(self, *, user_id: int, riot_profile_id: int) -> RiotProfile:
        profile = self.profiles.get_owned_by_id(user_id=user_id, profile_id=riot_profile_id)
        if profile is None:
            raise IngestionNotFoundError("Riot profile not found for this user.")
        return profile


def _extract_queue_id(detail_payload: dict[str, object]) -> int:
    info = detail_payload.get("info")
    if not isinstance(info, dict):
        return -1
    queue_id = info.get("queueId")
    return int(queue_id) if isinstance(queue_id, int) else -1


def _extract_game_version(detail_payload: dict[str, object]) -> str | None:
    info = detail_payload.get("info")
    if not isinstance(info, dict):
        return None
    game_version = info.get("gameVersion")
    return str(game_version) if game_version is not None else None


def _extract_platform_id(detail_payload: dict[str, object]) -> str | None:
    metadata = detail_payload.get("metadata")
    if isinstance(metadata, dict):
        platform_id = metadata.get("platformId")
        if platform_id is not None:
            return str(platform_id)

    info = detail_payload.get("info")
    if isinstance(info, dict):
        platform_id = info.get("platformId")
        if platform_id is not None:
            return str(platform_id)

    return None


def build_ingestion_service(
    runs: IngestionRepository = Depends(build_ingestion_repository),
    profiles: RiotProfileRepository = Depends(build_riot_profile_repository),
    riot_matches: RiotMatchClient = Depends(build_riot_match_client)
) -> IngestionService:
    return IngestionService(runs=runs, profiles=profiles, riot_matches=riot_matches)

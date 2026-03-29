from typing import NoReturn

from api_service.auth.dependencies import require_current_user
from api_service.ingestion.errors import IngestionError
from api_service.ingestion.schemas import (
    CreateIngestionRunRequest,
    IngestionRunResponse,
    RawMatchPayloadSummaryResponse
)
from api_service.ingestion.service import IngestionService, build_ingestion_service
from api_service.users.models import User
from fastapi import APIRouter, Depends, HTTPException, status

router = APIRouter(prefix="/ingestion-runs", tags=["ingestion-runs"])


@router.post("", response_model=IngestionRunResponse, status_code=status.HTTP_201_CREATED)
def create_ingestion_run(
    payload: CreateIngestionRunRequest,
    user: User = Depends(require_current_user),
    service: IngestionService = Depends(build_ingestion_service)
) -> IngestionRunResponse:
    try:
        run = service.ingest(user_id=user.id, payload=payload)
    except IngestionError as error:
        _raise_http_error(error)

    return IngestionRunResponse.model_validate(run)


@router.get("", response_model=list[IngestionRunResponse])
def list_ingestion_runs(
    user: User = Depends(require_current_user),
    service: IngestionService = Depends(build_ingestion_service)
) -> list[IngestionRunResponse]:
    return [
        IngestionRunResponse.model_validate(run)
        for run in service.list_for_user(user_id=user.id)
    ]


@router.get("/{run_id}", response_model=IngestionRunResponse)
def get_ingestion_run(
    run_id: int,
    user: User = Depends(require_current_user),
    service: IngestionService = Depends(build_ingestion_service)
) -> IngestionRunResponse:
    try:
        run = service.get_owned_run(user_id=user.id, run_id=run_id)
    except IngestionError as error:
        _raise_http_error(error)

    return IngestionRunResponse.model_validate(run)


@router.get("/{run_id}/matches", response_model=list[RawMatchPayloadSummaryResponse])
def list_ingested_matches(
    run_id: int,
    user: User = Depends(require_current_user),
    service: IngestionService = Depends(build_ingestion_service)
) -> list[RawMatchPayloadSummaryResponse]:
    try:
        match_payloads = service.list_run_matches(user_id=user.id, run_id=run_id)
    except IngestionError as error:
        _raise_http_error(error)

    return [
        RawMatchPayloadSummaryResponse.model_validate(match_payload)
        for match_payload in match_payloads
    ]


def _raise_http_error(error: IngestionError) -> NoReturn:
    raise HTTPException(status_code=error.status_code, detail=error.detail)

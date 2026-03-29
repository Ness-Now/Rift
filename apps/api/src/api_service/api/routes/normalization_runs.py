from typing import NoReturn

from api_service.auth.dependencies import require_current_user
from api_service.normalization.errors import NormalizationError
from api_service.normalization.schemas import (
    CreateNormalizationRunRequest,
    NormalizationRunResponse
)
from api_service.normalization.service import (
    NormalizationService,
    build_normalization_service
)
from api_service.users.models import User
from fastapi import APIRouter, Depends, HTTPException, status

router = APIRouter(prefix="/normalization-runs", tags=["normalization-runs"])


@router.post("", response_model=NormalizationRunResponse, status_code=status.HTTP_201_CREATED)
def create_normalization_run(
    payload: CreateNormalizationRunRequest,
    user: User = Depends(require_current_user),
    service: NormalizationService = Depends(build_normalization_service)
) -> NormalizationRunResponse:
    try:
        run = service.normalize(user_id=user.id, payload=payload)
    except NormalizationError as error:
        _raise_http_error(error)

    return NormalizationRunResponse.model_validate(run)


@router.get("", response_model=list[NormalizationRunResponse])
def list_normalization_runs(
    user: User = Depends(require_current_user),
    service: NormalizationService = Depends(build_normalization_service)
) -> list[NormalizationRunResponse]:
    return [
        NormalizationRunResponse.model_validate(run)
        for run in service.list_for_user(user_id=user.id)
    ]


@router.get("/{run_id}", response_model=NormalizationRunResponse)
def get_normalization_run(
    run_id: int,
    user: User = Depends(require_current_user),
    service: NormalizationService = Depends(build_normalization_service)
) -> NormalizationRunResponse:
    try:
        run = service.get_owned_run(user_id=user.id, run_id=run_id)
    except NormalizationError as error:
        _raise_http_error(error)

    return NormalizationRunResponse.model_validate(run)


def _raise_http_error(error: NormalizationError) -> NoReturn:
    raise HTTPException(status_code=error.status_code, detail=error.detail)

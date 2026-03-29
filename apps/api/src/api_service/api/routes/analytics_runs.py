from typing import NoReturn

from api_service.analytics.errors import AnalyticsError
from api_service.analytics.schemas import (
    AnalyticsRunResponse,
    AnalyticsSummaryResponse,
    CreateAnalyticsRunRequest
)
from api_service.analytics.service import (
    AnalyticsService,
    build_analytics_service
)
from api_service.auth.dependencies import require_current_user
from api_service.users.models import User
from fastapi import APIRouter, Depends, HTTPException, status

router = APIRouter(prefix="/analytics-runs", tags=["analytics-runs"])


@router.post("", response_model=AnalyticsRunResponse, status_code=status.HTTP_201_CREATED)
def create_analytics_run(
    payload: CreateAnalyticsRunRequest,
    user: User = Depends(require_current_user),
    service: AnalyticsService = Depends(build_analytics_service)
) -> AnalyticsRunResponse:
    try:
        run = service.compute(user_id=user.id, payload=payload)
    except AnalyticsError as error:
        _raise_http_error(error)

    return AnalyticsRunResponse.model_validate(run)


@router.get("", response_model=list[AnalyticsRunResponse])
def list_analytics_runs(
    user: User = Depends(require_current_user),
    service: AnalyticsService = Depends(build_analytics_service)
) -> list[AnalyticsRunResponse]:
    return [
        AnalyticsRunResponse.model_validate(run)
        for run in service.list_for_user(user_id=user.id)
    ]


@router.get("/{run_id}", response_model=AnalyticsRunResponse)
def get_analytics_run(
    run_id: int,
    user: User = Depends(require_current_user),
    service: AnalyticsService = Depends(build_analytics_service)
) -> AnalyticsRunResponse:
    try:
        run = service.get_owned_run(user_id=user.id, run_id=run_id)
    except AnalyticsError as error:
        _raise_http_error(error)

    return AnalyticsRunResponse.model_validate(run)


@router.get("/{run_id}/summary", response_model=AnalyticsSummaryResponse)
def get_analytics_summary(
    run_id: int,
    user: User = Depends(require_current_user),
    service: AnalyticsService = Depends(build_analytics_service)
) -> AnalyticsSummaryResponse:
    try:
        summary = service.get_owned_summary(user_id=user.id, run_id=run_id)
    except AnalyticsError as error:
        _raise_http_error(error)

    return AnalyticsSummaryResponse.model_validate(summary)


def _raise_http_error(error: AnalyticsError) -> NoReturn:
    raise HTTPException(status_code=error.status_code, detail=error.detail)

from typing import NoReturn

from api_service.auth.dependencies import require_current_user
from api_service.reports.errors import ReportError
from api_service.reports.schemas import (
    CreateReportRunRequest,
    ReportArtifactResponse,
    ReportInputPreviewResponse,
    ReportRunResponse
)
from api_service.reports.service import (
    ReportService,
    build_report_service
)
from api_service.users.models import User
from fastapi import APIRouter, Depends, HTTPException, status

router = APIRouter(prefix="/report-runs", tags=["report-runs"])


@router.post("", response_model=ReportRunResponse, status_code=status.HTTP_201_CREATED)
def create_report_run(
    payload: CreateReportRunRequest,
    user: User = Depends(require_current_user),
    service: ReportService = Depends(build_report_service)
) -> ReportRunResponse:
    try:
        run = service.generate(user_id=user.id, payload=payload)
    except ReportError as error:
        _raise_http_error(error)

    return ReportRunResponse.model_validate(run)


@router.get("", response_model=list[ReportRunResponse])
def list_report_runs(
    user: User = Depends(require_current_user),
    service: ReportService = Depends(build_report_service)
) -> list[ReportRunResponse]:
    return [
        ReportRunResponse.model_validate(run)
        for run in service.list_for_user(user_id=user.id)
    ]


@router.get("/{run_id}", response_model=ReportRunResponse)
def get_report_run(
    run_id: int,
    user: User = Depends(require_current_user),
    service: ReportService = Depends(build_report_service)
) -> ReportRunResponse:
    try:
        run = service.get_owned_run(user_id=user.id, run_id=run_id)
    except ReportError as error:
        _raise_http_error(error)

    return ReportRunResponse.model_validate(run)


@router.get("/{run_id}/report", response_model=ReportArtifactResponse)
def get_report_artifact(
    run_id: int,
    user: User = Depends(require_current_user),
    service: ReportService = Depends(build_report_service)
) -> ReportArtifactResponse:
    try:
        artifact = service.get_owned_report(user_id=user.id, run_id=run_id)
    except ReportError as error:
        _raise_http_error(error)

    return ReportArtifactResponse.model_validate(artifact)


@router.get("/{run_id}/input-preview", response_model=ReportInputPreviewResponse)
def get_report_input_preview(
    run_id: int,
    user: User = Depends(require_current_user),
    service: ReportService = Depends(build_report_service)
) -> ReportInputPreviewResponse:
    try:
        preview = service.get_owned_input_preview(user_id=user.id, run_id=run_id)
    except ReportError as error:
        _raise_http_error(error)

    return ReportInputPreviewResponse.model_validate(preview)


def _raise_http_error(error: ReportError) -> NoReturn:
    raise HTTPException(status_code=error.status_code, detail=error.detail)

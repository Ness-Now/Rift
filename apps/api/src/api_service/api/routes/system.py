from api_service.api.routes.schemas import HealthResponse, VersionResponse
from api_service.core.config import get_settings
from fastapi import APIRouter

router = APIRouter(tags=["system"])


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse()


@router.get("/version", response_model=VersionResponse)
def version() -> VersionResponse:
    settings = get_settings()
    return VersionResponse(environment=settings.environment, version=settings.app_version)

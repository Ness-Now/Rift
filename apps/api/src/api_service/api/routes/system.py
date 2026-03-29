from api_service.api.routes.schemas import HealthResponse, ReadinessResponse, VersionResponse
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


@router.get("/readiness", response_model=ReadinessResponse)
def readiness() -> ReadinessResponse:
    settings = get_settings()
    riot_api_configured = settings.riot_api_key != ""
    openai_api_configured = settings.openai_api_key != ""
    missing_requirements: list[str] = []
    if not riot_api_configured:
        missing_requirements.append("RIOT_API_KEY")
    if not openai_api_configured:
        missing_requirements.append("OPENAI_API_KEY")

    return ReadinessResponse(
        environment=settings.environment,
        pipeline_ready=riot_api_configured and openai_api_configured,
        riot_api_configured=riot_api_configured,
        openai_api_configured=openai_api_configured,
        missing_requirements=missing_requirements,
    )

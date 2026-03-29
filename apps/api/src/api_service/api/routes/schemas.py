from pydantic import BaseModel


class HealthResponse(BaseModel):
    service: str = "api"
    status: str = "ok"


class VersionResponse(BaseModel):
    environment: str
    service: str = "api"
    version: str


class ReadinessResponse(BaseModel):
    environment: str
    workflow_mode: str = "server_configured_self_use"
    pipeline_ready: bool
    riot_api_configured: bool
    openai_api_configured: bool
    missing_requirements: list[str]
    service: str = "api"

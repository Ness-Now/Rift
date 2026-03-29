from pydantic import BaseModel


class HealthResponse(BaseModel):
    service: str = "api"
    status: str = "ok"


class VersionResponse(BaseModel):
    environment: str
    service: str = "api"
    version: str

from api_service.analytics.repository import initialize_analytics_storage
from api_service.api.router import api_router
from api_service.core.config import get_settings
from api_service.ingestion.repository import initialize_ingestion_storage
from api_service.normalization.repository import initialize_normalization_storage
from api_service.reports.repository import initialize_report_storage
from api_service.riot_profiles.repository import initialize_riot_profile_storage
from api_service.users.repository import initialize_user_storage
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="Rift API",
        version=settings.app_version,
        docs_url="/docs",
        redoc_url="/redoc"
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.web_origin],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.on_event("startup")
    def on_startup() -> None:
        initialize_user_storage(settings.sqlite_database_path)
        initialize_riot_profile_storage(settings.sqlite_database_path)
        initialize_ingestion_storage(settings.sqlite_database_path)
        initialize_normalization_storage(settings.sqlite_database_path)
        initialize_analytics_storage(settings.sqlite_database_path)
        initialize_report_storage(settings.sqlite_database_path)

    app.include_router(api_router)
    return app


app = create_app()

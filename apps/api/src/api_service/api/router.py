from api_service.api.routes.analytics_runs import router as analytics_runs_router
from api_service.api.routes.auth import router as auth_router
from api_service.api.routes.contextual_chat import router as contextual_chat_router
from api_service.api.routes.ingestion_runs import router as ingestion_runs_router
from api_service.api.routes.normalization_runs import router as normalization_runs_router
from api_service.api.routes.report_runs import router as report_runs_router
from api_service.api.routes.riot_profiles import router as riot_profiles_router
from api_service.api.routes.system import router as system_router
from fastapi import APIRouter

api_router = APIRouter()
api_router.include_router(analytics_runs_router)
api_router.include_router(auth_router)
api_router.include_router(contextual_chat_router)
api_router.include_router(ingestion_runs_router)
api_router.include_router(normalization_runs_router)
api_router.include_router(report_runs_router)
api_router.include_router(riot_profiles_router)
api_router.include_router(system_router)

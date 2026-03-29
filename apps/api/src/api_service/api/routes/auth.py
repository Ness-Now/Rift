from api_service.auth.dependencies import require_current_user
from api_service.auth.schemas import AuthTokenResponse, LoginRequest, SignupRequest, UserResponse
from api_service.auth.service import AuthService, build_auth_service
from api_service.users.models import User
from fastapi import APIRouter, Depends, status

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=AuthTokenResponse, status_code=status.HTTP_201_CREATED)
def signup(
    payload: SignupRequest,
    service: AuthService = Depends(build_auth_service)
) -> AuthTokenResponse:
    return service.signup(payload)


@router.post("/login", response_model=AuthTokenResponse)
def login(
    payload: LoginRequest,
    service: AuthService = Depends(build_auth_service)
) -> AuthTokenResponse:
    return service.login(payload)


@router.get("/me", response_model=UserResponse)
def current_user(user: User = Depends(require_current_user)) -> UserResponse:
    return UserResponse.model_validate(user)
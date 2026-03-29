from api_service.auth.service import AuthService, build_auth_service
from api_service.users.models import User
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

bearer_scheme = HTTPBearer(auto_error=False)


def get_token_payload(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    service: AuthService = Depends(build_auth_service)
) -> dict[str, int]:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required."
        )

    return service.tokens.verify(credentials.credentials)


def require_current_user(
    token_payload: dict[str, int] = Depends(get_token_payload),
    service: AuthService = Depends(build_auth_service)
) -> User:
    user = service.users.get_by_id(token_payload["sub"])
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists."
        )
    return user
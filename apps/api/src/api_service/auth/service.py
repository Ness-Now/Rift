from dataclasses import dataclass

from api_service.auth.schemas import AuthTokenResponse, LoginRequest, SignupRequest
from api_service.auth.security import hash_password, verify_password
from api_service.auth.tokens import TokenManager, build_token_manager
from api_service.users.models import CreateUserInput
from api_service.users.repository import UserRepository, build_user_repository
from fastapi import Depends, HTTPException, status


@dataclass(slots=True)
class AuthService:
    users: UserRepository
    tokens: TokenManager

    def signup(self, payload: SignupRequest) -> AuthTokenResponse:
        existing_user = self.users.get_by_email(payload.email)
        if existing_user is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists."
            )

        user = self.users.create(
            CreateUserInput(
                email=payload.email,
                password_hash=hash_password(payload.password)
            )
        )
        return AuthTokenResponse.from_user(
            access_token=self.tokens.issue(user_id=user.id),
            user=user
        )

    def login(self, payload: LoginRequest) -> AuthTokenResponse:
        user = self.users.get_by_email(payload.email)
        if user is None or not verify_password(payload.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password."
            )

        return AuthTokenResponse.from_user(
            access_token=self.tokens.issue(user_id=user.id),
            user=user
        )


def build_auth_service(
    users: UserRepository = Depends(build_user_repository),
    tokens: TokenManager = Depends(build_token_manager)
) -> AuthService:
    return AuthService(users=users, tokens=tokens)
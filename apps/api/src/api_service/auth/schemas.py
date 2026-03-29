from api_service.users.models import User
from pydantic import BaseModel, ConfigDict, Field, field_validator


class SignupRequest(BaseModel):
    email: str = Field(min_length=5, max_length=320)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        candidate = value.strip().lower()
        if "@" not in candidate:
            raise ValueError("Email must contain '@'.")
        return candidate


class LoginRequest(BaseModel):
    email: str = Field(min_length=5, max_length=320)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        candidate = value.strip().lower()
        if "@" not in candidate:
            raise ValueError("Email must contain '@'.")
        return candidate


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    created_at: str


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

    @classmethod
    def from_user(cls, *, access_token: str, user: User) -> "AuthTokenResponse":
        return cls(access_token=access_token, user=UserResponse.model_validate(user))
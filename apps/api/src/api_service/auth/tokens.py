from dataclasses import dataclass

from api_service.core.config import Settings, get_settings
from fastapi import Depends, HTTPException, status
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer


@dataclass(slots=True)
class TokenManager:
    serializer: URLSafeTimedSerializer
    max_age_seconds: int

    def issue(self, *, user_id: int) -> str:
        return self.serializer.dumps({"sub": user_id})

    def verify(self, token: str) -> dict[str, int]:
        try:
            payload = self.serializer.loads(token, max_age=self.max_age_seconds)
        except SignatureExpired as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication token expired."
            ) from exc
        except BadSignature as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication token is invalid."
            ) from exc

        return {"sub": int(payload["sub"])}


def build_token_manager(settings: Settings = Depends(get_settings)) -> TokenManager:
    serializer = URLSafeTimedSerializer(settings.auth_secret_key, salt="rift-auth")
    return TokenManager(
        serializer=serializer,
        max_age_seconds=settings.auth_token_ttl_seconds
    )
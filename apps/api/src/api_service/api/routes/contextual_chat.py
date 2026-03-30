from typing import NoReturn

from api_service.auth.dependencies import require_current_user
from api_service.contextual_chat.errors import ContextualChatError
from api_service.contextual_chat.schemas import (
    ContextualChatResponse,
    CreateContextualChatReplyRequest
)
from api_service.contextual_chat.service import (
    ContextualChatService,
    build_contextual_chat_service
)
from api_service.users.models import User
from fastapi import APIRouter, Depends, HTTPException

router = APIRouter(prefix="/contextual-chat", tags=["contextual-chat"])


@router.post("/reply", response_model=ContextualChatResponse)
def create_contextual_chat_reply(
    payload: CreateContextualChatReplyRequest,
    user: User = Depends(require_current_user),
    service: ContextualChatService = Depends(build_contextual_chat_service)
) -> ContextualChatResponse:
    try:
        response = service.create_reply(user_id=user.id, payload=payload)
    except ContextualChatError as error:
        _raise_http_error(error)

    return ContextualChatResponse.model_validate(response)


def _raise_http_error(error: ContextualChatError) -> NoReturn:
    raise HTTPException(status_code=error.status_code, detail=error.detail)

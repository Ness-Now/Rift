from api_service.contextual_chat.contracts import (
    ContextualChatGrounding,
    ContextualChatMessage,
    ContextualChatReply
)
from pydantic import BaseModel, Field


class CreateContextualChatReplyRequest(BaseModel):
    riot_profile_id: int = Field(gt=0)
    report_run_id: int = Field(gt=0)
    messages: list[ContextualChatMessage] = Field(min_length=1, max_length=6)


class ContextualChatResponse(BaseModel):
    grounding: ContextualChatGrounding
    reply: ContextualChatReply

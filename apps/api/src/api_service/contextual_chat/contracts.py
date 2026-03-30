from typing import Literal

from pydantic import BaseModel, Field


CHAT_VERSION = "contextual_chat_v1"


class ContextualChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=1200)


class ContextualChatGrounding(BaseModel):
    riot_profile_id: int
    report_run_id: int
    analytics_run_id: int
    analytics_version: str
    report_version: str
    source_snapshot_type: str
    context_status: Literal["current", "stale"]
    latest_completed_analytics_run_id: int | None = None


class ContextualChatReply(BaseModel):
    answer_mode: Literal["grounded", "limited"]
    scope_note: str = Field(min_length=1)
    trace_labels: list[
        Literal[
            "priority_levers",
            "coaching_focus",
            "next_actions",
            "strengths",
            "weaknesses",
            "confidence_and_limits",
            "report_input.overview",
            "report_input.macro",
            "report_input.progression",
            "report_input.data_quality",
            "artifact_digest.signal_digest",
            "artifact_digest.report_digest",
        ]
    ] = Field(min_length=1, max_length=4)
    answer: str = Field(min_length=1)
    evidence_points: list[str] = Field(default_factory=list)
    limitation_points: list[str] = Field(default_factory=list)
    suggested_follow_up: str | None = None

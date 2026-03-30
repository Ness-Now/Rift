from dataclasses import dataclass

from api_service.analytics.repository import AnalyticsRepository, build_analytics_repository
from api_service.contextual_chat.client import (
    OpenAIContextualChatClient,
    build_openai_contextual_chat_client
)
from api_service.contextual_chat.context_builder import build_artifact_digest
from api_service.contextual_chat.contracts import (
    CHAT_VERSION,
    ContextualChatGrounding,
    ContextualChatReply
)
from api_service.contextual_chat.errors import (
    ContextualChatNotFoundError,
    ContextualChatValidationError
)
from api_service.contextual_chat.schemas import CreateContextualChatReplyRequest
from api_service.contextual_chat.prompting import load_prompt_asset
from api_service.reports.contracts import ReportInputContract, ReportOutput
from api_service.reports.repository import ReportRepository, build_report_repository
from api_service.riot_profiles.models import RiotProfile
from api_service.riot_profiles.repository import (
    RiotProfileRepository,
    build_riot_profile_repository
)
from fastapi import Depends
from pydantic import ValidationError


RUN_STATUS_COMPLETED = "completed"
DETERMINISTIC_TRACE_LABELS = {
    "report_input.overview",
    "report_input.macro",
    "report_input.progression",
    "report_input.data_quality",
    "artifact_digest.signal_digest",
}
INTERPRETIVE_TRACE_LABELS = {
    "priority_levers",
    "coaching_focus",
    "next_actions",
    "strengths",
    "weaknesses",
    "confidence_and_limits",
    "artifact_digest.report_digest",
}


@dataclass(slots=True)
class ContextualChatService:
    reports: ReportRepository
    profiles: RiotProfileRepository
    analytics: AnalyticsRepository
    openai_chat: OpenAIContextualChatClient

    def create_reply(self, *, user_id: int, payload: CreateContextualChatReplyRequest) -> dict[str, object]:
        profile = self._get_owned_profile(user_id=user_id, riot_profile_id=payload.riot_profile_id)
        report_run = self.reports.get_owned_run(user_id=user_id, run_id=payload.report_run_id)
        if report_run is None or report_run.riot_profile_id != profile.id:
            raise ContextualChatNotFoundError("Report run not found for this Riot profile.")
        if report_run.status != RUN_STATUS_COMPLETED:
            raise ContextualChatValidationError("Report run must be completed before contextual chat is available.")

        artifact = self.reports.get_owned_artifact(user_id=user_id, run_id=payload.report_run_id)
        if artifact is None:
            raise ContextualChatNotFoundError("Displayed report artifact not found for this user.")

        if payload.messages[-1].role != "user":
            raise ContextualChatValidationError("The last chat message must come from the user.")

        try:
            report_input = ReportInputContract.model_validate_json(artifact.report_input_json)
            report_output = ReportOutput.model_validate_json(artifact.report_output_json)
        except ValidationError as exc:
            raise ContextualChatValidationError("Displayed report artifact is invalid.") from exc
        latest_completed_analytics = self.analytics.get_latest_completed_run_for_profile(
            user_id=user_id,
            riot_profile_id=profile.id
        )
        grounding = ContextualChatGrounding(
            riot_profile_id=profile.id,
            report_run_id=artifact.report_run_id,
            analytics_run_id=artifact.analytics_run_id,
            analytics_version=artifact.analytics_version,
            report_version=artifact.report_version,
            source_snapshot_type=artifact.source_snapshot_type,
            context_status="current"
            if latest_completed_analytics is not None and latest_completed_analytics.id == artifact.analytics_run_id
            else "stale",
            latest_completed_analytics_run_id=latest_completed_analytics.id if latest_completed_analytics is not None else None
        )

        prompt_asset = load_prompt_asset()
        artifact_digest = build_artifact_digest(
            profile=profile,
            grounding=grounding,
            report_input=report_input,
            report_output=report_output
        )
        reply = self.openai_chat.generate_reply(
            chat_version=CHAT_VERSION,
            system_prompt=prompt_asset.system_prompt,
            profile=profile,
            grounding=grounding,
            artifact_digest=artifact_digest,
            report_input=report_input,
            report_output=report_output,
            messages=payload.messages
        )
        reply = self._apply_deterministic_limits(reply=reply, grounding=grounding)

        return {
            "grounding": grounding,
            "reply": reply
        }

    def _get_owned_profile(self, *, user_id: int, riot_profile_id: int) -> RiotProfile:
        profile = self.profiles.get_owned_by_id(user_id=user_id, profile_id=riot_profile_id)
        if profile is None:
            raise ContextualChatNotFoundError("Riot profile not found for this user.")
        return profile

    @staticmethod
    def _apply_deterministic_limits(
        *,
        reply: ContextualChatReply,
        grounding: ContextualChatGrounding
    ) -> ContextualChatReply:
        limitation_points = list(reply.limitation_points)
        evidence_mode = _derive_evidence_mode(reply.trace_labels)
        if grounding.context_status == "stale":
            stale_notice = (
                f"This answer is grounded in displayed report #{grounding.report_run_id} on analytics run "
                f"#{grounding.analytics_run_id}, while newer analytics run #{grounding.latest_completed_analytics_run_id} exists upstream."
                if grounding.latest_completed_analytics_run_id is not None
                else f"This answer is grounded in displayed report #{grounding.report_run_id}, but its upstream freshness could not be confirmed."
            )
            if stale_notice not in limitation_points:
                limitation_points.append(stale_notice)

        return ContextualChatReply(
            answer_mode="limited" if grounding.context_status == "stale" else reply.answer_mode,
            evidence_mode=evidence_mode,
            scope_note=(
                f"Bound to displayed report #{grounding.report_run_id} and analytics #{grounding.analytics_run_id}; newer upstream analytics exist."
                if grounding.context_status == "stale"
                else reply.scope_note
            ),
            trace_labels=reply.trace_labels,
            answer=reply.answer,
            evidence_points=reply.evidence_points,
            limitation_points=limitation_points,
            suggested_follow_up=reply.suggested_follow_up
        )


def build_contextual_chat_service(
    reports: ReportRepository = Depends(build_report_repository),
    profiles: RiotProfileRepository = Depends(build_riot_profile_repository),
    analytics: AnalyticsRepository = Depends(build_analytics_repository),
    openai_chat: OpenAIContextualChatClient = Depends(build_openai_contextual_chat_client)
) -> ContextualChatService:
    return ContextualChatService(
        reports=reports,
        profiles=profiles,
        analytics=analytics,
        openai_chat=openai_chat
    )


def _derive_evidence_mode(trace_labels: list[str]) -> str:
    uses_deterministic = any(label in DETERMINISTIC_TRACE_LABELS for label in trace_labels)
    uses_interpretive = any(label in INTERPRETIVE_TRACE_LABELS for label in trace_labels)
    if uses_deterministic and uses_interpretive:
        return "mixed"
    if uses_deterministic:
        return "deterministic"
    return "interpretive"

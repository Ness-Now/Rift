import json
from dataclasses import dataclass

from api_service.contextual_chat.contracts import (
    ContextualChatGrounding,
    ContextualChatMessage,
    ContextualChatReply
)
from api_service.contextual_chat.errors import ContextualChatValidationError
from api_service.core.config import Settings, get_settings
from api_service.reports.contracts import ReportInputContract, ReportOutput
from api_service.riot_profiles.models import RiotProfile
from fastapi import Depends


@dataclass(slots=True)
class OpenAIContextualChatClient:
    api_key: str
    model: str
    timeout_seconds: int

    def generate_reply(
        self,
        *,
        chat_version: str,
        system_prompt: str,
        profile: RiotProfile,
        grounding: ContextualChatGrounding,
        report_input: ReportInputContract,
        report_output: ReportOutput,
        messages: list[ContextualChatMessage]
    ) -> ContextualChatReply:
        if self.api_key == "":
            raise ContextualChatValidationError("OPENAI_API_KEY is not configured.")

        try:
            from openai import OpenAI
        except ImportError as exc:
            raise ContextualChatValidationError("The OpenAI Python package is not installed.") from exc

        client = OpenAI(api_key=self.api_key, timeout=float(self.timeout_seconds))
        payload = {
            "chat_version": chat_version,
            "grounding": grounding.model_dump(mode="json"),
            "profile": {
                "riot_id_display": profile.riot_id_display,
                "region": profile.region,
                "platform_region": profile.platform_region,
                "account_region_routing": profile.account_region_routing
            },
            "displayed_report_input": report_input.model_dump(mode="json"),
            "displayed_report_output": report_output.model_dump(mode="json"),
            "conversation": [message.model_dump(mode="json") for message in messages]
        }

        try:
            response = client.responses.create(
                model=self.model,
                instructions=system_prompt,
                input=json.dumps(payload, separators=(",", ":"), sort_keys=True),
                text={
                    "format": {
                        "type": "json_schema",
                        "name": "contextual_chat_reply_v1",
                        "strict": True,
                        "schema": ContextualChatReply.model_json_schema()
                    }
                }
            )
        except Exception as exc:
            raise ContextualChatValidationError(f"OpenAI contextual chat failed: {exc}") from exc

        output_text = getattr(response, "output_text", "")
        if not isinstance(output_text, str) or output_text.strip() == "":
            raise ContextualChatValidationError("OpenAI returned an empty contextual chat reply.")

        try:
            parsed = json.loads(output_text)
        except json.JSONDecodeError as exc:
            raise ContextualChatValidationError("OpenAI returned invalid contextual chat JSON.") from exc

        return ContextualChatReply.model_validate(parsed)


def build_openai_contextual_chat_client(
    settings: Settings = Depends(get_settings)
) -> OpenAIContextualChatClient:
    return OpenAIContextualChatClient(
        api_key=settings.openai_api_key,
        model=settings.openai_chat_model,
        timeout_seconds=settings.openai_api_timeout_seconds
    )

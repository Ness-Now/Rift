import json
from dataclasses import dataclass

from api_service.core.config import Settings, get_settings
from api_service.reports.contracts import ReportInputContract, ReportOutput
from api_service.reports.errors import ReportValidationError
from fastapi import Depends


@dataclass(slots=True)
class OpenAIReportClient:
    api_key: str
    model: str
    timeout_seconds: int

    def generate_report(
        self,
        *,
        report_version: str,
        system_prompt: str,
        report_input: ReportInputContract
    ) -> ReportOutput:
        if self.api_key == "":
            raise ReportValidationError("OPENAI_API_KEY is not configured.")

        try:
            from openai import OpenAI
        except ImportError as exc:
            raise ReportValidationError("The OpenAI Python package is not installed.") from exc

        client = OpenAI(api_key=self.api_key, timeout=float(self.timeout_seconds))
        payload = {
            "report_version": report_version,
            "report_input": report_input.model_dump(mode="json")
        }

        try:
            response = client.responses.create(
                model=self.model,
                instructions=system_prompt,
                input=json.dumps(payload, separators=(",", ":"), sort_keys=True),
                text={
                    "format": {
                        "type": "json_schema",
                        "name": "player_report_output_v1",
                        "strict": True,
                        "schema": ReportOutput.model_json_schema()
                    }
                }
            )
        except Exception as exc:
            raise ReportValidationError(f"OpenAI report generation failed: {exc}") from exc

        output_text = getattr(response, "output_text", "")
        if not isinstance(output_text, str) or output_text.strip() == "":
            raise ReportValidationError("OpenAI returned an empty structured report.")

        try:
            parsed = json.loads(output_text)
        except json.JSONDecodeError as exc:
            raise ReportValidationError("OpenAI returned invalid report JSON.") from exc

        return ReportOutput.model_validate(parsed)


def build_openai_report_client(
    settings: Settings = Depends(get_settings)
) -> OpenAIReportClient:
    return OpenAIReportClient(
        api_key=settings.openai_api_key,
        model=settings.openai_report_model,
        timeout_seconds=settings.openai_api_timeout_seconds
    )

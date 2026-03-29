from dataclasses import dataclass
from pathlib import Path

from api_service.reports.errors import ReportValidationError


PROMPT_ID = "player-report"
PROMPT_VERSION = "v1"


@dataclass(slots=True)
class PromptAsset:
    prompt_id: str
    prompt_version: str
    metadata: dict[str, str]
    system_prompt: str


def load_prompt_asset() -> PromptAsset:
    prompt_directory = (
        Path(__file__).resolve().parents[5]
        / "packages"
        / "prompts"
        / PROMPT_ID
        / PROMPT_VERSION
    )
    metadata_path = prompt_directory / "metadata.yml"
    system_path = prompt_directory / "system.md"

    if not metadata_path.exists() or not system_path.exists():
        raise ReportValidationError("Report prompt assets are missing.")

    metadata = _parse_flat_metadata(metadata_path.read_text(encoding="utf-8"))
    system_prompt = system_path.read_text(encoding="utf-8").strip()
    if system_prompt == "":
        raise ReportValidationError("Report system prompt is empty.")

    return PromptAsset(
        prompt_id=metadata.get("id", PROMPT_ID),
        prompt_version=metadata.get("version", PROMPT_VERSION),
        metadata=metadata,
        system_prompt=system_prompt
    )


def _parse_flat_metadata(content: str) -> dict[str, str]:
    metadata: dict[str, str] = {}
    for line in content.splitlines():
        stripped = line.strip()
        if stripped == "" or stripped.startswith("#"):
            continue
        key, separator, value = stripped.partition(":")
        if separator == "":
            continue
        metadata[key.strip()] = value.strip()
    return metadata

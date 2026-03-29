import json
import time
from dataclasses import dataclass
from urllib import error, parse, request

from api_service.core.config import Settings, get_settings
from api_service.ingestion.errors import (
    IngestionExternalError,
    IngestionValidationError
)
from fastapi import Depends


@dataclass(slots=True)
class MatchIdBatch:
    match_ids: list[str]


@dataclass(slots=True)
class RiotMatchClient:
    api_key: str
    timeout_seconds: int
    max_retries: int
    retry_backoff_seconds: float

    def get_match_ids(
        self,
        *,
        puuid: str,
        regional_routing: str,
        count: int,
        queue_id: int
    ) -> MatchIdBatch:
        encoded_puuid = parse.quote(puuid, safe="")
        url = (
            f"https://{regional_routing.lower()}.api.riotgames.com"
            f"/lol/match/v5/matches/by-puuid/{encoded_puuid}/ids"
            f"?start=0&count={count}&queue={queue_id}"
        )
        payload = self._get_json(url)
        return MatchIdBatch(match_ids=[str(match_id) for match_id in payload])

    def get_match_detail(self, *, regional_routing: str, match_id: str) -> dict[str, object]:
        encoded_match_id = parse.quote(match_id, safe="")
        url = (
            f"https://{regional_routing.lower()}.api.riotgames.com"
            f"/lol/match/v5/matches/{encoded_match_id}"
        )
        payload = self._get_json(url)
        if not isinstance(payload, dict):
            raise IngestionExternalError("Riot match detail returned an unexpected payload.")
        return payload

    def get_match_timeline(self, *, regional_routing: str, match_id: str) -> dict[str, object]:
        encoded_match_id = parse.quote(match_id, safe="")
        url = (
            f"https://{regional_routing.lower()}.api.riotgames.com"
            f"/lol/match/v5/matches/{encoded_match_id}/timeline"
        )
        payload = self._get_json(url)
        if not isinstance(payload, dict):
            raise IngestionExternalError("Riot timeline returned an unexpected payload.")
        return payload

    def _get_json(self, url: str) -> object:
        if not self.api_key:
            raise IngestionValidationError("RIOT_API_KEY is not configured.")

        last_error: Exception | None = None
        for attempt in range(self.max_retries + 1):
            riot_request = request.Request(url, headers={"X-Riot-Token": self.api_key})
            try:
                with request.urlopen(riot_request, timeout=self.timeout_seconds) as response:
                    return json.loads(response.read().decode("utf-8"))
            except error.HTTPError as exc:
                if exc.code in (401, 403):
                    raise IngestionValidationError("Riot API credentials were rejected.") from exc
                if exc.code == 404:
                    raise IngestionExternalError("Riot returned a missing match resource.", status_code=502) from exc

                if exc.code == 429:
                    last_error = exc
                    if attempt == self.max_retries:
                        break

                    retry_after = exc.headers.get("Retry-After")
                    delay = _parse_retry_after(retry_after, fallback=self.retry_backoff_seconds)
                    time.sleep(delay)
                    continue

                if exc.code >= 500:
                    last_error = exc
                    if attempt == self.max_retries:
                        break
                    time.sleep(self.retry_backoff_seconds * (attempt + 1))
                    continue

                raise IngestionExternalError("Riot API request failed.", status_code=502) from exc
            except error.URLError as exc:
                last_error = exc
                if attempt == self.max_retries:
                    break
                time.sleep(self.retry_backoff_seconds * (attempt + 1))

        raise IngestionExternalError(
            "Riot API request failed after bounded retries."
        ) from last_error


def _parse_retry_after(value: str | None, *, fallback: float) -> float:
    if value is None:
        return fallback

    try:
        seconds = float(value)
    except ValueError:
        return fallback

    return max(seconds, 0.0)


def build_riot_match_client(
    settings: Settings = Depends(get_settings)
) -> RiotMatchClient:
    return RiotMatchClient(
        api_key=settings.riot_api_key,
        timeout_seconds=settings.riot_api_timeout_seconds,
        max_retries=settings.riot_api_max_retries,
        retry_backoff_seconds=settings.riot_api_retry_backoff_seconds
    )

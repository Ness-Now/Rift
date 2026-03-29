import json
from dataclasses import dataclass
from urllib import error, parse, request

from api_service.core.config import Settings, get_settings
from api_service.riot_profiles.errors import (
    RiotApiUnavailableError,
    RiotConfigurationError,
    RiotProfileNotFoundError
)
from api_service.riot_profiles.routing import RiotRegionRouting
from fastapi import Depends


@dataclass(slots=True)
class ResolvedRiotAccount:
    game_name: str
    tag_line: str
    puuid: str


@dataclass(slots=True)
class RiotAccountClient:
    api_key: str
    timeout_seconds: int

    def resolve_by_riot_id(
        self,
        *,
        routing: RiotRegionRouting,
        game_name: str,
        tag_line: str
    ) -> ResolvedRiotAccount:
        if not self.api_key:
            raise RiotConfigurationError("RIOT_API_KEY is not configured.")

        encoded_game_name = parse.quote(game_name, safe="")
        encoded_tag_line = parse.quote(tag_line, safe="")
        url = (
            f"https://{routing.account_region_routing.lower()}.api.riotgames.com"
            f"/riot/account/v1/accounts/by-riot-id/{encoded_game_name}/{encoded_tag_line}"
        )
        riot_request = request.Request(
            url,
            headers={"X-Riot-Token": self.api_key}
        )

        try:
            with request.urlopen(riot_request, timeout=self.timeout_seconds) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except error.HTTPError as exc:
            if exc.code == 404:
                raise RiotProfileNotFoundError(
                    "Riot profile was not found for that Riot ID and region."
                ) from exc
            if exc.code in (401, 403):
                raise RiotConfigurationError("Riot API credentials were rejected.") from exc
            if exc.code == 429:
                raise RiotApiUnavailableError(
                    "Riot API rate limit reached. Try again shortly.",
                    status_code=503
                ) from exc
            raise RiotApiUnavailableError("Riot API request failed.") from exc
        except error.URLError as exc:
            raise RiotApiUnavailableError("Unable to reach Riot API.") from exc

        return ResolvedRiotAccount(
            game_name=str(payload["gameName"]),
            tag_line=str(payload["tagLine"]),
            puuid=str(payload["puuid"])
        )


def build_riot_account_client(
    settings: Settings = Depends(get_settings)
) -> RiotAccountClient:
    return RiotAccountClient(
        api_key=settings.riot_api_key,
        timeout_seconds=settings.riot_api_timeout_seconds
    )

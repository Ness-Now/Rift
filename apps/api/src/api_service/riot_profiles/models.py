from dataclasses import dataclass


@dataclass(slots=True)
class ParsedRiotId:
    game_name: str
    tag_line: str


@dataclass(slots=True)
class RiotProfile:
    id: int
    user_id: int
    game_name: str
    tag_line: str
    riot_id_display: str
    riot_id_norm: str
    region: str
    puuid: str
    account_region_routing: str
    platform_region: str
    is_primary: bool
    created_at: str
    updated_at: str
    last_verified_at: str


@dataclass(slots=True)
class CreateRiotProfileInput:
    user_id: int
    game_name: str
    tag_line: str
    riot_id_display: str
    riot_id_norm: str
    region: str
    puuid: str
    account_region_routing: str
    platform_region: str
    is_primary: bool


@dataclass(slots=True)
class UpdateVerificationInput:
    game_name: str
    tag_line: str
    riot_id_display: str
    riot_id_norm: str

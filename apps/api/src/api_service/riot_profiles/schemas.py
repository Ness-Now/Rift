from api_service.riot_profiles.models import RiotProfile
from pydantic import BaseModel, ConfigDict, Field


class CreateRiotProfileRequest(BaseModel):
    riot_id: str = Field(min_length=7, max_length=64)
    region: str = Field(min_length=2, max_length=8)


class RiotProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

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

    @classmethod
    def from_profile(cls, profile: RiotProfile) -> "RiotProfileResponse":
        return cls.model_validate(profile)

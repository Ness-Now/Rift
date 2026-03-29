import sqlite3
from dataclasses import dataclass

from api_service.riot_profiles.client import RiotAccountClient, build_riot_account_client
from api_service.riot_profiles.errors import (
    RiotProfileConflictError,
    RiotProfileNotFoundError
)
from api_service.riot_profiles.models import (
    CreateRiotProfileInput,
    RiotProfile,
    UpdateVerificationInput
)
from api_service.riot_profiles.parsing import (
    build_riot_id_display,
    build_riot_id_norm,
    parse_riot_id
)
from api_service.riot_profiles.repository import (
    RiotProfileRepository,
    build_riot_profile_repository
)
from api_service.riot_profiles.routing import resolve_riot_region
from api_service.riot_profiles.schemas import CreateRiotProfileRequest
from api_service.users.models import User
from fastapi import Depends


@dataclass(slots=True)
class RiotProfileService:
    profiles: RiotProfileRepository
    riot_accounts: RiotAccountClient

    def create(self, *, user: User, payload: CreateRiotProfileRequest) -> RiotProfile:
        parsed_riot_id = parse_riot_id(payload.riot_id)
        routing = resolve_riot_region(payload.region)
        resolved_account = self.riot_accounts.resolve_by_riot_id(
            routing=routing,
            game_name=parsed_riot_id.game_name,
            tag_line=parsed_riot_id.tag_line
        )
        existing_profile = self.profiles.get_by_puuid(resolved_account.puuid)
        if existing_profile is not None:
            if existing_profile.user_id == user.id:
                raise RiotProfileConflictError(
                    "This Riot profile is already linked to your account."
                )
            raise RiotProfileConflictError(
                "This Riot profile is already owned by another user."
            )

        is_primary = self.profiles.count_by_user_id(user.id) == 0
        try:
            return self.profiles.create(
                CreateRiotProfileInput(
                    user_id=user.id,
                    game_name=resolved_account.game_name,
                    tag_line=resolved_account.tag_line,
                    riot_id_display=build_riot_id_display(
                        game_name=resolved_account.game_name,
                        tag_line=resolved_account.tag_line
                    ),
                    riot_id_norm=build_riot_id_norm(
                        game_name=resolved_account.game_name,
                        tag_line=resolved_account.tag_line
                    ),
                    region=routing.region,
                    puuid=resolved_account.puuid,
                    account_region_routing=routing.account_region_routing,
                    platform_region=routing.platform_region,
                    is_primary=is_primary
                )
            )
        except sqlite3.IntegrityError as exc:
            raise RiotProfileConflictError(
                "This Riot profile could not be linked because it is already owned."
            ) from exc

    def list_for_user(self, *, user_id: int) -> list[RiotProfile]:
        return self.profiles.list_by_user_id(user_id)

    def get_owned(self, *, user_id: int, profile_id: int) -> RiotProfile:
        profile = self.profiles.get_owned_by_id(user_id=user_id, profile_id=profile_id)
        if profile is None:
            raise RiotProfileNotFoundError("Riot profile not found for this user.")
        return profile

    def delete(self, *, user_id: int, profile_id: int) -> None:
        profile = self.get_owned(user_id=user_id, profile_id=profile_id)
        self.profiles.delete_owned(user_id=user_id, profile_id=profile.id)

        if profile.is_primary:
            fallback_profile = self.profiles.get_first_by_user_id(user_id)
            if fallback_profile is not None:
                self.profiles.set_primary(user_id=user_id, profile_id=fallback_profile.id)

    def verify(self, *, user_id: int, profile_id: int) -> RiotProfile:
        profile = self.get_owned(user_id=user_id, profile_id=profile_id)
        routing = resolve_riot_region(profile.region)
        resolved_account = self.riot_accounts.resolve_by_riot_id(
            routing=routing,
            game_name=profile.game_name,
            tag_line=profile.tag_line
        )
        if resolved_account.puuid != profile.puuid:
            raise RiotProfileConflictError(
                "Stored Riot profile no longer resolves to the same PUUID."
            )

        return self.profiles.update_verification(
            profile_id=profile.id,
            payload=UpdateVerificationInput(
                game_name=resolved_account.game_name,
                tag_line=resolved_account.tag_line,
                riot_id_display=build_riot_id_display(
                    game_name=resolved_account.game_name,
                    tag_line=resolved_account.tag_line
                ),
                riot_id_norm=build_riot_id_norm(
                    game_name=resolved_account.game_name,
                    tag_line=resolved_account.tag_line
                )
            )
        )

    def make_primary(self, *, user_id: int, profile_id: int) -> RiotProfile:
        self.get_owned(user_id=user_id, profile_id=profile_id)
        return self.profiles.set_primary(user_id=user_id, profile_id=profile_id)


def build_riot_profile_service(
    profiles: RiotProfileRepository = Depends(build_riot_profile_repository),
    riot_accounts: RiotAccountClient = Depends(build_riot_account_client)
) -> RiotProfileService:
    return RiotProfileService(profiles=profiles, riot_accounts=riot_accounts)

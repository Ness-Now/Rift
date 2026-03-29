from typing import NoReturn

from api_service.auth.dependencies import require_current_user
from api_service.riot_profiles.errors import RiotProfileError
from api_service.riot_profiles.schemas import (
    CreateRiotProfileRequest,
    RiotProfileResponse
)
from api_service.riot_profiles.service import (
    RiotProfileService,
    build_riot_profile_service
)
from api_service.users.models import User
from fastapi import APIRouter, Depends, HTTPException, Response, status

router = APIRouter(prefix="/riot-profiles", tags=["riot-profiles"])


@router.post("", response_model=RiotProfileResponse, status_code=status.HTTP_201_CREATED)
def create_riot_profile(
    payload: CreateRiotProfileRequest,
    user: User = Depends(require_current_user),
    service: RiotProfileService = Depends(build_riot_profile_service)
) -> RiotProfileResponse:
    try:
        profile = service.create(user=user, payload=payload)
    except RiotProfileError as error:
        _raise_http_error(error)

    return RiotProfileResponse.model_validate(profile)


@router.get("", response_model=list[RiotProfileResponse])
def list_riot_profiles(
    user: User = Depends(require_current_user),
    service: RiotProfileService = Depends(build_riot_profile_service)
) -> list[RiotProfileResponse]:
    return [
        RiotProfileResponse.model_validate(profile)
        for profile in service.list_for_user(user_id=user.id)
    ]


@router.get("/{profile_id}", response_model=RiotProfileResponse)
def get_riot_profile(
    profile_id: int,
    user: User = Depends(require_current_user),
    service: RiotProfileService = Depends(build_riot_profile_service)
) -> RiotProfileResponse:
    try:
        profile = service.get_owned(user_id=user.id, profile_id=profile_id)
    except RiotProfileError as error:
        _raise_http_error(error)

    return RiotProfileResponse.model_validate(profile)


@router.delete("/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_riot_profile(
    profile_id: int,
    user: User = Depends(require_current_user),
    service: RiotProfileService = Depends(build_riot_profile_service)
) -> Response:
    try:
        service.delete(user_id=user.id, profile_id=profile_id)
    except RiotProfileError as error:
        _raise_http_error(error)

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{profile_id}/verify", response_model=RiotProfileResponse)
def verify_riot_profile(
    profile_id: int,
    user: User = Depends(require_current_user),
    service: RiotProfileService = Depends(build_riot_profile_service)
) -> RiotProfileResponse:
    try:
        profile = service.verify(user_id=user.id, profile_id=profile_id)
    except RiotProfileError as error:
        _raise_http_error(error)

    return RiotProfileResponse.model_validate(profile)


@router.post("/{profile_id}/make-primary", response_model=RiotProfileResponse)
def make_primary_riot_profile(
    profile_id: int,
    user: User = Depends(require_current_user),
    service: RiotProfileService = Depends(build_riot_profile_service)
) -> RiotProfileResponse:
    try:
        profile = service.make_primary(user_id=user.id, profile_id=profile_id)
    except RiotProfileError as error:
        _raise_http_error(error)

    return RiotProfileResponse.model_validate(profile)


def _raise_http_error(error: RiotProfileError) -> NoReturn:
    raise HTTPException(status_code=error.status_code, detail=error.detail)

from api_service.riot_profiles.errors import RiotProfileValidationError
from api_service.riot_profiles.models import ParsedRiotId


def parse_riot_id(value: str) -> ParsedRiotId:
    candidate = value.strip()
    if candidate.count("#") != 1:
        raise RiotProfileValidationError(
            "Riot ID must use the format GameName#TagLine."
        )

    game_name, tag_line = candidate.split("#", maxsplit=1)
    game_name = game_name.strip()
    tag_line = tag_line.strip()

    if not game_name or not tag_line:
        raise RiotProfileValidationError(
            "Riot ID must include both game name and tag line."
        )

    if len(game_name) > 16:
        raise RiotProfileValidationError("Game name must be 16 characters or fewer.")

    if len(tag_line) > 5:
        raise RiotProfileValidationError("Tag line must be 5 characters or fewer.")

    return ParsedRiotId(game_name=game_name, tag_line=tag_line)


def build_riot_id_display(*, game_name: str, tag_line: str) -> str:
    return f"{game_name}#{tag_line}"


def build_riot_id_norm(*, game_name: str, tag_line: str) -> str:
    return f"{game_name.casefold()}#{tag_line.casefold()}"

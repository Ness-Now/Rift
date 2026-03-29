import json
from datetime import UTC, datetime

from api_service.normalization.errors import NormalizationValidationError
from api_service.normalization.models import (
    CanonicalRawMatchSource,
    EventCleanRecord,
    MatchCleanRecord,
    ParticipantCleanRecord,
    TeamCleanRecord,
    TimelineCleanRecord
)


def normalize_canonical_source(
    *,
    source: CanonicalRawMatchSource,
    player_puuid: str
) -> tuple[
    MatchCleanRecord,
    list[ParticipantCleanRecord],
    list[TeamCleanRecord],
    list[TimelineCleanRecord],
    list[EventCleanRecord]
]:
    match_payload = _load_json_object(source.raw_match_json)
    timeline_payload = _load_json_object(source.raw_timeline_json)

    info = _expect_dict(match_payload.get("info"), "Match payload info is missing.")
    metadata = _expect_dict(match_payload.get("metadata"), "Match payload metadata is missing.")
    participants = _expect_list_of_dicts(info.get("participants"), "Match participants are missing.")
    teams = _expect_list_of_dicts(info.get("teams"), "Match teams are missing.")

    target_participant = _find_target_participant(participants=participants, player_puuid=player_puuid)
    target_participant_id = _int_or_none(target_participant.get("participantId"))
    if target_participant_id is None:
        raise NormalizationValidationError("Target participant id is missing.")

    duration_seconds = _duration_seconds(info.get("gameDuration"))
    timeline_frames = _timeline_frames(timeline_payload)
    timeline_available = len(timeline_frames) > 0
    role_opponent = _find_role_opponent(
        participants=participants,
        target_participant=target_participant
    )
    target_runes = _extract_runes(target_participant)

    match_record = MatchCleanRecord(
        match_id=source.match_id,
        riot_profile_id=source.riot_profile_id,
        user_id=source.user_id,
        queue_id=_int_or_none(info.get("queueId")),
        map_id=_int_or_none(info.get("mapId")),
        game_mode=_str_or_none(info.get("gameMode")),
        game_type=_str_or_none(info.get("gameType")),
        game_version=_str_or_none(info.get("gameVersion")) or source.game_version,
        platform_id=_str_or_none(metadata.get("platformId")) or source.platform_id,
        game_creation_utc=_epoch_ms_to_utc_string(info.get("gameCreation")),
        game_start_utc=_epoch_ms_to_utc_string(info.get("gameStartTimestamp")),
        game_end_utc=_game_end_utc(info=info, duration_seconds=duration_seconds),
        duration_seconds=duration_seconds,
        player_puuid=player_puuid,
        player_participant_id=target_participant_id,
        player_team_id=_require_int(target_participant.get("teamId"), "Target team id is missing."),
        player_side=_side_from_team_id(_require_int(target_participant.get("teamId"), "Target team id is missing.")),
        win=bool(target_participant.get("win")),
        champion_name=_str_or_none(target_participant.get("championName")),
        champion_id=_int_or_none(target_participant.get("championId")),
        team_position=_clean_position(target_participant.get("teamPosition")),
        individual_position=_clean_position(target_participant.get("individualPosition")),
        lane=_str_or_none(target_participant.get("lane")),
        role=_str_or_none(target_participant.get("role")),
        kills=_int_or_none(target_participant.get("kills")),
        deaths=_int_or_none(target_participant.get("deaths")),
        assists=_int_or_none(target_participant.get("assists")),
        kda_calc=_kda(target_participant),
        gold_earned=_int_or_none(target_participant.get("goldEarned")),
        gold_spent=_int_or_none(target_participant.get("goldSpent")),
        cs_total=_cs_total(target_participant),
        cs_per_min_calc=_per_minute(_cs_total(target_participant), duration_seconds),
        vision_score=_int_or_none(target_participant.get("visionScore")),
        vision_per_min_calc=_per_minute(_int_or_none(target_participant.get("visionScore")), duration_seconds),
        total_damage_dealt_to_champions=_int_or_none(target_participant.get("totalDamageDealtToChampions")),
        dpm_calc=_per_minute(_int_or_none(target_participant.get("totalDamageDealtToChampions")), duration_seconds),
        total_damage_taken=_int_or_none(target_participant.get("totalDamageTaken")),
        damage_dealt_to_objectives=_int_or_none(target_participant.get("damageDealtToObjectives")),
        damage_dealt_to_buildings=_int_or_none(target_participant.get("damageDealtToBuildings")),
        dragon_kills=_int_or_none(target_participant.get("dragonKills")),
        baron_kills=_int_or_none(target_participant.get("baronKills")),
        turret_kills=_int_or_none(target_participant.get("turretKills")),
        inhibitor_kills=_int_or_none(target_participant.get("inhibitorKills")),
        summoner1_id=_int_or_none(target_participant.get("summoner1Id")),
        summoner2_id=_int_or_none(target_participant.get("summoner2Id")),
        item0=_int_or_none(target_participant.get("item0")),
        item1=_int_or_none(target_participant.get("item1")),
        item2=_int_or_none(target_participant.get("item2")),
        item3=_int_or_none(target_participant.get("item3")),
        item4=_int_or_none(target_participant.get("item4")),
        item5=_int_or_none(target_participant.get("item5")),
        item6=_int_or_none(target_participant.get("item6")),
        perk_primary_style=target_runes["primary_style"],
        perk_sub_style=target_runes["sub_style"],
        perk_primary_selection_1=target_runes["primary_1"],
        perk_primary_selection_2=target_runes["primary_2"],
        perk_primary_selection_3=target_runes["primary_3"],
        perk_primary_selection_4=target_runes["primary_4"],
        perk_sub_selection_1=target_runes["sub_1"],
        perk_sub_selection_2=target_runes["sub_2"],
        role_opp_participant_id=_int_or_none(role_opponent.get("participantId")) if role_opponent else None,
        role_opp_puuid=_str_or_none(role_opponent.get("puuid")) if role_opponent else None,
        role_opp_champion_name=_str_or_none(role_opponent.get("championName")) if role_opponent else None,
        role_opp_champion_id=_int_or_none(role_opponent.get("championId")) if role_opponent else None,
        timeline_available=timeline_available,
        raw_source_run_id=source.raw_source_run_id,
        raw_source_payload_id=source.raw_source_payload_id
    )

    participant_rows = [
        _build_participant_record(
            participant=participant,
            duration_seconds=duration_seconds,
            match_id=source.match_id,
            riot_profile_id=source.riot_profile_id,
            target_puuid=player_puuid,
            target_team_id=_require_int(target_participant.get("teamId"), "Target team id is missing.")
        )
        for participant in participants
    ]
    team_rows = _build_team_records(
        match_id=source.match_id,
        riot_profile_id=source.riot_profile_id,
        teams=teams,
        participants=participants
    )
    timeline_rows = _build_timeline_rows(
        match_id=source.match_id,
        riot_profile_id=source.riot_profile_id,
        timeline_frames=timeline_frames
    )
    event_rows = _build_event_rows(
        match_id=source.match_id,
        riot_profile_id=source.riot_profile_id,
        timeline_frames=timeline_frames,
        target_participant_id=target_participant_id
    )
    return match_record, participant_rows, team_rows, timeline_rows, event_rows


def _build_participant_record(
    *,
    participant: dict[str, object],
    duration_seconds: float | None,
    match_id: str,
    riot_profile_id: int,
    target_puuid: str,
    target_team_id: int
) -> ParticipantCleanRecord:
    runes = _extract_runes(participant)
    team_id = _require_int(participant.get("teamId"), "Participant team id is missing.")
    puuid = _str_or_none(participant.get("puuid"))
    relation_to_target = "self" if puuid == target_puuid else ("ally" if team_id == target_team_id else "enemy")
    return ParticipantCleanRecord(
        match_id=match_id,
        riot_profile_id=riot_profile_id,
        participant_id=_require_int(participant.get("participantId"), "Participant id is missing."),
        puuid=puuid,
        riot_id=_participant_riot_id(participant),
        side=_side_from_team_id(team_id),
        team_id=team_id,
        win=bool(participant.get("win")),
        champion_name=_str_or_none(participant.get("championName")),
        champion_id=_int_or_none(participant.get("championId")),
        team_position=_clean_position(participant.get("teamPosition")),
        individual_position=_clean_position(participant.get("individualPosition")),
        kills=_int_or_none(participant.get("kills")),
        deaths=_int_or_none(participant.get("deaths")),
        assists=_int_or_none(participant.get("assists")),
        kda_calc=_kda(participant),
        gold_earned=_int_or_none(participant.get("goldEarned")),
        gold_spent=_int_or_none(participant.get("goldSpent")),
        cs_total=_cs_total(participant),
        cs_per_min_calc=_per_minute(_cs_total(participant), duration_seconds),
        vision_score=_int_or_none(participant.get("visionScore")),
        vision_per_min_calc=_per_minute(_int_or_none(participant.get("visionScore")), duration_seconds),
        total_damage_dealt_to_champions=_int_or_none(participant.get("totalDamageDealtToChampions")),
        dpm_calc=_per_minute(_int_or_none(participant.get("totalDamageDealtToChampions")), duration_seconds),
        total_damage_taken=_int_or_none(participant.get("totalDamageTaken")),
        damage_dealt_to_objectives=_int_or_none(participant.get("damageDealtToObjectives")),
        damage_dealt_to_buildings=_int_or_none(participant.get("damageDealtToBuildings")),
        dragon_kills=_int_or_none(participant.get("dragonKills")),
        baron_kills=_int_or_none(participant.get("baronKills")),
        turret_kills=_int_or_none(participant.get("turretKills")),
        inhibitor_kills=_int_or_none(participant.get("inhibitorKills")),
        summoner1_id=_int_or_none(participant.get("summoner1Id")),
        summoner2_id=_int_or_none(participant.get("summoner2Id")),
        item0=_int_or_none(participant.get("item0")),
        item1=_int_or_none(participant.get("item1")),
        item2=_int_or_none(participant.get("item2")),
        item3=_int_or_none(participant.get("item3")),
        item4=_int_or_none(participant.get("item4")),
        item5=_int_or_none(participant.get("item5")),
        item6=_int_or_none(participant.get("item6")),
        perk_primary_style=runes["primary_style"],
        perk_sub_style=runes["sub_style"],
        perk_primary_selection_1=runes["primary_1"],
        perk_primary_selection_2=runes["primary_2"],
        perk_primary_selection_3=runes["primary_3"],
        perk_primary_selection_4=runes["primary_4"],
        perk_sub_selection_1=runes["sub_1"],
        perk_sub_selection_2=runes["sub_2"],
        relation_to_target=relation_to_target
    )


def _build_team_records(
    *,
    match_id: str,
    riot_profile_id: int,
    teams: list[dict[str, object]],
    participants: list[dict[str, object]]
) -> list[TeamCleanRecord]:
    rows: list[TeamCleanRecord] = []
    for team in teams:
        team_id = _require_int(team.get("teamId"), "Team id is missing.")
        objectives = _expect_dict(team.get("objectives"), "Team objectives are missing.")
        team_participants = [participant for participant in participants if _int_or_none(participant.get("teamId")) == team_id]
        champion_kills_sum = sum(_int_or_none(participant.get("kills")) or 0 for participant in team_participants)
        rows.append(
            TeamCleanRecord(
                match_id=match_id,
                riot_profile_id=riot_profile_id,
                team_id=team_id,
                side=_side_from_team_id(team_id),
                win=bool(team.get("win")),
                bans_json=json.dumps(_sanitize_bans(team.get("bans")), separators=(",", ":"), sort_keys=True),
                champion_kills_sum=champion_kills_sum,
                baron_first=_objective_flag(objectives, "baron", "first"),
                baron_kills=_objective_int(objectives, "baron", "kills"),
                dragon_first=_objective_flag(objectives, "dragon", "first"),
                dragon_kills=_objective_int(objectives, "dragon", "kills"),
                horde_first=_objective_flag(objectives, "horde", "first"),
                horde_kills=_objective_int(objectives, "horde", "kills"),
                herald_first=_objective_flag(objectives, "riftHerald", "first"),
                herald_kills=_objective_int(objectives, "riftHerald", "kills"),
                inhibitor_first=_objective_flag(objectives, "inhibitor", "first"),
                inhibitor_kills=_objective_int(objectives, "inhibitor", "kills"),
                tower_first=_objective_flag(objectives, "tower", "first"),
                tower_kills=_objective_int(objectives, "tower", "kills"),
                champion_first=_objective_flag(objectives, "champion", "first")
            )
        )
    return rows


def _build_timeline_rows(
    *,
    match_id: str,
    riot_profile_id: int,
    timeline_frames: list[dict[str, object]]
) -> list[TimelineCleanRecord]:
    rows: list[TimelineCleanRecord] = []
    for frame in timeline_frames:
        participant_frames = _expect_dict(frame.get("participantFrames"), "Timeline participant frames are missing.")
        timestamp_ms = _require_int(frame.get("timestamp"), "Timeline frame timestamp is missing.")
        for key, participant_frame in participant_frames.items():
            participant_frame_dict = _expect_dict(participant_frame, "Timeline participant frame is invalid.")
            rows.append(
                TimelineCleanRecord(
                    match_id=match_id,
                    riot_profile_id=riot_profile_id,
                    participant_id=int(key),
                    frame_timestamp_ms=timestamp_ms,
                    total_gold=_int_or_none(participant_frame_dict.get("totalGold")),
                    current_gold=_int_or_none(participant_frame_dict.get("currentGold")),
                    level=_int_or_none(participant_frame_dict.get("level")),
                    xp=_int_or_none(participant_frame_dict.get("xp")),
                    minions_killed=_int_or_none(participant_frame_dict.get("minionsKilled")),
                    jungle_minions_killed=_int_or_none(participant_frame_dict.get("jungleMinionsKilled")),
                    position_x=_position_int(participant_frame_dict.get("position"), "x"),
                    position_y=_position_int(participant_frame_dict.get("position"), "y")
                )
            )
    return rows


def _build_event_rows(
    *,
    match_id: str,
    riot_profile_id: int,
    timeline_frames: list[dict[str, object]],
    target_participant_id: int
) -> list[EventCleanRecord]:
    rows: list[EventCleanRecord] = []
    for frame in timeline_frames:
        events = _expect_list_of_dicts(frame.get("events"), "Timeline events are missing.")
        for event in events:
            assisting_ids = _int_list(event.get("assistingParticipantIds"))
            participant_id = _int_or_none(event.get("participantId")) or _int_or_none(event.get("creatorId"))
            killer_id = _int_or_none(event.get("killerId"))
            victim_id = _int_or_none(event.get("victimId"))
            player_involved = target_participant_id in {
                participant_id,
                killer_id,
                victim_id,
                _int_or_none(event.get("creatorId"))
            } or target_participant_id in assisting_ids
            rows.append(
                EventCleanRecord(
                    match_id=match_id,
                    riot_profile_id=riot_profile_id,
                    timestamp_ms=_require_int(event.get("timestamp"), "Event timestamp is missing."),
                    event_type=_str_or_none(event.get("type")) or "UNKNOWN",
                    participant_id=participant_id,
                    killer_id=killer_id,
                    victim_id=victim_id,
                    assisting_participant_ids_json=json.dumps(assisting_ids) if assisting_ids else None,
                    team_id=_int_or_none(event.get("teamId")),
                    lane_type=_str_or_none(event.get("laneType")),
                    building_type=_str_or_none(event.get("buildingType")),
                    tower_type=_str_or_none(event.get("towerType")),
                    monster_type=_str_or_none(event.get("monsterType")),
                    monster_sub_type=_str_or_none(event.get("monsterSubType")),
                    item_id=_int_or_none(event.get("itemId")),
                    skill_slot=_int_or_none(event.get("skillSlot")),
                    level_up_type=_str_or_none(event.get("levelUpType")),
                    ward_type=_str_or_none(event.get("wardType")),
                    position_x=_position_int(event.get("position"), "x"),
                    position_y=_position_int(event.get("position"), "y"),
                    player_involved=player_involved
                )
            )
    return rows


def _find_target_participant(
    *,
    participants: list[dict[str, object]],
    player_puuid: str
) -> dict[str, object]:
    for participant in participants:
        if _str_or_none(participant.get("puuid")) == player_puuid:
            return participant
    raise NormalizationValidationError("Raw match does not include the owned Riot profile PUUID.")


def _find_role_opponent(
    *,
    participants: list[dict[str, object]],
    target_participant: dict[str, object]
) -> dict[str, object] | None:
    target_position = _clean_position(target_participant.get("teamPosition"))
    if target_position is None:
        return None
    target_team_id = _int_or_none(target_participant.get("teamId"))
    if target_team_id is None:
        return None
    opponents = [
        participant
        for participant in participants
        if _int_or_none(participant.get("teamId")) != target_team_id
        and _clean_position(participant.get("teamPosition")) == target_position
    ]
    return opponents[0] if len(opponents) == 1 else None


def _timeline_frames(timeline_payload: dict[str, object]) -> list[dict[str, object]]:
    timeline_info = _expect_dict(timeline_payload.get("info"), "Timeline payload info is missing.")
    return _expect_list_of_dicts(timeline_info.get("frames"), "Timeline frames are missing.")


def _participant_riot_id(participant: dict[str, object]) -> str | None:
    game_name = _str_or_none(participant.get("riotIdGameName"))
    tag_line = _str_or_none(participant.get("riotIdTagline"))
    if game_name and tag_line:
        return f"{game_name}#{tag_line}"
    return None


def _extract_runes(participant: dict[str, object]) -> dict[str, int | None]:
    perks = _expect_dict(participant.get("perks"), "Participant perks are missing.")
    styles = _expect_list_of_dicts(perks.get("styles"), "Participant perk styles are missing.")
    primary = styles[0] if styles else {}
    sub = styles[1] if len(styles) > 1 else {}
    primary_selections = _expect_list_of_dicts(primary.get("selections") or [], "Primary rune selections are invalid.")
    sub_selections = _expect_list_of_dicts(sub.get("selections") or [], "Sub rune selections are invalid.")
    return {
        "primary_style": _int_or_none(primary.get("style")),
        "sub_style": _int_or_none(sub.get("style")),
        "primary_1": _selection_id(primary_selections, 0),
        "primary_2": _selection_id(primary_selections, 1),
        "primary_3": _selection_id(primary_selections, 2),
        "primary_4": _selection_id(primary_selections, 3),
        "sub_1": _selection_id(sub_selections, 0),
        "sub_2": _selection_id(sub_selections, 1)
    }


def _selection_id(selections: list[dict[str, object]], index: int) -> int | None:
    if index >= len(selections):
        return None
    return _int_or_none(selections[index].get("perk"))


def _sanitize_bans(value: object) -> list[dict[str, int | None]]:
    if not isinstance(value, list):
        return []
    output: list[dict[str, int | None]] = []
    for item in value:
        if not isinstance(item, dict):
            continue
        output.append(
            {
                "championId": _int_or_none(item.get("championId")),
                "pickTurn": _int_or_none(item.get("pickTurn"))
            }
        )
    return output


def _objective_flag(objectives: dict[str, object], key: str, field: str) -> bool | None:
    objective = objectives.get(key)
    if not isinstance(objective, dict):
        return None
    value = objective.get(field)
    return bool(value) if value is not None else None


def _objective_int(objectives: dict[str, object], key: str, field: str) -> int | None:
    objective = objectives.get(key)
    if not isinstance(objective, dict):
        return None
    return _int_or_none(objective.get(field))


def _load_json_object(payload: str) -> dict[str, object]:
    loaded = json.loads(payload)
    if not isinstance(loaded, dict):
        raise NormalizationValidationError("Raw payload is not a JSON object.")
    return loaded


def _expect_dict(value: object, message: str) -> dict[str, object]:
    if not isinstance(value, dict):
        raise NormalizationValidationError(message)
    return value


def _expect_list_of_dicts(value: object, message: str) -> list[dict[str, object]]:
    if not isinstance(value, list):
        raise NormalizationValidationError(message)
    output: list[dict[str, object]] = []
    for item in value:
        if not isinstance(item, dict):
            raise NormalizationValidationError(message)
        output.append(item)
    return output


def _duration_seconds(value: object) -> float | None:
    numeric = _float_or_none(value)
    if numeric is None:
        return None
    if numeric > 100000:
        return round(numeric / 1000, 4)
    return round(numeric, 4)


def _epoch_ms_to_utc_string(value: object) -> str | None:
    timestamp_ms = _int_or_none(value)
    if timestamp_ms is None:
        return None
    return datetime.fromtimestamp(timestamp_ms / 1000, tz=UTC).isoformat().replace("+00:00", "Z")


def _game_end_utc(*, info: dict[str, object], duration_seconds: float | None) -> str | None:
    explicit_end = _epoch_ms_to_utc_string(info.get("gameEndTimestamp"))
    if explicit_end is not None:
        return explicit_end
    start_timestamp = _int_or_none(info.get("gameStartTimestamp"))
    if start_timestamp is None or duration_seconds is None:
        return None
    end_dt = datetime.fromtimestamp((start_timestamp / 1000) + duration_seconds, tz=UTC)
    return end_dt.isoformat().replace("+00:00", "Z")


def _kda(participant: dict[str, object]) -> float | None:
    kills = _int_or_none(participant.get("kills"))
    deaths = _int_or_none(participant.get("deaths"))
    assists = _int_or_none(participant.get("assists"))
    if kills is None or deaths is None or assists is None:
        return None
    if deaths == 0:
        return round(float(kills + assists), 4)
    return round((kills + assists) / deaths, 4)


def _per_minute(value: int | None, duration_seconds: float | None) -> float | None:
    if value is None or duration_seconds is None or duration_seconds <= 0:
        return None
    minutes = duration_seconds / 60
    if minutes <= 0:
        return None
    return round(value / minutes, 4)


def _cs_total(participant: dict[str, object]) -> int | None:
    lane_cs = _int_or_none(participant.get("totalMinionsKilled")) or 0
    neutral_cs = _int_or_none(participant.get("neutralMinionsKilled")) or 0
    return lane_cs + neutral_cs


def _clean_position(value: object) -> str | None:
    position = _str_or_none(value)
    if position in (None, "", "NONE", "INVALID"):
        return None
    return position


def _position_int(position: object, key: str) -> int | None:
    if not isinstance(position, dict):
        return None
    return _int_or_none(position.get(key))


def _side_from_team_id(team_id: int) -> str:
    return "BLUE" if team_id == 100 else "RED"


def _int_or_none(value: object) -> int | None:
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    return None


def _require_int(value: object, message: str) -> int:
    numeric = _int_or_none(value)
    if numeric is None:
        raise NormalizationValidationError(message)
    return numeric


def _float_or_none(value: object) -> float | None:
    if isinstance(value, bool):
        return float(int(value))
    if isinstance(value, (int, float)):
        return float(value)
    return None


def _str_or_none(value: object) -> str | None:
    if value is None:
        return None
    return str(value)


def _int_list(value: object) -> list[int]:
    if not isinstance(value, list):
        return []
    return [item for item in (_int_or_none(entry) for entry in value) if item is not None]

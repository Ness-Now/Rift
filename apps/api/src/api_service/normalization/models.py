from dataclasses import dataclass


@dataclass(slots=True)
class NormalizationRun:
    id: int
    user_id: int
    riot_profile_id: int
    status: str
    started_at: str
    completed_at: str | None
    error_message: str | None
    raw_match_rows_scanned: int
    unique_matches_normalized: int
    participants_rows_written: int
    teams_rows_written: int
    timeline_rows_written: int
    events_rows_written: int


@dataclass(slots=True)
class CreateNormalizationRunInput:
    user_id: int
    riot_profile_id: int
    status: str


@dataclass(slots=True)
class FinalizeNormalizationRunInput:
    status: str
    error_message: str | None
    raw_match_rows_scanned: int
    unique_matches_normalized: int
    participants_rows_written: int
    teams_rows_written: int
    timeline_rows_written: int
    events_rows_written: int


@dataclass(slots=True)
class CanonicalRawMatchSource:
    raw_source_payload_id: int
    raw_source_run_id: int
    riot_profile_id: int
    user_id: int
    match_id: str
    queue_id: int
    game_version: str | None
    platform_id: str | None
    raw_match_json: str
    raw_timeline_json: str
    ingested_at: str


@dataclass(slots=True)
class MatchCleanRecord:
    match_id: str
    riot_profile_id: int
    user_id: int
    queue_id: int | None
    map_id: int | None
    game_mode: str | None
    game_type: str | None
    game_version: str | None
    platform_id: str | None
    game_creation_utc: str | None
    game_start_utc: str | None
    game_end_utc: str | None
    duration_seconds: float | None
    player_puuid: str
    player_participant_id: int
    player_team_id: int
    player_side: str
    win: bool
    champion_name: str | None
    champion_id: int | None
    team_position: str | None
    individual_position: str | None
    lane: str | None
    role: str | None
    kills: int | None
    deaths: int | None
    assists: int | None
    kda_calc: float | None
    gold_earned: int | None
    gold_spent: int | None
    cs_total: int | None
    cs_per_min_calc: float | None
    vision_score: int | None
    vision_per_min_calc: float | None
    total_damage_dealt_to_champions: int | None
    dpm_calc: float | None
    total_damage_taken: int | None
    damage_dealt_to_objectives: int | None
    damage_dealt_to_buildings: int | None
    dragon_kills: int | None
    baron_kills: int | None
    turret_kills: int | None
    inhibitor_kills: int | None
    summoner1_id: int | None
    summoner2_id: int | None
    item0: int | None
    item1: int | None
    item2: int | None
    item3: int | None
    item4: int | None
    item5: int | None
    item6: int | None
    perk_primary_style: int | None
    perk_sub_style: int | None
    perk_primary_selection_1: int | None
    perk_primary_selection_2: int | None
    perk_primary_selection_3: int | None
    perk_primary_selection_4: int | None
    perk_sub_selection_1: int | None
    perk_sub_selection_2: int | None
    role_opp_participant_id: int | None
    role_opp_puuid: str | None
    role_opp_champion_name: str | None
    role_opp_champion_id: int | None
    timeline_available: bool
    raw_source_run_id: int
    raw_source_payload_id: int


@dataclass(slots=True)
class ParticipantCleanRecord:
    match_id: str
    riot_profile_id: int
    participant_id: int
    puuid: str | None
    riot_id: str | None
    side: str
    team_id: int
    win: bool
    champion_name: str | None
    champion_id: int | None
    team_position: str | None
    individual_position: str | None
    kills: int | None
    deaths: int | None
    assists: int | None
    kda_calc: float | None
    gold_earned: int | None
    gold_spent: int | None
    cs_total: int | None
    cs_per_min_calc: float | None
    vision_score: int | None
    vision_per_min_calc: float | None
    total_damage_dealt_to_champions: int | None
    dpm_calc: float | None
    total_damage_taken: int | None
    damage_dealt_to_objectives: int | None
    damage_dealt_to_buildings: int | None
    dragon_kills: int | None
    baron_kills: int | None
    turret_kills: int | None
    inhibitor_kills: int | None
    summoner1_id: int | None
    summoner2_id: int | None
    item0: int | None
    item1: int | None
    item2: int | None
    item3: int | None
    item4: int | None
    item5: int | None
    item6: int | None
    perk_primary_style: int | None
    perk_sub_style: int | None
    perk_primary_selection_1: int | None
    perk_primary_selection_2: int | None
    perk_primary_selection_3: int | None
    perk_primary_selection_4: int | None
    perk_sub_selection_1: int | None
    perk_sub_selection_2: int | None
    relation_to_target: str


@dataclass(slots=True)
class TeamCleanRecord:
    match_id: str
    riot_profile_id: int
    team_id: int
    side: str
    win: bool
    bans_json: str
    champion_kills_sum: int
    baron_first: bool | None
    baron_kills: int | None
    dragon_first: bool | None
    dragon_kills: int | None
    horde_first: bool | None
    horde_kills: int | None
    herald_first: bool | None
    herald_kills: int | None
    inhibitor_first: bool | None
    inhibitor_kills: int | None
    tower_first: bool | None
    tower_kills: int | None
    champion_first: bool | None


@dataclass(slots=True)
class TimelineCleanRecord:
    match_id: str
    riot_profile_id: int
    participant_id: int
    frame_timestamp_ms: int
    total_gold: int | None
    current_gold: int | None
    level: int | None
    xp: int | None
    minions_killed: int | None
    jungle_minions_killed: int | None
    position_x: int | None
    position_y: int | None


@dataclass(slots=True)
class EventCleanRecord:
    match_id: str
    riot_profile_id: int
    timestamp_ms: int
    event_type: str
    participant_id: int | None
    killer_id: int | None
    victim_id: int | None
    assisting_participant_ids_json: str | None
    team_id: int | None
    lane_type: str | None
    building_type: str | None
    tower_type: str | None
    monster_type: str | None
    monster_sub_type: str | None
    item_id: int | None
    skill_slot: int | None
    level_up_type: str | None
    ward_type: str | None
    position_x: int | None
    position_y: int | None
    player_involved: bool

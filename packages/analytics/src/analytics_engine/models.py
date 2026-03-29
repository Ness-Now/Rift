from dataclasses import dataclass


@dataclass(slots=True)
class CleanMatchRecord:
    match_id: str
    riot_profile_id: int
    user_id: int
    win: bool
    champion_name: str | None
    game_creation_utc: str | None
    game_start_utc: str | None
    game_end_utc: str | None
    duration_seconds: float | None
    player_participant_id: int
    player_team_id: int
    player_side: str
    team_position: str | None
    role_opp_participant_id: int | None
    kills: int | None
    deaths: int | None
    assists: int | None
    kda_calc: float | None
    gold_earned: int | None
    cs_total: int | None
    cs_per_min_calc: float | None
    vision_per_min_calc: float | None
    dpm_calc: float | None
    total_damage_dealt_to_champions: int | None
    timeline_available: bool


@dataclass(slots=True)
class CleanParticipantRecord:
    match_id: str
    participant_id: int
    relation_to_target: str
    team_id: int
    side: str
    win: bool
    champion_name: str | None
    team_position: str | None
    kills: int | None
    deaths: int | None
    assists: int | None
    kda_calc: float | None
    gold_earned: int | None
    cs_total: int | None
    total_damage_dealt_to_champions: int | None


@dataclass(slots=True)
class CleanTeamRecord:
    match_id: str
    team_id: int
    side: str
    win: bool
    champion_kills_sum: int
    dragon_kills: int | None
    herald_kills: int | None
    baron_kills: int | None
    tower_kills: int | None
    inhibitor_kills: int | None


@dataclass(slots=True)
class CleanTimelineRecord:
    match_id: str
    participant_id: int
    frame_timestamp_ms: int
    total_gold: int | None
    level: int | None
    xp: int | None
    minions_killed: int | None
    jungle_minions_killed: int | None


@dataclass(slots=True)
class CleanEventRecord:
    match_id: str
    timestamp_ms: int
    event_type: str
    participant_id: int | None
    killer_id: int | None
    victim_id: int | None
    assisting_participant_ids: list[int]
    player_involved: bool


@dataclass(slots=True)
class AnalyticsSnapshot:
    matches: list[CleanMatchRecord]
    participants: list[CleanParticipantRecord]
    teams: list[CleanTeamRecord]
    timeline_rows: list[CleanTimelineRecord]
    events: list[CleanEventRecord]

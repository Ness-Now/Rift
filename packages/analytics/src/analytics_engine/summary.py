from collections import defaultdict
from datetime import UTC, datetime
from statistics import fmean

from analytics_engine.models import (
    AnalyticsSnapshot,
    CleanEventRecord,
    CleanMatchRecord,
    CleanParticipantRecord,
    CleanTeamRecord,
    CleanTimelineRecord
)


ANALYTICS_VERSION = "analytics_v1"
RECENT_WINDOW_SIZES = (10, 20, 30, 40)
ROLLING_WINDOW_SIZES = (5, 10)
SESSION_BREAK_SECONDS = 45 * 60
WEEKDAY_ORDER = ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")


def build_analytics_summary(snapshot: AnalyticsSnapshot) -> dict[str, object]:
    matches = sorted(snapshot.matches, key=_match_sort_key)
    participants_by_match = _group_participants(snapshot.participants)
    teams_by_match = _group_teams(snapshot.teams)
    timeline_by_key = _group_timeline_rows(snapshot.timeline_rows)
    events_by_match = _group_events(snapshot.events)
    sessions = _build_sessions(matches)

    overview = _build_overview(matches)
    progression = _build_progression(matches)
    splits = _build_splits(
        matches=matches,
        sessions=sessions
    )
    carry_context = _build_carry_context(
        matches=matches,
        participants_by_match=participants_by_match
    )
    macro = _build_macro(
        matches=matches,
        teams_by_match=teams_by_match
    )
    early_mid = _build_early_mid(
        matches=matches,
        participants_by_match=participants_by_match,
        timeline_by_key=timeline_by_key,
        events_by_match=events_by_match
    )
    data_quality = _build_data_quality(
        matches=matches,
        sessions=sessions,
        early_mid=early_mid
    )

    return {
        "analytics_version": ANALYTICS_VERSION,
        "source_snapshot_type": "latest_clean_snapshot",
        "overview": overview,
        "progression": progression,
        "splits": splits,
        "carry_context": carry_context,
        "macro": macro,
        "early_mid": early_mid,
        "data_quality": data_quality
    }


def _build_overview(matches: list[CleanMatchRecord]) -> dict[str, object]:
    total_games = len(matches)
    wins = sum(1 for match in matches if match.win)
    losses = total_games - wins
    champion_distribution = _champion_distribution(matches)
    main_champion = champion_distribution[0]["champion_name"] if champion_distribution else None
    main_champion_matches = [match for match in matches if match.champion_name == main_champion]
    most_played_win_rate = _ratio(
        sum(1 for match in main_champion_matches if match.win),
        len(main_champion_matches)
    )

    return {
        "total_games": total_games,
        "wins": wins,
        "losses": losses,
        "win_rate": _ratio(wins, total_games),
        "avg_duration_seconds": _avg(match.duration_seconds for match in matches),
        "avg_duration_minutes": _avg(
            (match.duration_seconds / 60) if match.duration_seconds is not None else None
            for match in matches
        ),
        "avg_kda": _avg(match.kda_calc for match in matches),
        "avg_cs_per_min": _avg(match.cs_per_min_calc for match in matches),
        "avg_gpm": _avg(_per_minute(match.gold_earned, match.duration_seconds) for match in matches),
        "avg_dpm": _avg(match.dpm_calc for match in matches),
        "avg_vision_per_min": _avg(match.vision_per_min_calc for match in matches),
        "champion_pool_distribution": champion_distribution,
        "most_played_champion": main_champion,
        "most_played_champion_win_rate": most_played_win_rate
    }


def _build_progression(matches: list[CleanMatchRecord]) -> dict[str, object]:
    chronological_results = [
        {
            "match_id": match.match_id,
            "sequence_index": index + 1,
            "game_start_utc": match.game_start_utc,
            "game_end_utc": match.game_end_utc,
            "champion_name": match.champion_name,
            "win": match.win,
            "kda": match.kda_calc,
            "cs_per_min": match.cs_per_min_calc,
            "dpm": match.dpm_calc
        }
        for index, match in enumerate(matches)
    ]
    main_champion = _most_played_champion_name(matches)
    main_champion_matches = [match for match in matches if match.champion_name == main_champion]

    return {
        "chronological_results_series": chronological_results,
        "rolling_win_rate_series": {
            f"window_{window_size}": _rolling_match_metric(
                matches=matches,
                window_size=window_size,
                extractor=lambda window_matches: _ratio(
                    sum(1 for match in window_matches if match.win),
                    len(window_matches)
                )
            )
            for window_size in ROLLING_WINDOW_SIZES
        },
        "rolling_kda_series": {
            f"window_{window_size}": _rolling_match_metric(
                matches=matches,
                window_size=window_size,
                extractor=lambda window_matches: _avg(match.kda_calc for match in window_matches)
            )
            for window_size in ROLLING_WINDOW_SIZES
        },
        "main_champion_progression": {
            "champion_name": main_champion,
            "segments": _segment_main_champion_progression(main_champion_matches)
        },
        "recent_windows": [
            _recent_window_summary(matches, window_size)
            for window_size in RECENT_WINDOW_SIZES
            if len(matches) >= window_size
        ]
    }


def _build_splits(
    *,
    matches: list[CleanMatchRecord],
    sessions: list[list[CleanMatchRecord]]
) -> dict[str, object]:
    return {
        "by_champion": _split_rows(
            matches=matches,
            label_fn=lambda match: match.champion_name or "UNKNOWN"
        ),
        "by_game_duration_bucket": _split_rows(
            matches=matches,
            label_fn=lambda match: _duration_bucket(match.duration_seconds)
        ),
        "by_hour_of_day": _time_split_rows(
            matches=matches,
            value_fn=lambda dt: f"{dt.hour:02d}"
        ),
        "by_weekday": _weekday_split_rows(matches),
        "by_session": _session_split_rows(sessions),
        "tracked_duo": {
            "available": False,
            "reason": "not_present_in_clean_snapshot"
        }
    }


def _build_carry_context(
    *,
    matches: list[CleanMatchRecord],
    participants_by_match: dict[str, list[CleanParticipantRecord]]
) -> dict[str, object]:
    kill_share_values: list[float] = []
    damage_share_values: list[float] = []
    gold_share_values: list[float] = []
    ally_kda_values: list[float] = []
    enemy_kda_values: list[float] = []
    ally_damage_values: list[float] = []
    enemy_damage_values: list[float] = []

    for match in matches:
        participants = participants_by_match.get(match.match_id, [])
        self_participant = _find_self_participant(participants)
        if self_participant is None:
            continue

        allied = [participant for participant in participants if participant.relation_to_target in {"self", "ally"}]
        allied_without_self = [participant for participant in participants if participant.relation_to_target == "ally"]
        enemies = [participant for participant in participants if participant.relation_to_target == "enemy"]

        kill_share_values.append(
            _safe_share(
                self_participant.kills,
                sum(_int_or_zero(participant.kills) for participant in allied)
            )
        )
        damage_share_values.append(
            _safe_share(
                self_participant.total_damage_dealt_to_champions,
                sum(_int_or_zero(participant.total_damage_dealt_to_champions) for participant in allied)
            )
        )
        gold_share_values.append(
            _safe_share(
                self_participant.gold_earned,
                sum(_int_or_zero(participant.gold_earned) for participant in allied)
            )
        )
        ally_kda_values.append(_avg(participant.kda_calc for participant in allied_without_self))
        enemy_kda_values.append(_avg(participant.kda_calc for participant in enemies))
        ally_damage_values.append(
            _avg(participant.total_damage_dealt_to_champions for participant in allied_without_self)
        )
        enemy_damage_values.append(
            _avg(participant.total_damage_dealt_to_champions for participant in enemies)
        )

    return {
        "avg_kill_share": _avg(kill_share_values),
        "avg_damage_share": _avg(damage_share_values),
        "avg_gold_share": _avg(gold_share_values),
        "avg_ally_kda_excluding_self": _avg(ally_kda_values),
        "avg_enemy_kda": _avg(enemy_kda_values),
        "avg_ally_damage_to_champions_excluding_self": _avg(ally_damage_values),
        "avg_enemy_damage_to_champions": _avg(enemy_damage_values),
        "self_vs_team_context_indicator": {
            "damage_share": _avg(damage_share_values),
            "gold_share": _avg(gold_share_values),
            "kill_share": _avg(kill_share_values)
        }
    }


def _build_macro(
    *,
    matches: list[CleanMatchRecord],
    teams_by_match: dict[str, dict[int, CleanTeamRecord]]
) -> dict[str, object]:
    by_outcome: dict[str, list[dict[str, int | None]]] = {"wins": [], "losses": []}

    for match in matches:
        teams = teams_by_match.get(match.match_id, {})
        team = teams.get(match.player_team_id)
        enemy = next((candidate for team_id, candidate in teams.items() if team_id != match.player_team_id), None)
        if team is None or enemy is None:
            continue

        bucket = by_outcome["wins" if match.win else "losses"]
        bucket.append(
            {
                "team_dragons": team.dragon_kills,
                "team_heralds": team.herald_kills,
                "team_barons": team.baron_kills,
                "team_towers": team.tower_kills,
                "enemy_dragons": enemy.dragon_kills,
                "enemy_heralds": enemy.herald_kills,
                "enemy_barons": enemy.baron_kills,
                "enemy_towers": enemy.tower_kills
            }
        )

    return {
        "wins": _macro_bucket_summary(by_outcome["wins"]),
        "losses": _macro_bucket_summary(by_outcome["losses"])
    }


def _build_early_mid(
    *,
    matches: list[CleanMatchRecord],
    participants_by_match: dict[str, list[CleanParticipantRecord]],
    timeline_by_key: dict[tuple[str, int], list[CleanTimelineRecord]],
    events_by_match: dict[str, list[CleanEventRecord]]
) -> dict[str, object]:
    first_kill_times: list[float] = []
    first_death_times: list[float] = []
    first_assist_times: list[float] = []
    checkpoint_10_gold: list[float] = []
    checkpoint_10_xp: list[float] = []
    checkpoint_10_cs: list[float] = []
    checkpoint_15_gold: list[float] = []
    checkpoint_15_xp: list[float] = []
    checkpoint_15_cs: list[float] = []
    final_role_opp_gold_diffs: list[float] = []
    final_role_opp_cs_diffs: list[float] = []
    final_role_opp_damage_diffs: list[float] = []
    checkpoint_10_gold_diffs: list[float] = []
    checkpoint_10_xp_diffs: list[float] = []
    checkpoint_10_cs_diffs: list[float] = []
    checkpoint_15_gold_diffs: list[float] = []
    checkpoint_15_xp_diffs: list[float] = []
    checkpoint_15_cs_diffs: list[float] = []

    for match in matches:
        first_kill_time, first_death_time, first_assist_time = _event_timestamps_for_match(
            match=match,
            events=events_by_match.get(match.match_id, [])
        )
        if first_kill_time is not None:
            first_kill_times.append(first_kill_time)
        if first_death_time is not None:
            first_death_times.append(first_death_time)
        if first_assist_time is not None:
            first_assist_times.append(first_assist_time)

        self_frames = timeline_by_key.get((match.match_id, match.player_participant_id), [])
        checkpoint_10 = _frame_at_or_before(self_frames, 10 * 60 * 1000)
        checkpoint_15 = _frame_at_or_before(self_frames, 15 * 60 * 1000)

        if checkpoint_10 is not None:
            checkpoint_10_gold.append(_float_or_none(checkpoint_10.total_gold))
            checkpoint_10_xp.append(_float_or_none(checkpoint_10.xp))
            checkpoint_10_cs.append(_float_or_none(_timeline_cs_total(checkpoint_10)))
        if checkpoint_15 is not None:
            checkpoint_15_gold.append(_float_or_none(checkpoint_15.total_gold))
            checkpoint_15_xp.append(_float_or_none(checkpoint_15.xp))
            checkpoint_15_cs.append(_float_or_none(_timeline_cs_total(checkpoint_15)))

        participants = participants_by_match.get(match.match_id, [])
        self_participant = _find_self_participant(participants)
        role_opp = _find_participant_by_id(participants, match.role_opp_participant_id)
        if self_participant is not None and role_opp is not None:
            final_role_opp_gold_diffs.append(
                _diff(self_participant.gold_earned, role_opp.gold_earned)
            )
            final_role_opp_cs_diffs.append(
                _diff(self_participant.cs_total, role_opp.cs_total)
            )
            final_role_opp_damage_diffs.append(
                _diff(
                    self_participant.total_damage_dealt_to_champions,
                    role_opp.total_damage_dealt_to_champions
                )
            )

            opp_frames = timeline_by_key.get((match.match_id, role_opp.participant_id), [])
            opp_checkpoint_10 = _frame_at_or_before(opp_frames, 10 * 60 * 1000)
            opp_checkpoint_15 = _frame_at_or_before(opp_frames, 15 * 60 * 1000)

            if checkpoint_10 is not None and opp_checkpoint_10 is not None:
                checkpoint_10_gold_diffs.append(
                    _diff(checkpoint_10.total_gold, opp_checkpoint_10.total_gold)
                )
                checkpoint_10_xp_diffs.append(
                    _diff(checkpoint_10.xp, opp_checkpoint_10.xp)
                )
                checkpoint_10_cs_diffs.append(
                    _diff(_timeline_cs_total(checkpoint_10), _timeline_cs_total(opp_checkpoint_10))
                )
            if checkpoint_15 is not None and opp_checkpoint_15 is not None:
                checkpoint_15_gold_diffs.append(
                    _diff(checkpoint_15.total_gold, opp_checkpoint_15.total_gold)
                )
                checkpoint_15_xp_diffs.append(
                    _diff(checkpoint_15.xp, opp_checkpoint_15.xp)
                )
                checkpoint_15_cs_diffs.append(
                    _diff(_timeline_cs_total(checkpoint_15), _timeline_cs_total(opp_checkpoint_15))
                )

    return {
        "first_action_times": {
            "avg_first_kill_time_seconds": _avg(first_kill_times),
            "avg_first_death_time_seconds": _avg(first_death_times),
            "avg_first_assist_time_seconds": _avg(first_assist_times)
        },
        "checkpoint_10": {
            "avg_gold": _avg(checkpoint_10_gold),
            "avg_xp": _avg(checkpoint_10_xp),
            "avg_cs": _avg(checkpoint_10_cs),
            "avg_role_opp_gold_diff": _avg(checkpoint_10_gold_diffs),
            "avg_role_opp_xp_diff": _avg(checkpoint_10_xp_diffs),
            "avg_role_opp_cs_diff": _avg(checkpoint_10_cs_diffs)
        },
        "checkpoint_15": {
            "avg_gold": _avg(checkpoint_15_gold),
            "avg_xp": _avg(checkpoint_15_xp),
            "avg_cs": _avg(checkpoint_15_cs),
            "avg_role_opp_gold_diff": _avg(checkpoint_15_gold_diffs),
            "avg_role_opp_xp_diff": _avg(checkpoint_15_xp_diffs),
            "avg_role_opp_cs_diff": _avg(checkpoint_15_cs_diffs)
        },
        "role_opponent_final_diffs": {
            "avg_gold_diff": _avg(final_role_opp_gold_diffs),
            "avg_cs_diff": _avg(final_role_opp_cs_diffs),
            "avg_damage_to_champions_diff": _avg(final_role_opp_damage_diffs)
        }
    }


def _build_data_quality(
    *,
    matches: list[CleanMatchRecord],
    sessions: list[list[CleanMatchRecord]],
    early_mid: dict[str, object]
) -> dict[str, object]:
    timeline_available = any(match.timeline_available for match in matches)
    event_available = (
        _nested_value(early_mid, "first_action_times", "avg_first_kill_time_seconds") is not None
        or _nested_value(early_mid, "first_action_times", "avg_first_death_time_seconds") is not None
        or _nested_value(early_mid, "first_action_times", "avg_first_assist_time_seconds") is not None
    )
    time_available = any(_parse_utc(match.game_start_utc) is not None for match in matches)
    limitations: list[str] = []
    if not timeline_available:
        limitations.append("timeline_metrics_unavailable")
    if not event_available:
        limitations.append("event_metrics_unavailable")
    if not time_available:
        limitations.append("time_of_day_splits_unavailable")
        limitations.append("weekday_splits_unavailable")
        limitations.append("session_splits_unavailable")
    limitations.append("tracked_duo_not_present")

    return {
        "matches_analyzed": len(matches),
        "tracked_duo_available": False,
        "timeline_metrics_available": timeline_available,
        "event_metrics_available": event_available,
        "sessionization_available": time_available and len(sessions) > 0,
        "limitations": limitations
    }


def _champion_distribution(matches: list[CleanMatchRecord]) -> list[dict[str, object]]:
    counts: dict[str, int] = defaultdict(int)
    wins: dict[str, int] = defaultdict(int)
    total_games = len(matches)

    for match in matches:
        champion = match.champion_name or "UNKNOWN"
        counts[champion] += 1
        wins[champion] += int(match.win)

    rows = [
        {
            "champion_name": champion,
            "games": game_count,
            "share": _ratio(game_count, total_games),
            "win_rate": _ratio(wins[champion], game_count)
        }
        for champion, game_count in counts.items()
    ]
    return sorted(rows, key=lambda row: (-int(row["games"]), str(row["champion_name"])))


def _rolling_match_metric(
    *,
    matches: list[CleanMatchRecord],
    window_size: int,
    extractor
) -> list[dict[str, object]]:
    if len(matches) < window_size:
        return []
    rows: list[dict[str, object]] = []
    for index in range(window_size - 1, len(matches)):
        window = matches[index - window_size + 1:index + 1]
        rows.append(
            {
                "window_size": window_size,
                "end_sequence_index": index + 1,
                "end_match_id": matches[index].match_id,
                "end_game_start_utc": matches[index].game_start_utc,
                "value": extractor(window)
            }
        )
    return rows


def _recent_window_summary(matches: list[CleanMatchRecord], window_size: int) -> dict[str, object]:
    window = matches[-window_size:]
    wins = sum(1 for match in window if match.win)
    return {
        "window_size": window_size,
        "games": len(window),
        "wins": wins,
        "losses": len(window) - wins,
        "win_rate": _ratio(wins, len(window)),
        "avg_kda": _avg(match.kda_calc for match in window),
        "avg_cs_per_min": _avg(match.cs_per_min_calc for match in window),
        "avg_dpm": _avg(match.dpm_calc for match in window)
    }


def _segment_main_champion_progression(matches: list[CleanMatchRecord]) -> list[dict[str, object]]:
    if not matches:
        return []
    labels = ("early", "mid", "late")
    segments: list[list[CleanMatchRecord]] = [[] for _ in labels]
    for index, match in enumerate(matches):
        segment_index = min((index * len(labels)) // len(matches), len(labels) - 1)
        segments[segment_index].append(match)
    rows: list[dict[str, object]] = []
    for label, segment_matches in zip(labels, segments, strict=True):
        if not segment_matches:
            continue
        wins = sum(1 for match in segment_matches if match.win)
        rows.append(
            {
                "segment": label,
                "games": len(segment_matches),
                "win_rate": _ratio(wins, len(segment_matches)),
                "avg_kda": _avg(match.kda_calc for match in segment_matches),
                "avg_dpm": _avg(match.dpm_calc for match in segment_matches),
                "avg_cs_per_min": _avg(match.cs_per_min_calc for match in segment_matches)
            }
        )
    return rows


def _split_rows(matches: list[CleanMatchRecord], label_fn) -> list[dict[str, object]]:
    grouped: dict[str, list[CleanMatchRecord]] = defaultdict(list)
    for match in matches:
        grouped[label_fn(match)].append(match)
    rows = []
    for label, grouped_matches in grouped.items():
        wins = sum(1 for match in grouped_matches if match.win)
        rows.append(
            {
                "label": label,
                "games": len(grouped_matches),
                "wins": wins,
                "losses": len(grouped_matches) - wins,
                "win_rate": _ratio(wins, len(grouped_matches)),
                "avg_kda": _avg(match.kda_calc for match in grouped_matches),
                "avg_cs_per_min": _avg(match.cs_per_min_calc for match in grouped_matches),
                "avg_dpm": _avg(match.dpm_calc for match in grouped_matches)
            }
        )
    return sorted(rows, key=lambda row: (-int(row["games"]), str(row["label"])))


def _time_split_rows(matches: list[CleanMatchRecord], value_fn) -> list[dict[str, object]]:
    grouped: dict[str, list[CleanMatchRecord]] = defaultdict(list)
    for match in matches:
        dt = _match_datetime(match)
        if dt is None:
            continue
        grouped[value_fn(dt)].append(match)
    rows = []
    for label, grouped_matches in grouped.items():
        wins = sum(1 for match in grouped_matches if match.win)
        rows.append(
            {
                "label": label,
                "games": len(grouped_matches),
                "win_rate": _ratio(wins, len(grouped_matches)),
                "avg_kda": _avg(match.kda_calc for match in grouped_matches)
            }
        )
    return sorted(rows, key=lambda row: str(row["label"]))


def _weekday_split_rows(matches: list[CleanMatchRecord]) -> list[dict[str, object]]:
    grouped: dict[str, list[CleanMatchRecord]] = defaultdict(list)
    for match in matches:
        dt = _match_datetime(match)
        if dt is None:
            continue
        grouped[dt.strftime("%A")].append(match)
    rows = []
    for label in WEEKDAY_ORDER:
        grouped_matches = grouped.get(label, [])
        if not grouped_matches:
            continue
        wins = sum(1 for match in grouped_matches if match.win)
        rows.append(
            {
                "label": label,
                "games": len(grouped_matches),
                "win_rate": _ratio(wins, len(grouped_matches)),
                "avg_kda": _avg(match.kda_calc for match in grouped_matches)
            }
        )
    return rows


def _session_split_rows(sessions: list[list[CleanMatchRecord]]) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    for index, session_matches in enumerate(sessions):
        wins = sum(1 for match in session_matches if match.win)
        rows.append(
            {
                "session_id": index + 1,
                "started_at": session_matches[0].game_start_utc,
                "ended_at": session_matches[-1].game_end_utc or session_matches[-1].game_start_utc,
                "games": len(session_matches),
                "wins": wins,
                "win_rate": _ratio(wins, len(session_matches)),
                "avg_kda": _avg(match.kda_calc for match in session_matches),
                "champions": sorted({match.champion_name or "UNKNOWN" for match in session_matches})
            }
        )
    return rows


def _macro_bucket_summary(bucket: list[dict[str, int | None]]) -> dict[str, object]:
    return {
        "games": len(bucket),
        "avg_team_dragons": _avg(row["team_dragons"] for row in bucket),
        "avg_team_heralds": _avg(row["team_heralds"] for row in bucket),
        "avg_team_barons": _avg(row["team_barons"] for row in bucket),
        "avg_team_towers": _avg(row["team_towers"] for row in bucket),
        "avg_enemy_dragons": _avg(row["enemy_dragons"] for row in bucket),
        "avg_enemy_heralds": _avg(row["enemy_heralds"] for row in bucket),
        "avg_enemy_barons": _avg(row["enemy_barons"] for row in bucket),
        "avg_enemy_towers": _avg(row["enemy_towers"] for row in bucket)
    }


def _event_timestamps_for_match(
    *,
    match: CleanMatchRecord,
    events: list[CleanEventRecord]
) -> tuple[float | None, float | None, float | None]:
    first_kill_time: float | None = None
    first_death_time: float | None = None
    first_assist_time: float | None = None

    for event in sorted(events, key=lambda item: item.timestamp_ms):
        if event.event_type != "CHAMPION_KILL":
            continue
        timestamp_seconds = round(event.timestamp_ms / 1000, 4)
        if first_kill_time is None and event.killer_id == match.player_participant_id:
            first_kill_time = timestamp_seconds
        if first_death_time is None and event.victim_id == match.player_participant_id:
            first_death_time = timestamp_seconds
        if (
            first_assist_time is None
            and match.player_participant_id in event.assisting_participant_ids
        ):
            first_assist_time = timestamp_seconds
    return first_kill_time, first_death_time, first_assist_time


def _build_sessions(matches: list[CleanMatchRecord]) -> list[list[CleanMatchRecord]]:
    if not matches:
        return []
    sessions: list[list[CleanMatchRecord]] = [[matches[0]]]
    previous = matches[0]

    for match in matches[1:]:
        previous_end = _parse_utc(previous.game_end_utc or previous.game_start_utc)
        current_start = _parse_utc(match.game_start_utc or match.game_end_utc)
        if previous_end is None or current_start is None:
            sessions.append([match])
        else:
            gap_seconds = (current_start - previous_end).total_seconds()
            if gap_seconds > SESSION_BREAK_SECONDS:
                sessions.append([match])
            else:
                sessions[-1].append(match)
        previous = match
    return sessions


def _group_participants(
    participants: list[CleanParticipantRecord]
) -> dict[str, list[CleanParticipantRecord]]:
    grouped: dict[str, list[CleanParticipantRecord]] = defaultdict(list)
    for participant in participants:
        grouped[participant.match_id].append(participant)
    return grouped


def _group_teams(teams: list[CleanTeamRecord]) -> dict[str, dict[int, CleanTeamRecord]]:
    grouped: dict[str, dict[int, CleanTeamRecord]] = defaultdict(dict)
    for team in teams:
        grouped[team.match_id][team.team_id] = team
    return grouped


def _group_timeline_rows(
    timeline_rows: list[CleanTimelineRecord]
) -> dict[tuple[str, int], list[CleanTimelineRecord]]:
    grouped: dict[tuple[str, int], list[CleanTimelineRecord]] = defaultdict(list)
    for row in timeline_rows:
        grouped[(row.match_id, row.participant_id)].append(row)
    for rows in grouped.values():
        rows.sort(key=lambda item: item.frame_timestamp_ms)
    return grouped


def _group_events(events: list[CleanEventRecord]) -> dict[str, list[CleanEventRecord]]:
    grouped: dict[str, list[CleanEventRecord]] = defaultdict(list)
    for event in events:
        grouped[event.match_id].append(event)
    return grouped


def _find_self_participant(
    participants: list[CleanParticipantRecord]
) -> CleanParticipantRecord | None:
    return next((participant for participant in participants if participant.relation_to_target == "self"), None)


def _find_participant_by_id(
    participants: list[CleanParticipantRecord],
    participant_id: int | None
) -> CleanParticipantRecord | None:
    if participant_id is None:
        return None
    return next((participant for participant in participants if participant.participant_id == participant_id), None)


def _frame_at_or_before(
    frames: list[CleanTimelineRecord],
    checkpoint_ms: int
) -> CleanTimelineRecord | None:
    eligible = [frame for frame in frames if frame.frame_timestamp_ms <= checkpoint_ms]
    return eligible[-1] if eligible else None


def _timeline_cs_total(frame: CleanTimelineRecord) -> int:
    return _int_or_zero(frame.minions_killed) + _int_or_zero(frame.jungle_minions_killed)


def _duration_bucket(duration_seconds: float | None) -> str:
    if duration_seconds is None:
        return "UNKNOWN"
    minutes = duration_seconds / 60
    if minutes < 25:
        return "LT_25"
    if minutes < 30:
        return "25_TO_30"
    if minutes < 35:
        return "30_TO_35"
    return "GE_35"


def _most_played_champion_name(matches: list[CleanMatchRecord]) -> str | None:
    distribution = _champion_distribution(matches)
    if not distribution:
        return None
    return str(distribution[0]["champion_name"])


def _match_sort_key(match: CleanMatchRecord) -> tuple[datetime, str]:
    dt = _match_datetime(match) or datetime.min.replace(tzinfo=UTC)
    return dt, match.match_id


def _match_datetime(match: CleanMatchRecord) -> datetime | None:
    return _parse_utc(match.game_start_utc) or _parse_utc(match.game_end_utc) or _parse_utc(match.game_creation_utc)


def _parse_utc(value: str | None) -> datetime | None:
    if value in (None, ""):
        return None
    normalized = value.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(normalized).astimezone(UTC)
    except ValueError:
        return None


def _safe_share(value: int | None, total: int) -> float | None:
    if value is None or total <= 0:
        return None
    return round(value / total, 4)


def _per_minute(value: int | None, duration_seconds: float | None) -> float | None:
    if value is None or duration_seconds is None or duration_seconds <= 0:
        return None
    return round(value / (duration_seconds / 60), 4)


def _ratio(numerator: int, denominator: int) -> float | None:
    if denominator <= 0:
        return None
    return round(numerator / denominator, 4)


def _avg(values) -> float | None:
    cleaned = [value for value in values if value is not None]
    if not cleaned:
        return None
    return round(float(fmean(cleaned)), 4)


def _diff(left: int | None, right: int | None) -> float | None:
    if left is None or right is None:
        return None
    return round(float(left - right), 4)


def _float_or_none(value: int | None) -> float | None:
    if value is None:
        return None
    return float(value)


def _int_or_zero(value: int | None) -> int:
    return value if value is not None else 0


def _nested_value(container: dict[str, object], *keys: str) -> object | None:
    current: object = container
    for key in keys:
        if not isinstance(current, dict):
            return None
        current = current.get(key)
    return current

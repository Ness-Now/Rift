from collections.abc import Iterable

from api_service.reports.contracts import PriorityCandidate, ReportInputContract, ReportSignal
from api_service.reports.errors import ReportValidationError


REPORT_VERSION = "report_v1"


def build_report_input_contract(analytics_summary: dict[str, object]) -> ReportInputContract:
    analytics_version = _require_string(analytics_summary.get("analytics_version"), "Analytics version is missing.")
    source_snapshot_type = _require_string(
        analytics_summary.get("source_snapshot_type"),
        "Source snapshot type is missing."
    )
    overview = _require_mapping(analytics_summary.get("overview"), "Overview section is missing.")
    progression = _require_mapping(analytics_summary.get("progression"), "Progression section is missing.")
    splits = _require_mapping(analytics_summary.get("splits"), "Splits section is missing.")
    carry_context = _require_mapping(analytics_summary.get("carry_context"), "Carry context section is missing.")
    macro = _require_mapping(analytics_summary.get("macro"), "Macro section is missing.")
    early_mid = _require_mapping(analytics_summary.get("early_mid"), "Early and mid section is missing.")
    data_quality = _require_mapping(analytics_summary.get("data_quality"), "Data quality section is missing.")

    contract = ReportInputContract(
        report_version=REPORT_VERSION,
        analytics_version=analytics_version,
        source_snapshot_type=source_snapshot_type,
        overview_signals=_build_overview_signals(overview),
        progression_signals=_build_progression_signals(progression),
        split_signals=_build_split_signals(splits),
        carry_context_signals=_build_carry_context_signals(carry_context),
        macro_signals=_build_macro_signals(macro),
        early_mid_signals=_build_early_mid_signals(early_mid),
        data_quality_flags=_build_data_quality_flags(data_quality),
        priority_candidates=_build_priority_candidates(
            overview=overview,
            splits=splits,
            macro=macro,
            early_mid=early_mid,
            data_quality=data_quality
        )
    )
    return contract


def _build_overview_signals(overview: dict[str, object]) -> list[ReportSignal]:
    champion_distribution = _as_list(overview.get("champion_pool_distribution"))
    top_champion = _mapping_from_index(champion_distribution, 0)
    return [
        ReportSignal(
            key="total_games",
            label="Total games",
            value=_number_or_none(overview.get("total_games")),
            evidence=[]
        ),
        ReportSignal(
            key="win_rate",
            label="Overall win rate",
            value=_number_or_none(overview.get("win_rate")),
            evidence=[
                f"Wins: {_number_or_none(overview.get('wins'))}",
                f"Losses: {_number_or_none(overview.get('losses'))}"
            ]
        ),
        ReportSignal(
            key="avg_kda",
            label="Average KDA",
            value=_number_or_none(overview.get("avg_kda")),
            evidence=[]
        ),
        ReportSignal(
            key="avg_cs_per_min",
            label="Average CS per minute",
            value=_number_or_none(overview.get("avg_cs_per_min")),
            evidence=[]
        ),
        ReportSignal(
            key="avg_gpm",
            label="Average gold per minute",
            value=_number_or_none(overview.get("avg_gpm")),
            evidence=[]
        ),
        ReportSignal(
            key="avg_dpm",
            label="Average damage per minute",
            value=_number_or_none(overview.get("avg_dpm")),
            evidence=[]
        ),
        ReportSignal(
            key="avg_vision_per_min",
            label="Average vision per minute",
            value=_number_or_none(overview.get("avg_vision_per_min")),
            evidence=[]
        ),
        ReportSignal(
            key="most_played_champion",
            label="Most played champion",
            value=_string_or_none(overview.get("most_played_champion")),
            evidence=[
                f"Games: {_number_or_none(top_champion.get('games') if top_champion else None)}",
                f"Share: {_number_or_none(top_champion.get('share') if top_champion else None)}",
                f"Win rate: {_number_or_none(overview.get('most_played_champion_win_rate'))}"
            ]
        )
    ]


def _build_progression_signals(progression: dict[str, object]) -> list[ReportSignal]:
    recent_windows = _as_list(progression.get("recent_windows"))
    main_champion_progression = _require_list_of_mappings(
        _mapping_value(progression.get("main_champion_progression"), "Main champion progression is invalid.").get("segments"),
        "Main champion progression segments are invalid."
    )
    signals: list[ReportSignal] = []

    for window in recent_windows[:4]:
        window_size = _number_or_none(window.get("window_size"))
        signals.append(
            ReportSignal(
                key=f"recent_window_{int(window_size) if isinstance(window_size, int | float) else 'unknown'}",
                label=f"Recent {window_size} match window",
                value=_number_or_none(window.get("win_rate")),
                evidence=[
                    f"Average KDA: {_number_or_none(window.get('avg_kda'))}",
                    f"Average DPM: {_number_or_none(window.get('avg_dpm'))}"
                ]
            )
        )

    for segment in main_champion_progression:
        segment_name = _string_or_none(segment.get("segment")) or "segment"
        signals.append(
            ReportSignal(
                key=f"main_champion_{segment_name}",
                label=f"Main champion {segment_name} segment",
                value=_number_or_none(segment.get("win_rate")),
                evidence=[
                    f"Games: {_number_or_none(segment.get('games'))}",
                    f"Average KDA: {_number_or_none(segment.get('avg_kda'))}",
                    f"Average DPM: {_number_or_none(segment.get('avg_dpm'))}"
                ]
            )
        )

    rolling_win_rate = _mapping_from_index(
        _as_list(_mapping_value(progression.get("rolling_win_rate_series"), "Rolling win-rate series is invalid.").get("window_5")),
        -1
    )
    if rolling_win_rate:
        signals.append(
            ReportSignal(
                key="rolling_win_rate_window_5_latest",
                label="Latest rolling win rate over 5 games",
                value=_number_or_none(rolling_win_rate.get("value")),
                evidence=[f"End match: {_string_or_none(rolling_win_rate.get('end_match_id'))}"]
            )
        )

    return signals


def _build_split_signals(splits: dict[str, object]) -> list[ReportSignal]:
    by_champion = _require_list_of_mappings(splits.get("by_champion"), "Champion splits are missing.")
    by_duration = _require_list_of_mappings(
        splits.get("by_game_duration_bucket"),
        "Duration splits are missing."
    )
    by_hour = _require_list_of_mappings(splits.get("by_hour_of_day"), "Hour splits are missing.")
    by_weekday = _require_list_of_mappings(splits.get("by_weekday"), "Weekday splits are missing.")
    by_session = _require_list_of_mappings(splits.get("by_session"), "Session splits are missing.")

    top_champion = _mapping_from_index(by_champion, 0)
    best_duration = _best_row(by_duration)
    worst_duration = _worst_row(by_duration)
    best_hour = _best_row(by_hour)
    best_weekday = _best_row(by_weekday)
    longest_session = max(by_session, key=lambda item: _number_or_none(item.get("games")) or 0, default=None)

    signals: list[ReportSignal] = []
    if top_champion:
        signals.append(
            ReportSignal(
                key="split_top_champion",
                label="Top champion split",
                value=_string_or_none(top_champion.get("label")),
                evidence=[
                    f"Games: {_number_or_none(top_champion.get('games'))}",
                    f"Win rate: {_number_or_none(top_champion.get('win_rate'))}"
                ]
            )
        )
    if best_duration:
        signals.append(
            ReportSignal(
                key="split_best_duration_bucket",
                label="Best duration bucket",
                value=_string_or_none(best_duration.get("label")),
                evidence=[f"Win rate: {_number_or_none(best_duration.get('win_rate'))}"]
            )
        )
    if worst_duration:
        signals.append(
            ReportSignal(
                key="split_worst_duration_bucket",
                label="Worst duration bucket",
                value=_string_or_none(worst_duration.get("label")),
                evidence=[f"Win rate: {_number_or_none(worst_duration.get('win_rate'))}"]
            )
        )
    if best_hour:
        signals.append(
            ReportSignal(
                key="split_best_hour",
                label="Best hour-of-day split",
                value=_string_or_none(best_hour.get("label")),
                evidence=[f"Win rate: {_number_or_none(best_hour.get('win_rate'))}"]
            )
        )
    if best_weekday:
        signals.append(
            ReportSignal(
                key="split_best_weekday",
                label="Best weekday split",
                value=_string_or_none(best_weekday.get("label")),
                evidence=[f"Win rate: {_number_or_none(best_weekday.get('win_rate'))}"]
            )
        )
    if longest_session:
        signals.append(
            ReportSignal(
                key="split_longest_session",
                label="Longest detected session",
                value=_number_or_none(longest_session.get("games")),
                evidence=[
                    f"Session win rate: {_number_or_none(longest_session.get('win_rate'))}",
                    f"Started at: {_string_or_none(longest_session.get('started_at'))}"
                ]
            )
        )
    return signals


def _build_carry_context_signals(carry_context: dict[str, object]) -> list[ReportSignal]:
    return [
        ReportSignal(
            key="avg_kill_share",
            label="Average kill share",
            value=_number_or_none(carry_context.get("avg_kill_share")),
            evidence=[]
        ),
        ReportSignal(
            key="avg_damage_share",
            label="Average damage share",
            value=_number_or_none(carry_context.get("avg_damage_share")),
            evidence=[]
        ),
        ReportSignal(
            key="avg_gold_share",
            label="Average gold share",
            value=_number_or_none(carry_context.get("avg_gold_share")),
            evidence=[]
        ),
        ReportSignal(
            key="avg_ally_kda_excluding_self",
            label="Average ally KDA excluding self",
            value=_number_or_none(carry_context.get("avg_ally_kda_excluding_self")),
            evidence=[]
        ),
        ReportSignal(
            key="avg_enemy_kda",
            label="Average enemy KDA",
            value=_number_or_none(carry_context.get("avg_enemy_kda")),
            evidence=[]
        )
    ]


def _build_macro_signals(macro: dict[str, object]) -> list[ReportSignal]:
    wins = _mapping_value(macro.get("wins"), "Macro wins section is invalid.")
    losses = _mapping_value(macro.get("losses"), "Macro losses section is invalid.")
    return [
        ReportSignal(
            key="macro_wins_dragons",
            label="Average team dragons in wins",
            value=_number_or_none(wins.get("avg_team_dragons")),
            evidence=[f"Games: {_number_or_none(wins.get('games'))}"]
        ),
        ReportSignal(
            key="macro_losses_enemy_dragons",
            label="Average enemy dragons in losses",
            value=_number_or_none(losses.get("avg_enemy_dragons")),
            evidence=[f"Games: {_number_or_none(losses.get('games'))}"]
        ),
        ReportSignal(
            key="macro_wins_team_towers",
            label="Average team towers in wins",
            value=_number_or_none(wins.get("avg_team_towers")),
            evidence=[f"Average enemy towers in wins: {_number_or_none(wins.get('avg_enemy_towers'))}"]
        ),
        ReportSignal(
            key="macro_losses_enemy_barons",
            label="Average enemy barons in losses",
            value=_number_or_none(losses.get("avg_enemy_barons")),
            evidence=[f"Average team barons in losses: {_number_or_none(losses.get('avg_team_barons'))}"]
        )
    ]


def _build_early_mid_signals(early_mid: dict[str, object]) -> list[ReportSignal]:
    first_actions = _mapping_value(early_mid.get("first_action_times"), "First action times are invalid.")
    checkpoint_10 = _mapping_value(early_mid.get("checkpoint_10"), "Checkpoint 10 is invalid.")
    checkpoint_15 = _mapping_value(early_mid.get("checkpoint_15"), "Checkpoint 15 is invalid.")
    role_opp_final = _mapping_value(
        early_mid.get("role_opponent_final_diffs"),
        "Role opponent final diffs are invalid."
    )
    return [
        ReportSignal(
            key="first_kill_time",
            label="Average first kill time",
            value=_number_or_none(first_actions.get("avg_first_kill_time_seconds")),
            evidence=[]
        ),
        ReportSignal(
            key="first_death_time",
            label="Average first death time",
            value=_number_or_none(first_actions.get("avg_first_death_time_seconds")),
            evidence=[]
        ),
        ReportSignal(
            key="checkpoint_10_gold_diff",
            label="10-minute role opponent gold diff",
            value=_number_or_none(checkpoint_10.get("avg_role_opp_gold_diff")),
            evidence=[
                f"10-minute role opponent XP diff: {_number_or_none(checkpoint_10.get('avg_role_opp_xp_diff'))}",
                f"10-minute role opponent CS diff: {_number_or_none(checkpoint_10.get('avg_role_opp_cs_diff'))}"
            ]
        ),
        ReportSignal(
            key="checkpoint_15_gold_diff",
            label="15-minute role opponent gold diff",
            value=_number_or_none(checkpoint_15.get("avg_role_opp_gold_diff")),
            evidence=[
                f"15-minute role opponent XP diff: {_number_or_none(checkpoint_15.get('avg_role_opp_xp_diff'))}",
                f"15-minute role opponent CS diff: {_number_or_none(checkpoint_15.get('avg_role_opp_cs_diff'))}"
            ]
        ),
        ReportSignal(
            key="final_role_opp_damage_diff",
            label="Final role opponent damage-to-champions diff",
            value=_number_or_none(role_opp_final.get("avg_damage_to_champions_diff")),
            evidence=[
                f"Final role opponent gold diff: {_number_or_none(role_opp_final.get('avg_gold_diff'))}",
                f"Final role opponent CS diff: {_number_or_none(role_opp_final.get('avg_cs_diff'))}"
            ]
        )
    ]


def _build_data_quality_flags(data_quality: dict[str, object]) -> list[ReportSignal]:
    limitations = _as_string_list(data_quality.get("limitations"))
    return [
        ReportSignal(
            key="matches_analyzed",
            label="Matches analyzed",
            value=_number_or_none(data_quality.get("matches_analyzed")),
            evidence=[]
        ),
        ReportSignal(
            key="tracked_duo_available",
            label="Tracked duo data available",
            value=_bool_or_none(data_quality.get("tracked_duo_available")),
            evidence=[]
        ),
        ReportSignal(
            key="timeline_metrics_available",
            label="Timeline metrics available",
            value=_bool_or_none(data_quality.get("timeline_metrics_available")),
            evidence=[]
        ),
        ReportSignal(
            key="event_metrics_available",
            label="Event metrics available",
            value=_bool_or_none(data_quality.get("event_metrics_available")),
            evidence=[]
        ),
        ReportSignal(
            key="limitations",
            label="Reported limitations",
            value=", ".join(limitations) if limitations else None,
            evidence=[]
        )
    ]


def _build_priority_candidates(
    *,
    overview: dict[str, object],
    splits: dict[str, object],
    macro: dict[str, object],
    early_mid: dict[str, object],
    data_quality: dict[str, object]
) -> list[PriorityCandidate]:
    candidates: list[PriorityCandidate] = []
    total_games = _number_or_none(overview.get("total_games")) or 0
    win_rate = _number_or_none(overview.get("win_rate"))
    main_champion_win_rate = _number_or_none(overview.get("most_played_champion_win_rate"))
    duration_splits = _require_list_of_mappings(
        splits.get("by_game_duration_bucket"),
        "Duration splits are invalid."
    )
    checkpoint_10 = _mapping_value(early_mid.get("checkpoint_10"), "Checkpoint 10 is invalid.")
    role_opp_10_gold = _number_or_none(checkpoint_10.get("avg_role_opp_gold_diff"))
    losses = _mapping_value(macro.get("losses"), "Macro losses section is invalid.")
    enemy_loss_dragons = _number_or_none(losses.get("avg_enemy_dragons"))
    timeline_available = _bool_or_none(data_quality.get("timeline_metrics_available"))

    if win_rate is not None and win_rate < 0.52 and role_opp_10_gold is not None and role_opp_10_gold < 0:
        candidates.append(
            PriorityCandidate(
                key="lane_leverage",
                theme="Early lane leverage",
                priority="high",
                reason="Negative early role-opponent gold and a sub-target win rate suggest lane setups or early stability are dragging later outcomes.",
                evidence=[
                    f"Overall win rate: {win_rate}",
                    f"10-minute role opponent gold diff: {role_opp_10_gold}"
                ]
            )
        )

    if enemy_loss_dragons is not None and enemy_loss_dragons >= 2:
        candidates.append(
            PriorityCandidate(
                key="macro_dragon_control",
                theme="Objective conversion",
                priority="high",
                reason="Losses are consistently associated with giving up dragon control, which points to map-state conversion problems.",
                evidence=[f"Average enemy dragons in losses: {enemy_loss_dragons}"]
            )
        )

    unstable_pool = _champion_pool_unstable(overview)
    if unstable_pool:
        candidates.append(
            PriorityCandidate(
                key="champion_pool_stability",
                theme="Champion pool stability",
                priority="medium",
                reason="The current champion distribution is spread enough that role clarity or repetition may be limiting stable performance patterns.",
                evidence=[unstable_pool]
            )
        )

    weakest_duration = _worst_row(duration_splits)
    if weakest_duration is not None:
        candidates.append(
            PriorityCandidate(
                key="duration_specific_conversion",
                theme="Game-phase conversion",
                priority="medium",
                reason="One duration bucket is materially underperforming and can guide more focused review.",
                evidence=[
                    f"Worst duration bucket: {_string_or_none(weakest_duration.get('label'))}",
                    f"Bucket win rate: {_number_or_none(weakest_duration.get('win_rate'))}"
                ]
            )
        )

    if (
        main_champion_win_rate is not None
        and win_rate is not None
        and main_champion_win_rate >= win_rate + 0.05
    ):
        candidates.append(
            PriorityCandidate(
                key="main_champion_specialization",
                theme="Champion specialization",
                priority="medium",
                reason="The main champion is outperforming the overall baseline, which suggests repeatable value in narrowing focus.",
                evidence=[
                    f"Overall win rate: {win_rate}",
                    f"Most played champion win rate: {main_champion_win_rate}"
                ]
            )
        )

    if total_games < 20:
        candidates.append(
            PriorityCandidate(
                key="sample_size_caution",
                theme="Sample-size caution",
                priority="low",
                reason="The sample is still small enough that stronger prescriptions should remain cautious.",
                evidence=[f"Matches analyzed: {total_games}"]
            )
        )

    if timeline_available is False:
        candidates.append(
            PriorityCandidate(
                key="timeline_gap",
                theme="Early-game uncertainty",
                priority="low",
                reason="Timeline-derived evidence is missing, so early-game coaching should be treated cautiously.",
                evidence=["Timeline metrics unavailable"]
            )
        )

    return candidates[:5]


def _champion_pool_unstable(overview: dict[str, object]) -> str | None:
    distribution = _as_list(overview.get("champion_pool_distribution"))
    top_champion = _mapping_from_index(distribution, 0)
    if top_champion is None:
        return None
    share = _number_or_none(top_champion.get("share"))
    games = _number_or_none(top_champion.get("games"))
    if share is not None and share < 0.45 and (games or 0) >= 3:
        return f"Top champion share: {share}"
    return None


def _best_row(rows: list[dict[str, object]]) -> dict[str, object] | None:
    return max(rows, key=lambda row: _number_or_none(row.get("win_rate")) or -1, default=None)


def _worst_row(rows: list[dict[str, object]]) -> dict[str, object] | None:
    return min(rows, key=lambda row: _number_or_none(row.get("win_rate")) or 10, default=None)


def _mapping_from_index(values: list[dict[str, object]], index: int) -> dict[str, object] | None:
    if not values:
        return None
    if index == -1:
        return values[-1]
    if 0 <= index < len(values):
        return values[index]
    return None


def _require_mapping(value: object, message: str) -> dict[str, object]:
    if not isinstance(value, dict):
        raise ReportValidationError(message)
    return {str(key): item for key, item in value.items()}


def _mapping_value(value: object, message: str) -> dict[str, object]:
    return _require_mapping(value, message)


def _require_list_of_mappings(value: object, message: str) -> list[dict[str, object]]:
    if not isinstance(value, list):
        raise ReportValidationError(message)
    output: list[dict[str, object]] = []
    for item in value:
        if not isinstance(item, dict):
            raise ReportValidationError(message)
        output.append({str(key): val for key, val in item.items()})
    return output


def _as_list(value: object) -> list[dict[str, object]]:
    if not isinstance(value, list):
        return []
    output: list[dict[str, object]] = []
    for item in value:
        if isinstance(item, dict):
            output.append({str(key): val for key, val in item.items()})
    return output


def _as_string_list(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item) for item in value]


def _require_string(value: object, message: str) -> str:
    if not isinstance(value, str) or value == "":
        raise ReportValidationError(message)
    return value


def _string_or_none(value: object) -> str | None:
    if value is None:
        return None
    return str(value)


def _number_or_none(value: object) -> int | float | None:
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, (int, float)):
        return value
    return None


def _bool_or_none(value: object) -> bool | None:
    if isinstance(value, bool):
        return value
    return None

from api_service.contextual_chat.contracts import ContextualChatGrounding
from api_service.reports.contracts import ReportInputContract, ReportOutput
from api_service.riot_profiles.models import RiotProfile


def build_artifact_digest(
    *,
    profile: RiotProfile,
    grounding: ContextualChatGrounding,
    report_input: ReportInputContract,
    report_output: ReportOutput
) -> dict[str, object]:
    top_priority = report_output.priority_levers[0] if report_output.priority_levers else None
    top_strength = report_output.strengths[0] if report_output.strengths else None
    top_weakness = report_output.weaknesses[0] if report_output.weaknesses else None
    next_action = report_output.next_actions[0] if report_output.next_actions else None

    data_quality_map = {signal.key: signal for signal in report_input.data_quality_flags}
    tracked_duo_available = _bool_or_none(data_quality_map.get("tracked_duo_available").value) if "tracked_duo_available" in data_quality_map else None
    timeline_available = _bool_or_none(data_quality_map.get("timeline_metrics_available").value) if "timeline_metrics_available" in data_quality_map else None
    event_available = _bool_or_none(data_quality_map.get("event_metrics_available").value) if "event_metrics_available" in data_quality_map else None
    limitations = _split_optional_text(data_quality_map.get("limitations").value if "limitations" in data_quality_map else None)

    unsupported_or_limited_areas = [
        "Exact last-match mistakes are not available from this displayed report artifact.",
        "Live patch, matchup, and itemization advice are outside the displayed artifact context.",
    ]
    if tracked_duo_available is False:
        unsupported_or_limited_areas.append("Tracked duo analysis is not available in the displayed artifact.")
    if timeline_available is False:
        unsupported_or_limited_areas.append("Timeline-derived early-game answers are limited in the displayed artifact.")
    if event_available is False:
        unsupported_or_limited_areas.append("Event-derived detail is limited in the displayed artifact.")
    if grounding.context_status == "stale":
        unsupported_or_limited_areas.append(
            f"Displayed coaching is stale relative to newer analytics run #{grounding.latest_completed_analytics_run_id}."
            if grounding.latest_completed_analytics_run_id is not None
            else "Displayed coaching may be stale relative to newer upstream analytics."
        )

    return {
        "context_overview": {
            "riot_id_display": profile.riot_id_display,
            "region": profile.region,
            "report_run_id": grounding.report_run_id,
            "analytics_run_id": grounding.analytics_run_id,
            "report_version": grounding.report_version,
            "analytics_version": grounding.analytics_version,
            "context_status": grounding.context_status,
            "confidence_level": report_output.confidence_and_limits.confidence_level,
        },
        "supported_question_areas": [
            "top coaching priority and why it was chosen",
            "reported player style and champion focus",
            "next actions for the next block of games",
            "main strengths and weaknesses surfaced by the displayed report",
            "confidence level and reported limitations",
        ],
        "unsupported_or_limited_areas": unsupported_or_limited_areas,
        "report_digest": {
            "executive_summary": {
                "headline": report_output.executive_summary.headline,
                "summary": report_output.executive_summary.summary,
            },
            "player_profile": {
                "primary_style": report_output.player_profile.primary_style,
                "champion_focus": report_output.player_profile.champion_focus,
                "supporting_traits": report_output.player_profile.supporting_traits,
            },
            "top_priority": _report_point_payload(top_priority),
            "top_strength": _report_point_payload(top_strength),
            "top_weakness": _report_point_payload(top_weakness),
            "top_next_action": {
                "action": next_action.action if next_action else None,
                "why": next_action.why if next_action else None,
                "timeframe": next_action.timeframe if next_action else None,
            },
            "confidence_and_limits": {
                "confidence_level": report_output.confidence_and_limits.confidence_level,
                "explanation": report_output.confidence_and_limits.explanation,
                "limitations": report_output.confidence_and_limits.limitations,
            },
        },
        "signal_digest": {
            "overview": _signal_rows(report_input.overview_signals, limit=4),
            "progression": _signal_rows(report_input.progression_signals, limit=4),
            "splits": _signal_rows(report_input.split_signals, limit=4),
            "macro": _signal_rows(report_input.macro_signals, limit=4),
            "early_mid": _signal_rows(report_input.early_mid_signals, limit=4),
            "data_quality": _signal_rows(report_input.data_quality_flags, limit=5),
            "priority_candidates": [
                {
                    "theme": candidate.theme,
                    "priority": candidate.priority,
                    "reason": candidate.reason,
                    "evidence": candidate.evidence,
                }
                for candidate in report_input.priority_candidates[:4]
            ],
        },
        "data_availability": {
            "tracked_duo_available": tracked_duo_available,
            "timeline_metrics_available": timeline_available,
            "event_metrics_available": event_available,
            "reported_limitations": limitations,
        },
    }


def _signal_rows(signals, *, limit: int) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    for signal in signals[:limit]:
        rows.append(
            {
                "key": signal.key,
                "label": signal.label,
                "value": signal.value,
                "evidence": signal.evidence,
            }
        )
    return rows


def _report_point_payload(point) -> dict[str, object] | None:
    if point is None:
        return None
    return {
        "title": point.title,
        "summary": point.summary,
        "evidence": point.evidence,
    }


def _bool_or_none(value: object) -> bool | None:
    if isinstance(value, bool):
        return value
    return None


def _split_optional_text(value: object) -> list[str]:
    if not isinstance(value, str) or value.strip() == "":
        return []
    return [item.strip() for item in value.split(",") if item.strip()]

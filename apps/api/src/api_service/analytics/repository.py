import json
import sqlite3
from dataclasses import dataclass
from pathlib import Path

from analytics_engine.models import (
    AnalyticsSnapshot,
    CleanEventRecord,
    CleanMatchRecord,
    CleanParticipantRecord,
    CleanTeamRecord,
    CleanTimelineRecord
)
from api_service.analytics.models import (
    AnalyticsRun,
    AnalyticsSummaryRecord,
    CreateAnalyticsRunInput,
    FinalizeAnalyticsRunInput
)
from api_service.core.config import Settings, get_settings
from fastapi import Depends


def initialize_analytics_storage(database_path: Path) -> None:
    database_path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(database_path) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS analytics_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                riot_profile_id INTEGER NOT NULL,
                status TEXT NOT NULL,
                started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                completed_at TEXT,
                error_message TEXT,
                matches_analyzed INTEGER NOT NULL DEFAULT 0,
                source_snapshot_type TEXT NOT NULL,
                analytics_version TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (riot_profile_id) REFERENCES riot_profiles(id) ON DELETE CASCADE
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS analytics_summaries (
                analytics_run_id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL,
                riot_profile_id INTEGER NOT NULL,
                analytics_version TEXT NOT NULL,
                source_snapshot_type TEXT NOT NULL,
                summary_json TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (analytics_run_id) REFERENCES analytics_runs(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (riot_profile_id) REFERENCES riot_profiles(id) ON DELETE CASCADE
            )
            """
        )
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_analytics_runs_user_id ON analytics_runs (user_id, id DESC)"
        )
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_analytics_summaries_user_id ON analytics_summaries (user_id, analytics_run_id DESC)"
        )
        connection.commit()


@dataclass(slots=True)
class AnalyticsRepository:
    database_path: Path

    def create_run(self, payload: CreateAnalyticsRunInput) -> AnalyticsRun:
        with sqlite3.connect(self.database_path) as connection:
            cursor = connection.execute(
                """
                INSERT INTO analytics_runs (
                    user_id,
                    riot_profile_id,
                    status,
                    source_snapshot_type,
                    analytics_version
                )
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    payload.user_id,
                    payload.riot_profile_id,
                    payload.status,
                    payload.source_snapshot_type,
                    payload.analytics_version
                )
            )
            run_id = int(cursor.lastrowid)
            connection.commit()

        run = self.get_run_by_id(run_id)
        if run is None:
            raise RuntimeError("Failed to load newly created analytics run.")
        return run

    def finalize_run(self, *, run_id: int, payload: FinalizeAnalyticsRunInput) -> AnalyticsRun:
        with sqlite3.connect(self.database_path) as connection:
            connection.execute(
                """
                UPDATE analytics_runs
                SET status = ?,
                    completed_at = CURRENT_TIMESTAMP,
                    error_message = ?,
                    matches_analyzed = ?
                WHERE id = ?
                """,
                (
                    payload.status,
                    payload.error_message,
                    payload.matches_analyzed,
                    run_id
                )
            )
            connection.commit()

        run = self.get_run_by_id(run_id)
        if run is None:
            raise RuntimeError("Failed to load finalized analytics run.")
        return run

    def list_runs_by_user_id(self, user_id: int) -> list[AnalyticsRun]:
        with sqlite3.connect(self.database_path) as connection:
            cursor = connection.execute(
                """
                SELECT id, user_id, riot_profile_id, status, started_at, completed_at,
                       error_message, matches_analyzed, source_snapshot_type, analytics_version
                FROM analytics_runs
                WHERE user_id = ?
                ORDER BY id DESC
                """,
                (user_id,)
            )
            rows = cursor.fetchall()
        return [self._row_to_run(row) for row in rows]

    def get_run_by_id(self, run_id: int) -> AnalyticsRun | None:
        with sqlite3.connect(self.database_path) as connection:
            cursor = connection.execute(
                """
                SELECT id, user_id, riot_profile_id, status, started_at, completed_at,
                       error_message, matches_analyzed, source_snapshot_type, analytics_version
                FROM analytics_runs
                WHERE id = ?
                """,
                (run_id,)
            )
            row = cursor.fetchone()
        return self._row_to_run(row) if row else None

    def get_owned_run(self, *, user_id: int, run_id: int) -> AnalyticsRun | None:
        with sqlite3.connect(self.database_path) as connection:
            cursor = connection.execute(
                """
                SELECT id, user_id, riot_profile_id, status, started_at, completed_at,
                       error_message, matches_analyzed, source_snapshot_type, analytics_version
                FROM analytics_runs
                WHERE id = ? AND user_id = ?
                """,
                (run_id, user_id)
            )
            row = cursor.fetchone()
        return self._row_to_run(row) if row else None

    def get_latest_completed_run_for_profile(
        self,
        *,
        user_id: int,
        riot_profile_id: int
    ) -> AnalyticsRun | None:
        with sqlite3.connect(self.database_path) as connection:
            cursor = connection.execute(
                """
                SELECT id, user_id, riot_profile_id, status, started_at, completed_at,
                       error_message, matches_analyzed, source_snapshot_type, analytics_version
                FROM analytics_runs
                WHERE user_id = ?
                  AND riot_profile_id = ?
                  AND status = 'completed'
                ORDER BY id DESC
                LIMIT 1
                """,
                (user_id, riot_profile_id)
            )
            row = cursor.fetchone()
        return self._row_to_run(row) if row else None

    def upsert_summary(
        self,
        *,
        analytics_run_id: int,
        user_id: int,
        riot_profile_id: int,
        analytics_version: str,
        source_snapshot_type: str,
        summary: dict[str, object]
    ) -> AnalyticsSummaryRecord:
        summary_json = json.dumps(summary, separators=(",", ":"), sort_keys=True)
        with sqlite3.connect(self.database_path) as connection:
            connection.execute(
                """
                INSERT INTO analytics_summaries (
                    analytics_run_id,
                    user_id,
                    riot_profile_id,
                    analytics_version,
                    source_snapshot_type,
                    summary_json
                )
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(analytics_run_id) DO UPDATE SET
                    user_id = excluded.user_id,
                    riot_profile_id = excluded.riot_profile_id,
                    analytics_version = excluded.analytics_version,
                    source_snapshot_type = excluded.source_snapshot_type,
                    summary_json = excluded.summary_json,
                    created_at = CURRENT_TIMESTAMP
                """,
                (
                    analytics_run_id,
                    user_id,
                    riot_profile_id,
                    analytics_version,
                    source_snapshot_type,
                    summary_json
                )
            )
            connection.commit()
        summary_record = self.get_owned_summary(user_id=user_id, run_id=analytics_run_id)
        if summary_record is None:
            raise RuntimeError("Failed to load analytics summary.")
        return summary_record

    def get_owned_summary(self, *, user_id: int, run_id: int) -> AnalyticsSummaryRecord | None:
        with sqlite3.connect(self.database_path) as connection:
            cursor = connection.execute(
                """
                SELECT analytics_run_id, user_id, riot_profile_id, analytics_version,
                       source_snapshot_type, summary_json, created_at
                FROM analytics_summaries
                WHERE analytics_run_id = ? AND user_id = ?
                """,
                (run_id, user_id)
            )
            row = cursor.fetchone()
        return self._row_to_summary(row) if row else None

    def load_clean_snapshot(self, *, riot_profile_id: int) -> AnalyticsSnapshot:
        return AnalyticsSnapshot(
            matches=self._load_matches(riot_profile_id=riot_profile_id),
            participants=self._load_participants(riot_profile_id=riot_profile_id),
            teams=self._load_teams(riot_profile_id=riot_profile_id),
            timeline_rows=self._load_timeline_rows(riot_profile_id=riot_profile_id),
            events=self._load_events(riot_profile_id=riot_profile_id)
        )

    def _load_matches(self, *, riot_profile_id: int) -> list[CleanMatchRecord]:
        with sqlite3.connect(self.database_path) as connection:
            cursor = connection.execute(
                """
                SELECT match_id, riot_profile_id, user_id, win, champion_name, game_creation_utc,
                       game_start_utc, game_end_utc, duration_seconds, player_participant_id,
                       player_team_id, player_side, team_position, role_opp_participant_id,
                       kills, deaths, assists, kda_calc, gold_earned, cs_total,
                       cs_per_min_calc, vision_per_min_calc, dpm_calc,
                       total_damage_dealt_to_champions, timeline_available
                FROM matches_clean
                WHERE riot_profile_id = ?
                ORDER BY game_start_utc ASC, match_id ASC
                """,
                (riot_profile_id,)
            )
            rows = cursor.fetchall()
        return [
            CleanMatchRecord(
                match_id=str(row[0]),
                riot_profile_id=int(row[1]),
                user_id=int(row[2]),
                win=bool(row[3]),
                champion_name=str(row[4]) if row[4] is not None else None,
                game_creation_utc=str(row[5]) if row[5] is not None else None,
                game_start_utc=str(row[6]) if row[6] is not None else None,
                game_end_utc=str(row[7]) if row[7] is not None else None,
                duration_seconds=float(row[8]) if row[8] is not None else None,
                player_participant_id=int(row[9]),
                player_team_id=int(row[10]),
                player_side=str(row[11]),
                team_position=str(row[12]) if row[12] is not None else None,
                role_opp_participant_id=int(row[13]) if row[13] is not None else None,
                kills=int(row[14]) if row[14] is not None else None,
                deaths=int(row[15]) if row[15] is not None else None,
                assists=int(row[16]) if row[16] is not None else None,
                kda_calc=float(row[17]) if row[17] is not None else None,
                gold_earned=int(row[18]) if row[18] is not None else None,
                cs_total=int(row[19]) if row[19] is not None else None,
                cs_per_min_calc=float(row[20]) if row[20] is not None else None,
                vision_per_min_calc=float(row[21]) if row[21] is not None else None,
                dpm_calc=float(row[22]) if row[22] is not None else None,
                total_damage_dealt_to_champions=int(row[23]) if row[23] is not None else None,
                timeline_available=bool(row[24])
            )
            for row in rows
        ]

    def _load_participants(self, *, riot_profile_id: int) -> list[CleanParticipantRecord]:
        with sqlite3.connect(self.database_path) as connection:
            cursor = connection.execute(
                """
                SELECT match_id, participant_id, relation_to_target, team_id, side, win,
                       champion_name, team_position, kills, deaths, assists, kda_calc,
                       gold_earned, cs_total, total_damage_dealt_to_champions
                FROM participants_clean
                WHERE riot_profile_id = ?
                ORDER BY match_id ASC, participant_id ASC
                """,
                (riot_profile_id,)
            )
            rows = cursor.fetchall()
        return [
            CleanParticipantRecord(
                match_id=str(row[0]),
                participant_id=int(row[1]),
                relation_to_target=str(row[2]),
                team_id=int(row[3]),
                side=str(row[4]),
                win=bool(row[5]),
                champion_name=str(row[6]) if row[6] is not None else None,
                team_position=str(row[7]) if row[7] is not None else None,
                kills=int(row[8]) if row[8] is not None else None,
                deaths=int(row[9]) if row[9] is not None else None,
                assists=int(row[10]) if row[10] is not None else None,
                kda_calc=float(row[11]) if row[11] is not None else None,
                gold_earned=int(row[12]) if row[12] is not None else None,
                cs_total=int(row[13]) if row[13] is not None else None,
                total_damage_dealt_to_champions=int(row[14]) if row[14] is not None else None
            )
            for row in rows
        ]

    def _load_teams(self, *, riot_profile_id: int) -> list[CleanTeamRecord]:
        with sqlite3.connect(self.database_path) as connection:
            cursor = connection.execute(
                """
                SELECT match_id, team_id, side, win, champion_kills_sum, dragon_kills,
                       herald_kills, baron_kills, tower_kills, inhibitor_kills
                FROM teams_clean
                WHERE riot_profile_id = ?
                ORDER BY match_id ASC, team_id ASC
                """,
                (riot_profile_id,)
            )
            rows = cursor.fetchall()
        return [
            CleanTeamRecord(
                match_id=str(row[0]),
                team_id=int(row[1]),
                side=str(row[2]),
                win=bool(row[3]),
                champion_kills_sum=int(row[4]),
                dragon_kills=int(row[5]) if row[5] is not None else None,
                herald_kills=int(row[6]) if row[6] is not None else None,
                baron_kills=int(row[7]) if row[7] is not None else None,
                tower_kills=int(row[8]) if row[8] is not None else None,
                inhibitor_kills=int(row[9]) if row[9] is not None else None
            )
            for row in rows
        ]

    def _load_timeline_rows(self, *, riot_profile_id: int) -> list[CleanTimelineRecord]:
        with sqlite3.connect(self.database_path) as connection:
            cursor = connection.execute(
                """
                SELECT match_id, participant_id, frame_timestamp_ms, total_gold, level,
                       xp, minions_killed, jungle_minions_killed
                FROM timeline_clean
                WHERE riot_profile_id = ?
                ORDER BY match_id ASC, participant_id ASC, frame_timestamp_ms ASC
                """,
                (riot_profile_id,)
            )
            rows = cursor.fetchall()
        return [
            CleanTimelineRecord(
                match_id=str(row[0]),
                participant_id=int(row[1]),
                frame_timestamp_ms=int(row[2]),
                total_gold=int(row[3]) if row[3] is not None else None,
                level=int(row[4]) if row[4] is not None else None,
                xp=int(row[5]) if row[5] is not None else None,
                minions_killed=int(row[6]) if row[6] is not None else None,
                jungle_minions_killed=int(row[7]) if row[7] is not None else None
            )
            for row in rows
        ]

    def _load_events(self, *, riot_profile_id: int) -> list[CleanEventRecord]:
        with sqlite3.connect(self.database_path) as connection:
            cursor = connection.execute(
                """
                SELECT match_id, timestamp_ms, event_type, participant_id, killer_id,
                       victim_id, assisting_participant_ids_json, player_involved
                FROM events_clean
                WHERE riot_profile_id = ?
                ORDER BY match_id ASC, timestamp_ms ASC, id ASC
                """,
                (riot_profile_id,)
            )
            rows = cursor.fetchall()
        return [
            CleanEventRecord(
                match_id=str(row[0]),
                timestamp_ms=int(row[1]),
                event_type=str(row[2]),
                participant_id=int(row[3]) if row[3] is not None else None,
                killer_id=int(row[4]) if row[4] is not None else None,
                victim_id=int(row[5]) if row[5] is not None else None,
                assisting_participant_ids=_json_int_list(row[6]),
                player_involved=bool(row[7])
            )
            for row in rows
        ]

    @staticmethod
    def _row_to_run(row: tuple[object, ...]) -> AnalyticsRun:
        return AnalyticsRun(
            id=int(row[0]),
            user_id=int(row[1]),
            riot_profile_id=int(row[2]),
            status=str(row[3]),
            started_at=str(row[4]),
            completed_at=str(row[5]) if row[5] is not None else None,
            error_message=str(row[6]) if row[6] is not None else None,
            matches_analyzed=int(row[7]),
            source_snapshot_type=str(row[8]),
            analytics_version=str(row[9])
        )

    @staticmethod
    def _row_to_summary(row: tuple[object, ...]) -> AnalyticsSummaryRecord:
        return AnalyticsSummaryRecord(
            analytics_run_id=int(row[0]),
            user_id=int(row[1]),
            riot_profile_id=int(row[2]),
            analytics_version=str(row[3]),
            source_snapshot_type=str(row[4]),
            summary_json=str(row[5]),
            created_at=str(row[6])
        )


def _json_int_list(value: object) -> list[int]:
    if value is None:
        return []
    try:
        payload = json.loads(str(value))
    except json.JSONDecodeError:
        return []
    if not isinstance(payload, list):
        return []
    output: list[int] = []
    for item in payload:
        if isinstance(item, bool):
            output.append(int(item))
        elif isinstance(item, int):
            output.append(item)
    return output


def build_analytics_repository(
    settings: Settings = Depends(get_settings)
) -> AnalyticsRepository:
    return AnalyticsRepository(database_path=settings.sqlite_database_path)

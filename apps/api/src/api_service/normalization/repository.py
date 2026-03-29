import sqlite3
from dataclasses import dataclass
from pathlib import Path

from api_service.core.config import Settings, get_settings
from api_service.normalization.models import (
    CanonicalRawMatchSource,
    CreateNormalizationRunInput,
    EventCleanRecord,
    FinalizeNormalizationRunInput,
    MatchCleanRecord,
    NormalizationRun,
    ParticipantCleanRecord,
    TeamCleanRecord,
    TimelineCleanRecord
)
from fastapi import Depends


def initialize_normalization_storage(database_path: Path) -> None:
    database_path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(database_path) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS normalization_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                riot_profile_id INTEGER NOT NULL,
                status TEXT NOT NULL,
                started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                completed_at TEXT,
                error_message TEXT,
                raw_match_rows_scanned INTEGER NOT NULL DEFAULT 0,
                unique_matches_normalized INTEGER NOT NULL DEFAULT 0,
                participants_rows_written INTEGER NOT NULL DEFAULT 0,
                teams_rows_written INTEGER NOT NULL DEFAULT 0,
                timeline_rows_written INTEGER NOT NULL DEFAULT 0,
                events_rows_written INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (riot_profile_id) REFERENCES riot_profiles(id) ON DELETE CASCADE
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS matches_clean (
                match_id TEXT NOT NULL,
                riot_profile_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                queue_id INTEGER,
                map_id INTEGER,
                game_mode TEXT,
                game_type TEXT,
                game_version TEXT,
                platform_id TEXT,
                game_creation_utc TEXT,
                game_start_utc TEXT,
                game_end_utc TEXT,
                duration_seconds REAL,
                player_puuid TEXT NOT NULL,
                player_participant_id INTEGER NOT NULL,
                player_team_id INTEGER NOT NULL,
                player_side TEXT NOT NULL,
                win INTEGER NOT NULL,
                champion_name TEXT,
                champion_id INTEGER,
                team_position TEXT,
                individual_position TEXT,
                lane TEXT,
                role TEXT,
                kills INTEGER,
                deaths INTEGER,
                assists INTEGER,
                kda_calc REAL,
                gold_earned INTEGER,
                gold_spent INTEGER,
                cs_total INTEGER,
                cs_per_min_calc REAL,
                vision_score INTEGER,
                vision_per_min_calc REAL,
                total_damage_dealt_to_champions INTEGER,
                dpm_calc REAL,
                total_damage_taken INTEGER,
                damage_dealt_to_objectives INTEGER,
                damage_dealt_to_buildings INTEGER,
                dragon_kills INTEGER,
                baron_kills INTEGER,
                turret_kills INTEGER,
                inhibitor_kills INTEGER,
                summoner1_id INTEGER,
                summoner2_id INTEGER,
                item0 INTEGER,
                item1 INTEGER,
                item2 INTEGER,
                item3 INTEGER,
                item4 INTEGER,
                item5 INTEGER,
                item6 INTEGER,
                perk_primary_style INTEGER,
                perk_sub_style INTEGER,
                perk_primary_selection_1 INTEGER,
                perk_primary_selection_2 INTEGER,
                perk_primary_selection_3 INTEGER,
                perk_primary_selection_4 INTEGER,
                perk_sub_selection_1 INTEGER,
                perk_sub_selection_2 INTEGER,
                role_opp_participant_id INTEGER,
                role_opp_puuid TEXT,
                role_opp_champion_name TEXT,
                role_opp_champion_id INTEGER,
                timeline_available INTEGER NOT NULL,
                raw_source_run_id INTEGER NOT NULL,
                raw_source_payload_id INTEGER NOT NULL,
                PRIMARY KEY (match_id, riot_profile_id)
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS participants_clean (
                match_id TEXT NOT NULL,
                riot_profile_id INTEGER NOT NULL,
                participant_id INTEGER NOT NULL,
                puuid TEXT,
                riot_id TEXT,
                side TEXT NOT NULL,
                team_id INTEGER NOT NULL,
                win INTEGER NOT NULL,
                champion_name TEXT,
                champion_id INTEGER,
                team_position TEXT,
                individual_position TEXT,
                kills INTEGER,
                deaths INTEGER,
                assists INTEGER,
                kda_calc REAL,
                gold_earned INTEGER,
                gold_spent INTEGER,
                cs_total INTEGER,
                cs_per_min_calc REAL,
                vision_score INTEGER,
                vision_per_min_calc REAL,
                total_damage_dealt_to_champions INTEGER,
                dpm_calc REAL,
                total_damage_taken INTEGER,
                damage_dealt_to_objectives INTEGER,
                damage_dealt_to_buildings INTEGER,
                dragon_kills INTEGER,
                baron_kills INTEGER,
                turret_kills INTEGER,
                inhibitor_kills INTEGER,
                summoner1_id INTEGER,
                summoner2_id INTEGER,
                item0 INTEGER,
                item1 INTEGER,
                item2 INTEGER,
                item3 INTEGER,
                item4 INTEGER,
                item5 INTEGER,
                item6 INTEGER,
                perk_primary_style INTEGER,
                perk_sub_style INTEGER,
                perk_primary_selection_1 INTEGER,
                perk_primary_selection_2 INTEGER,
                perk_primary_selection_3 INTEGER,
                perk_primary_selection_4 INTEGER,
                perk_sub_selection_1 INTEGER,
                perk_sub_selection_2 INTEGER,
                relation_to_target TEXT NOT NULL,
                PRIMARY KEY (match_id, riot_profile_id, participant_id)
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS teams_clean (
                match_id TEXT NOT NULL,
                riot_profile_id INTEGER NOT NULL,
                team_id INTEGER NOT NULL,
                side TEXT NOT NULL,
                win INTEGER NOT NULL,
                bans_json TEXT NOT NULL,
                champion_kills_sum INTEGER NOT NULL,
                baron_first INTEGER,
                baron_kills INTEGER,
                dragon_first INTEGER,
                dragon_kills INTEGER,
                horde_first INTEGER,
                horde_kills INTEGER,
                herald_first INTEGER,
                herald_kills INTEGER,
                inhibitor_first INTEGER,
                inhibitor_kills INTEGER,
                tower_first INTEGER,
                tower_kills INTEGER,
                champion_first INTEGER,
                PRIMARY KEY (match_id, riot_profile_id, team_id)
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS timeline_clean (
                match_id TEXT NOT NULL,
                riot_profile_id INTEGER NOT NULL,
                participant_id INTEGER NOT NULL,
                frame_timestamp_ms INTEGER NOT NULL,
                total_gold INTEGER,
                current_gold INTEGER,
                level INTEGER,
                xp INTEGER,
                minions_killed INTEGER,
                jungle_minions_killed INTEGER,
                position_x INTEGER,
                position_y INTEGER
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS events_clean (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                match_id TEXT NOT NULL,
                riot_profile_id INTEGER NOT NULL,
                timestamp_ms INTEGER NOT NULL,
                event_type TEXT NOT NULL,
                participant_id INTEGER,
                killer_id INTEGER,
                victim_id INTEGER,
                assisting_participant_ids_json TEXT,
                team_id INTEGER,
                lane_type TEXT,
                building_type TEXT,
                tower_type TEXT,
                monster_type TEXT,
                monster_sub_type TEXT,
                item_id INTEGER,
                skill_slot INTEGER,
                level_up_type TEXT,
                ward_type TEXT,
                position_x INTEGER,
                position_y INTEGER,
                player_involved INTEGER NOT NULL
            )
            """
        )
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_normalization_runs_user_id ON normalization_runs (user_id, id DESC)"
        )
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_matches_clean_profile_id ON matches_clean (riot_profile_id, match_id)"
        )
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_participants_clean_profile_id ON participants_clean (riot_profile_id, match_id)"
        )
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_teams_clean_profile_id ON teams_clean (riot_profile_id, match_id)"
        )
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_timeline_clean_profile_id ON timeline_clean (riot_profile_id, match_id)"
        )
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_events_clean_profile_id ON events_clean (riot_profile_id, match_id)"
        )
        connection.commit()


@dataclass(slots=True)
class NormalizationRepository:
    database_path: Path

    def create_run(self, payload: CreateNormalizationRunInput) -> NormalizationRun:
        with sqlite3.connect(self.database_path) as connection:
            cursor = connection.execute(
                """
                INSERT INTO normalization_runs (user_id, riot_profile_id, status)
                VALUES (?, ?, ?)
                """,
                (payload.user_id, payload.riot_profile_id, payload.status)
            )
            run_id = int(cursor.lastrowid)
            connection.commit()
        run = self.get_run_by_id(run_id)
        if run is None:
            raise RuntimeError("Failed to load newly created normalization run.")
        return run

    def finalize_run(
        self,
        *,
        run_id: int,
        payload: FinalizeNormalizationRunInput
    ) -> NormalizationRun:
        with sqlite3.connect(self.database_path) as connection:
            connection.execute(
                """
                UPDATE normalization_runs
                SET status = ?,
                    completed_at = CURRENT_TIMESTAMP,
                    error_message = ?,
                    raw_match_rows_scanned = ?,
                    unique_matches_normalized = ?,
                    participants_rows_written = ?,
                    teams_rows_written = ?,
                    timeline_rows_written = ?,
                    events_rows_written = ?
                WHERE id = ?
                """,
                (
                    payload.status,
                    payload.error_message,
                    payload.raw_match_rows_scanned,
                    payload.unique_matches_normalized,
                    payload.participants_rows_written,
                    payload.teams_rows_written,
                    payload.timeline_rows_written,
                    payload.events_rows_written,
                    run_id
                )
            )
            connection.commit()
        run = self.get_run_by_id(run_id)
        if run is None:
            raise RuntimeError("Failed to load finalized normalization run.")
        return run

    def list_runs_by_user_id(self, user_id: int) -> list[NormalizationRun]:
        with sqlite3.connect(self.database_path) as connection:
            cursor = connection.execute(
                """
                SELECT id, user_id, riot_profile_id, status, started_at, completed_at, error_message,
                       raw_match_rows_scanned, unique_matches_normalized, participants_rows_written,
                       teams_rows_written, timeline_rows_written, events_rows_written
                FROM normalization_runs
                WHERE user_id = ?
                ORDER BY id DESC
                """,
                (user_id,)
            )
            rows = cursor.fetchall()
        return [self._row_to_run(row) for row in rows]

    def get_run_by_id(self, run_id: int) -> NormalizationRun | None:
        with sqlite3.connect(self.database_path) as connection:
            cursor = connection.execute(
                """
                SELECT id, user_id, riot_profile_id, status, started_at, completed_at, error_message,
                       raw_match_rows_scanned, unique_matches_normalized, participants_rows_written,
                       teams_rows_written, timeline_rows_written, events_rows_written
                FROM normalization_runs
                WHERE id = ?
                """,
                (run_id,)
            )
            row = cursor.fetchone()
        return self._row_to_run(row) if row else None

    def get_owned_run(self, *, user_id: int, run_id: int) -> NormalizationRun | None:
        with sqlite3.connect(self.database_path) as connection:
            cursor = connection.execute(
                """
                SELECT id, user_id, riot_profile_id, status, started_at, completed_at, error_message,
                       raw_match_rows_scanned, unique_matches_normalized, participants_rows_written,
                       teams_rows_written, timeline_rows_written, events_rows_written
                FROM normalization_runs
                WHERE id = ? AND user_id = ?
                """,
                (run_id, user_id)
            )
            row = cursor.fetchone()
        return self._row_to_run(row) if row else None

    def list_canonical_raw_sources(self, *, riot_profile_id: int) -> list[CanonicalRawMatchSource]:
        with sqlite3.connect(self.database_path) as connection:
            cursor = connection.execute(
                """
                SELECT raw.id, raw.ingestion_run_id, raw.riot_profile_id, runs.user_id, raw.match_id,
                       raw.queue_id, raw.game_version, raw.platform_id, raw.raw_match_json,
                       raw.raw_timeline_json, raw.ingested_at
                FROM raw_match_payloads AS raw
                INNER JOIN ingestion_runs AS runs
                    ON runs.id = raw.ingestion_run_id
                INNER JOIN (
                    SELECT candidate_raw.match_id, MAX(candidate_raw.id) AS canonical_raw_id
                    FROM raw_match_payloads AS candidate_raw
                    INNER JOIN ingestion_runs AS candidate_runs
                        ON candidate_runs.id = candidate_raw.ingestion_run_id
                    WHERE candidate_raw.riot_profile_id = ?
                      AND candidate_runs.status = 'completed'
                    GROUP BY match_id
                ) AS canonical
                    ON canonical.canonical_raw_id = raw.id
                WHERE raw.riot_profile_id = ?
                  AND runs.status = 'completed'
                ORDER BY raw.match_id ASC
                """,
                (riot_profile_id, riot_profile_id)
            )
            rows = cursor.fetchall()
        return [self._row_to_canonical_raw_source(row) for row in rows]

    def count_raw_rows_for_profile(self, *, riot_profile_id: int) -> int:
        with sqlite3.connect(self.database_path) as connection:
            cursor = connection.execute(
                """
                SELECT COUNT(*)
                FROM raw_match_payloads AS raw
                INNER JOIN ingestion_runs AS runs
                    ON runs.id = raw.ingestion_run_id
                WHERE raw.riot_profile_id = ?
                  AND runs.status = 'completed'
                """,
                (riot_profile_id,)
            )
            row = cursor.fetchone()
        return int(row[0]) if row else 0

    def replace_clean_snapshot(
        self,
        *,
        riot_profile_id: int,
        matches: list[MatchCleanRecord],
        participants: list[ParticipantCleanRecord],
        teams: list[TeamCleanRecord],
        timeline_rows: list[TimelineCleanRecord],
        event_rows: list[EventCleanRecord]
    ) -> None:
        with sqlite3.connect(self.database_path) as connection:
            connection.execute("BEGIN")
            connection.execute("DELETE FROM matches_clean WHERE riot_profile_id = ?", (riot_profile_id,))
            connection.execute("DELETE FROM participants_clean WHERE riot_profile_id = ?", (riot_profile_id,))
            connection.execute("DELETE FROM teams_clean WHERE riot_profile_id = ?", (riot_profile_id,))
            connection.execute("DELETE FROM timeline_clean WHERE riot_profile_id = ?", (riot_profile_id,))
            connection.execute("DELETE FROM events_clean WHERE riot_profile_id = ?", (riot_profile_id,))
            self._insert_matches(connection, matches)
            self._insert_participants(connection, participants)
            self._insert_teams(connection, teams)
            self._insert_timeline_rows(connection, timeline_rows)
            self._insert_event_rows(connection, event_rows)
            connection.commit()

    def _insert_matches(self, connection: sqlite3.Connection, matches: list[MatchCleanRecord]) -> None:
        if not matches:
            return
        connection.executemany(
            """
            INSERT INTO matches_clean VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            )
            """,
            [self._match_tuple(match) for match in matches]
        )

    def _insert_participants(
        self,
        connection: sqlite3.Connection,
        participants: list[ParticipantCleanRecord]
    ) -> None:
        if not participants:
            return
        connection.executemany(
            """
            INSERT INTO participants_clean VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            )
            """,
            [self._participant_tuple(participant) for participant in participants]
        )

    def _insert_teams(self, connection: sqlite3.Connection, teams: list[TeamCleanRecord]) -> None:
        if not teams:
            return
        connection.executemany(
            """
            INSERT INTO teams_clean VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            )
            """,
            [self._team_tuple(team) for team in teams]
        )

    def _insert_timeline_rows(
        self,
        connection: sqlite3.Connection,
        timeline_rows: list[TimelineCleanRecord]
    ) -> None:
        if not timeline_rows:
            return
        connection.executemany(
            "INSERT INTO timeline_clean VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [self._timeline_tuple(row) for row in timeline_rows]
        )

    def _insert_event_rows(
        self,
        connection: sqlite3.Connection,
        event_rows: list[EventCleanRecord]
    ) -> None:
        if not event_rows:
            return
        connection.executemany(
            """
            INSERT INTO events_clean (
                match_id, riot_profile_id, timestamp_ms, event_type, participant_id,
                killer_id, victim_id, assisting_participant_ids_json, team_id, lane_type,
                building_type, tower_type, monster_type, monster_sub_type, item_id,
                skill_slot, level_up_type, ward_type, position_x, position_y, player_involved
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [self._event_tuple(row) for row in event_rows]
        )

    @staticmethod
    def _match_tuple(match: MatchCleanRecord) -> tuple[object, ...]:
        return (
            match.match_id, match.riot_profile_id, match.user_id, match.queue_id, match.map_id,
            match.game_mode, match.game_type, match.game_version, match.platform_id,
            match.game_creation_utc, match.game_start_utc, match.game_end_utc,
            match.duration_seconds, match.player_puuid, match.player_participant_id,
            match.player_team_id, match.player_side, int(match.win), match.champion_name,
            match.champion_id, match.team_position, match.individual_position, match.lane,
            match.role, match.kills, match.deaths, match.assists, match.kda_calc,
            match.gold_earned, match.gold_spent, match.cs_total, match.cs_per_min_calc,
            match.vision_score, match.vision_per_min_calc,
            match.total_damage_dealt_to_champions, match.dpm_calc, match.total_damage_taken,
            match.damage_dealt_to_objectives, match.damage_dealt_to_buildings,
            match.dragon_kills, match.baron_kills, match.turret_kills,
            match.inhibitor_kills, match.summoner1_id, match.summoner2_id, match.item0,
            match.item1, match.item2, match.item3, match.item4, match.item5, match.item6,
            match.perk_primary_style, match.perk_sub_style, match.perk_primary_selection_1,
            match.perk_primary_selection_2, match.perk_primary_selection_3,
            match.perk_primary_selection_4, match.perk_sub_selection_1,
            match.perk_sub_selection_2, match.role_opp_participant_id, match.role_opp_puuid,
            match.role_opp_champion_name, match.role_opp_champion_id,
            int(match.timeline_available), match.raw_source_run_id, match.raw_source_payload_id
        )

    @staticmethod
    def _participant_tuple(participant: ParticipantCleanRecord) -> tuple[object, ...]:
        return (
            participant.match_id, participant.riot_profile_id, participant.participant_id,
            participant.puuid, participant.riot_id, participant.side, participant.team_id,
            int(participant.win), participant.champion_name, participant.champion_id,
            participant.team_position, participant.individual_position, participant.kills,
            participant.deaths, participant.assists, participant.kda_calc,
            participant.gold_earned, participant.gold_spent, participant.cs_total,
            participant.cs_per_min_calc, participant.vision_score, participant.vision_per_min_calc,
            participant.total_damage_dealt_to_champions, participant.dpm_calc,
            participant.total_damage_taken, participant.damage_dealt_to_objectives,
            participant.damage_dealt_to_buildings, participant.dragon_kills,
            participant.baron_kills, participant.turret_kills, participant.inhibitor_kills,
            participant.summoner1_id, participant.summoner2_id, participant.item0,
            participant.item1, participant.item2, participant.item3, participant.item4,
            participant.item5, participant.item6, participant.perk_primary_style,
            participant.perk_sub_style, participant.perk_primary_selection_1,
            participant.perk_primary_selection_2, participant.perk_primary_selection_3,
            participant.perk_primary_selection_4, participant.perk_sub_selection_1,
            participant.perk_sub_selection_2, participant.relation_to_target
        )

    @staticmethod
    def _team_tuple(team: TeamCleanRecord) -> tuple[object, ...]:
        return (
            team.match_id, team.riot_profile_id, team.team_id, team.side, int(team.win),
            team.bans_json, team.champion_kills_sum, _bool_to_db(team.baron_first),
            team.baron_kills, _bool_to_db(team.dragon_first), team.dragon_kills,
            _bool_to_db(team.horde_first), team.horde_kills, _bool_to_db(team.herald_first),
            team.herald_kills, _bool_to_db(team.inhibitor_first), team.inhibitor_kills,
            _bool_to_db(team.tower_first), team.tower_kills, _bool_to_db(team.champion_first)
        )

    @staticmethod
    def _timeline_tuple(row: TimelineCleanRecord) -> tuple[object, ...]:
        return (
            row.match_id, row.riot_profile_id, row.participant_id, row.frame_timestamp_ms,
            row.total_gold, row.current_gold, row.level, row.xp, row.minions_killed,
            row.jungle_minions_killed, row.position_x, row.position_y
        )

    @staticmethod
    def _event_tuple(row: EventCleanRecord) -> tuple[object, ...]:
        return (
            row.match_id, row.riot_profile_id, row.timestamp_ms, row.event_type,
            row.participant_id, row.killer_id, row.victim_id,
            row.assisting_participant_ids_json, row.team_id, row.lane_type,
            row.building_type, row.tower_type, row.monster_type, row.monster_sub_type,
            row.item_id, row.skill_slot, row.level_up_type, row.ward_type,
            row.position_x, row.position_y, int(row.player_involved)
        )

    @staticmethod
    def _row_to_run(row: tuple[object, ...]) -> NormalizationRun:
        return NormalizationRun(
            id=int(row[0]),
            user_id=int(row[1]),
            riot_profile_id=int(row[2]),
            status=str(row[3]),
            started_at=str(row[4]),
            completed_at=str(row[5]) if row[5] is not None else None,
            error_message=str(row[6]) if row[6] is not None else None,
            raw_match_rows_scanned=int(row[7]),
            unique_matches_normalized=int(row[8]),
            participants_rows_written=int(row[9]),
            teams_rows_written=int(row[10]),
            timeline_rows_written=int(row[11]),
            events_rows_written=int(row[12])
        )

    @staticmethod
    def _row_to_canonical_raw_source(row: tuple[object, ...]) -> CanonicalRawMatchSource:
        return CanonicalRawMatchSource(
            raw_source_payload_id=int(row[0]),
            raw_source_run_id=int(row[1]),
            riot_profile_id=int(row[2]),
            user_id=int(row[3]),
            match_id=str(row[4]),
            queue_id=int(row[5]),
            game_version=str(row[6]) if row[6] is not None else None,
            platform_id=str(row[7]) if row[7] is not None else None,
            raw_match_json=str(row[8]),
            raw_timeline_json=str(row[9]),
            ingested_at=str(row[10])
        )


def _bool_to_db(value: bool | None) -> int | None:
    if value is None:
        return None
    return int(value)


def build_normalization_repository(
    settings: Settings = Depends(get_settings)
) -> NormalizationRepository:
    return NormalizationRepository(database_path=settings.sqlite_database_path)

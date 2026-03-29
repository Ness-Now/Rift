import sqlite3
from dataclasses import dataclass
from pathlib import Path

from api_service.core.config import Settings, get_settings
from api_service.ingestion.models import (
    CreateIngestionRunInput,
    CreateRawMatchPayloadInput,
    FinalizeIngestionRunInput,
    IngestionRun,
    RawMatchPayloadRecord
)
from fastapi import Depends


def initialize_ingestion_storage(database_path: Path) -> None:
    database_path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(database_path) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS ingestion_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                riot_profile_id INTEGER NOT NULL,
                status TEXT NOT NULL,
                requested_max_matches INTEGER NOT NULL,
                queue_id INTEGER NOT NULL,
                started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                completed_at TEXT,
                error_message TEXT,
                match_ids_requested INTEGER NOT NULL DEFAULT 0,
                match_ids_ingested_count INTEGER NOT NULL DEFAULT 0,
                match_payloads_ingested_count INTEGER NOT NULL DEFAULT 0,
                timeline_payloads_ingested_count INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (riot_profile_id) REFERENCES riot_profiles(id) ON DELETE CASCADE
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS raw_match_payloads (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ingestion_run_id INTEGER NOT NULL,
                riot_profile_id INTEGER NOT NULL,
                match_id TEXT NOT NULL,
                queue_id INTEGER NOT NULL,
                game_version TEXT,
                platform_id TEXT,
                raw_match_json TEXT NOT NULL,
                raw_timeline_json TEXT NOT NULL,
                ingested_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (ingestion_run_id) REFERENCES ingestion_runs(id) ON DELETE CASCADE,
                FOREIGN KEY (riot_profile_id) REFERENCES riot_profiles(id) ON DELETE CASCADE
            )
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_ingestion_runs_user_id
            ON ingestion_runs (user_id, id DESC)
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_raw_match_payloads_run_id
            ON raw_match_payloads (ingestion_run_id, id ASC)
            """
        )
        connection.commit()


@dataclass(slots=True)
class IngestionRepository:
    database_path: Path

    def create_run(self, payload: CreateIngestionRunInput) -> IngestionRun:
        with sqlite3.connect(self.database_path) as connection:
            cursor = connection.execute(
                """
                INSERT INTO ingestion_runs (
                    user_id,
                    riot_profile_id,
                    status,
                    requested_max_matches,
                    queue_id
                )
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    payload.user_id,
                    payload.riot_profile_id,
                    payload.status,
                    payload.requested_max_matches,
                    payload.queue_id
                )
            )
            run_id = int(cursor.lastrowid)
            connection.commit()

        run = self.get_run_by_id(run_id)
        if run is None:
            raise RuntimeError("Failed to load newly created ingestion run.")
        return run

    def finalize_run(self, *, run_id: int, payload: FinalizeIngestionRunInput) -> IngestionRun:
        with sqlite3.connect(self.database_path) as connection:
            connection.execute(
                """
                UPDATE ingestion_runs
                SET status = ?,
                    completed_at = CURRENT_TIMESTAMP,
                    error_message = ?,
                    match_ids_requested = ?,
                    match_ids_ingested_count = ?,
                    match_payloads_ingested_count = ?,
                    timeline_payloads_ingested_count = ?
                WHERE id = ?
                """,
                (
                    payload.status,
                    payload.error_message,
                    payload.match_ids_requested,
                    payload.match_ids_ingested_count,
                    payload.match_payloads_ingested_count,
                    payload.timeline_payloads_ingested_count,
                    run_id
                )
            )
            connection.commit()

        run = self.get_run_by_id(run_id)
        if run is None:
            raise RuntimeError("Failed to load finalized ingestion run.")
        return run

    def create_raw_match_payload(self, payload: CreateRawMatchPayloadInput) -> RawMatchPayloadRecord:
        with sqlite3.connect(self.database_path) as connection:
            cursor = connection.execute(
                """
                INSERT INTO raw_match_payloads (
                    ingestion_run_id,
                    riot_profile_id,
                    match_id,
                    queue_id,
                    game_version,
                    platform_id,
                    raw_match_json,
                    raw_timeline_json
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    payload.ingestion_run_id,
                    payload.riot_profile_id,
                    payload.match_id,
                    payload.queue_id,
                    payload.game_version,
                    payload.platform_id,
                    payload.raw_match_json,
                    payload.raw_timeline_json
                )
            )
            record_id = int(cursor.lastrowid)
            connection.commit()

        record = self.get_raw_match_payload_by_id(record_id)
        if record is None:
            raise RuntimeError("Failed to load newly created raw match payload.")
        return record

    def list_runs_by_user_id(self, user_id: int) -> list[IngestionRun]:
        with sqlite3.connect(self.database_path) as connection:
            cursor = connection.execute(
                """
                SELECT
                    id,
                    user_id,
                    riot_profile_id,
                    status,
                    requested_max_matches,
                    queue_id,
                    started_at,
                    completed_at,
                    error_message,
                    match_ids_requested,
                    match_ids_ingested_count,
                    match_payloads_ingested_count,
                    timeline_payloads_ingested_count
                FROM ingestion_runs
                WHERE user_id = ?
                ORDER BY id DESC
                """,
                (user_id,)
            )
            rows = cursor.fetchall()
        return [self._row_to_run(row) for row in rows]

    def get_run_by_id(self, run_id: int) -> IngestionRun | None:
        with sqlite3.connect(self.database_path) as connection:
            cursor = connection.execute(
                """
                SELECT
                    id,
                    user_id,
                    riot_profile_id,
                    status,
                    requested_max_matches,
                    queue_id,
                    started_at,
                    completed_at,
                    error_message,
                    match_ids_requested,
                    match_ids_ingested_count,
                    match_payloads_ingested_count,
                    timeline_payloads_ingested_count
                FROM ingestion_runs
                WHERE id = ?
                """,
                (run_id,)
            )
            row = cursor.fetchone()
        return self._row_to_run(row) if row else None

    def get_owned_run(self, *, user_id: int, run_id: int) -> IngestionRun | None:
        with sqlite3.connect(self.database_path) as connection:
            cursor = connection.execute(
                """
                SELECT
                    id,
                    user_id,
                    riot_profile_id,
                    status,
                    requested_max_matches,
                    queue_id,
                    started_at,
                    completed_at,
                    error_message,
                    match_ids_requested,
                    match_ids_ingested_count,
                    match_payloads_ingested_count,
                    timeline_payloads_ingested_count
                FROM ingestion_runs
                WHERE id = ? AND user_id = ?
                """,
                (run_id, user_id)
            )
            row = cursor.fetchone()
        return self._row_to_run(row) if row else None

    def list_raw_matches_for_run(self, *, run_id: int) -> list[RawMatchPayloadRecord]:
        with sqlite3.connect(self.database_path) as connection:
            cursor = connection.execute(
                """
                SELECT
                    id,
                    ingestion_run_id,
                    riot_profile_id,
                    match_id,
                    queue_id,
                    game_version,
                    platform_id,
                    raw_match_json,
                    raw_timeline_json,
                    ingested_at
                FROM raw_match_payloads
                WHERE ingestion_run_id = ?
                ORDER BY id ASC
                """,
                (run_id,)
            )
            rows = cursor.fetchall()
        return [self._row_to_raw_match_payload(row) for row in rows]

    def get_raw_match_payload_by_id(self, record_id: int) -> RawMatchPayloadRecord | None:
        with sqlite3.connect(self.database_path) as connection:
            cursor = connection.execute(
                """
                SELECT
                    id,
                    ingestion_run_id,
                    riot_profile_id,
                    match_id,
                    queue_id,
                    game_version,
                    platform_id,
                    raw_match_json,
                    raw_timeline_json,
                    ingested_at
                FROM raw_match_payloads
                WHERE id = ?
                """,
                (record_id,)
            )
            row = cursor.fetchone()
        return self._row_to_raw_match_payload(row) if row else None

    @staticmethod
    def _row_to_run(row: tuple[object, ...]) -> IngestionRun:
        return IngestionRun(
            id=int(row[0]),
            user_id=int(row[1]),
            riot_profile_id=int(row[2]),
            status=str(row[3]),
            requested_max_matches=int(row[4]),
            queue_id=int(row[5]),
            started_at=str(row[6]),
            completed_at=str(row[7]) if row[7] is not None else None,
            error_message=str(row[8]) if row[8] is not None else None,
            match_ids_requested=int(row[9]),
            match_ids_ingested_count=int(row[10]),
            match_payloads_ingested_count=int(row[11]),
            timeline_payloads_ingested_count=int(row[12])
        )

    @staticmethod
    def _row_to_raw_match_payload(row: tuple[object, ...]) -> RawMatchPayloadRecord:
        return RawMatchPayloadRecord(
            id=int(row[0]),
            ingestion_run_id=int(row[1]),
            riot_profile_id=int(row[2]),
            match_id=str(row[3]),
            queue_id=int(row[4]),
            game_version=str(row[5]) if row[5] is not None else None,
            platform_id=str(row[6]) if row[6] is not None else None,
            raw_match_json=str(row[7]),
            raw_timeline_json=str(row[8]),
            ingested_at=str(row[9])
        )


def build_ingestion_repository(
    settings: Settings = Depends(get_settings)
) -> IngestionRepository:
    return IngestionRepository(database_path=settings.sqlite_database_path)

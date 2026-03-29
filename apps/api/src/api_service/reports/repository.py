import sqlite3
from dataclasses import dataclass
from pathlib import Path

from api_service.core.config import Settings, get_settings
from api_service.reports.models import (
    CreateReportRunInput,
    FinalizeReportRunInput,
    ReportArtifact,
    ReportRun
)
from fastapi import Depends


def initialize_report_storage(database_path: Path) -> None:
    database_path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(database_path) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS report_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                riot_profile_id INTEGER NOT NULL,
                analytics_run_id INTEGER NOT NULL,
                status TEXT NOT NULL,
                started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                completed_at TEXT,
                error_message TEXT,
                analytics_version TEXT NOT NULL,
                report_version TEXT NOT NULL,
                source_snapshot_type TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (riot_profile_id) REFERENCES riot_profiles(id) ON DELETE CASCADE,
                FOREIGN KEY (analytics_run_id) REFERENCES analytics_runs(id) ON DELETE CASCADE
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS report_artifacts (
                report_run_id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL,
                riot_profile_id INTEGER NOT NULL,
                analytics_run_id INTEGER NOT NULL,
                analytics_version TEXT NOT NULL,
                report_version TEXT NOT NULL,
                source_snapshot_type TEXT NOT NULL,
                prompt_id TEXT NOT NULL,
                prompt_version TEXT NOT NULL,
                report_input_json TEXT NOT NULL,
                report_output_json TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (report_run_id) REFERENCES report_runs(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (riot_profile_id) REFERENCES riot_profiles(id) ON DELETE CASCADE,
                FOREIGN KEY (analytics_run_id) REFERENCES analytics_runs(id) ON DELETE CASCADE
            )
            """
        )
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_report_runs_user_id ON report_runs (user_id, id DESC)"
        )
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_report_runs_profile_id ON report_runs (riot_profile_id, id DESC)"
        )
        connection.commit()


@dataclass(slots=True)
class ReportRepository:
    database_path: Path

    def create_run(self, payload: CreateReportRunInput) -> ReportRun:
        with sqlite3.connect(self.database_path) as connection:
            cursor = connection.execute(
                """
                INSERT INTO report_runs (
                    user_id,
                    riot_profile_id,
                    analytics_run_id,
                    status,
                    analytics_version,
                    report_version,
                    source_snapshot_type
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    payload.user_id,
                    payload.riot_profile_id,
                    payload.analytics_run_id,
                    payload.status,
                    payload.analytics_version,
                    payload.report_version,
                    payload.source_snapshot_type
                )
            )
            run_id = int(cursor.lastrowid)
            connection.commit()

        run = self.get_run_by_id(run_id)
        if run is None:
            raise RuntimeError("Failed to load newly created report run.")
        return run

    def finalize_run(self, *, run_id: int, payload: FinalizeReportRunInput) -> ReportRun:
        with sqlite3.connect(self.database_path) as connection:
            connection.execute(
                """
                UPDATE report_runs
                SET status = ?,
                    completed_at = CURRENT_TIMESTAMP,
                    error_message = ?
                WHERE id = ?
                """,
                (
                    payload.status,
                    payload.error_message,
                    run_id
                )
            )
            connection.commit()

        run = self.get_run_by_id(run_id)
        if run is None:
            raise RuntimeError("Failed to load finalized report run.")
        return run

    def list_runs_by_user_id(self, user_id: int) -> list[ReportRun]:
        with sqlite3.connect(self.database_path) as connection:
            cursor = connection.execute(
                """
                SELECT id, user_id, riot_profile_id, analytics_run_id, status, started_at,
                       completed_at, error_message, analytics_version, report_version,
                       source_snapshot_type
                FROM report_runs
                WHERE user_id = ?
                ORDER BY id DESC
                """,
                (user_id,)
            )
            rows = cursor.fetchall()
        return [self._row_to_run(row) for row in rows]

    def get_run_by_id(self, run_id: int) -> ReportRun | None:
        with sqlite3.connect(self.database_path) as connection:
            cursor = connection.execute(
                """
                SELECT id, user_id, riot_profile_id, analytics_run_id, status, started_at,
                       completed_at, error_message, analytics_version, report_version,
                       source_snapshot_type
                FROM report_runs
                WHERE id = ?
                """,
                (run_id,)
            )
            row = cursor.fetchone()
        return self._row_to_run(row) if row else None

    def get_owned_run(self, *, user_id: int, run_id: int) -> ReportRun | None:
        with sqlite3.connect(self.database_path) as connection:
            cursor = connection.execute(
                """
                SELECT id, user_id, riot_profile_id, analytics_run_id, status, started_at,
                       completed_at, error_message, analytics_version, report_version,
                       source_snapshot_type
                FROM report_runs
                WHERE id = ? AND user_id = ?
                """,
                (run_id, user_id)
            )
            row = cursor.fetchone()
        return self._row_to_run(row) if row else None

    def upsert_artifact(
        self,
        *,
        report_run_id: int,
        user_id: int,
        riot_profile_id: int,
        analytics_run_id: int,
        analytics_version: str,
        report_version: str,
        source_snapshot_type: str,
        prompt_id: str,
        prompt_version: str,
        report_input_json: str,
        report_output_json: str
    ) -> ReportArtifact:
        with sqlite3.connect(self.database_path) as connection:
            connection.execute(
                """
                INSERT INTO report_artifacts (
                    report_run_id,
                    user_id,
                    riot_profile_id,
                    analytics_run_id,
                    analytics_version,
                    report_version,
                    source_snapshot_type,
                    prompt_id,
                    prompt_version,
                    report_input_json,
                    report_output_json
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(report_run_id) DO UPDATE SET
                    user_id = excluded.user_id,
                    riot_profile_id = excluded.riot_profile_id,
                    analytics_run_id = excluded.analytics_run_id,
                    analytics_version = excluded.analytics_version,
                    report_version = excluded.report_version,
                    source_snapshot_type = excluded.source_snapshot_type,
                    prompt_id = excluded.prompt_id,
                    prompt_version = excluded.prompt_version,
                    report_input_json = excluded.report_input_json,
                    report_output_json = excluded.report_output_json,
                    created_at = CURRENT_TIMESTAMP
                """,
                (
                    report_run_id,
                    user_id,
                    riot_profile_id,
                    analytics_run_id,
                    analytics_version,
                    report_version,
                    source_snapshot_type,
                    prompt_id,
                    prompt_version,
                    report_input_json,
                    report_output_json
                )
            )
            connection.commit()
        artifact = self.get_owned_artifact(user_id=user_id, run_id=report_run_id)
        if artifact is None:
            raise RuntimeError("Failed to load report artifact.")
        return artifact

    def get_owned_artifact(self, *, user_id: int, run_id: int) -> ReportArtifact | None:
        with sqlite3.connect(self.database_path) as connection:
            cursor = connection.execute(
                """
                SELECT report_run_id, user_id, riot_profile_id, analytics_run_id,
                       analytics_version, report_version, source_snapshot_type,
                       prompt_id, prompt_version, report_input_json, report_output_json,
                       created_at
                FROM report_artifacts
                WHERE report_run_id = ? AND user_id = ?
                """,
                (run_id, user_id)
            )
            row = cursor.fetchone()
        return self._row_to_artifact(row) if row else None

    @staticmethod
    def _row_to_run(row: tuple[object, ...]) -> ReportRun:
        return ReportRun(
            id=int(row[0]),
            user_id=int(row[1]),
            riot_profile_id=int(row[2]),
            analytics_run_id=int(row[3]),
            status=str(row[4]),
            started_at=str(row[5]),
            completed_at=str(row[6]) if row[6] is not None else None,
            error_message=str(row[7]) if row[7] is not None else None,
            analytics_version=str(row[8]),
            report_version=str(row[9]),
            source_snapshot_type=str(row[10])
        )

    @staticmethod
    def _row_to_artifact(row: tuple[object, ...]) -> ReportArtifact:
        return ReportArtifact(
            report_run_id=int(row[0]),
            user_id=int(row[1]),
            riot_profile_id=int(row[2]),
            analytics_run_id=int(row[3]),
            analytics_version=str(row[4]),
            report_version=str(row[5]),
            source_snapshot_type=str(row[6]),
            prompt_id=str(row[7]),
            prompt_version=str(row[8]),
            report_input_json=str(row[9]),
            report_output_json=str(row[10]),
            created_at=str(row[11])
        )


def build_report_repository(
    settings: Settings = Depends(get_settings)
) -> ReportRepository:
    return ReportRepository(database_path=settings.sqlite_database_path)

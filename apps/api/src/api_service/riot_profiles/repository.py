import sqlite3
from dataclasses import dataclass
from pathlib import Path

from api_service.core.config import Settings, get_settings
from api_service.riot_profiles.models import (
    CreateRiotProfileInput,
    RiotProfile,
    UpdateVerificationInput
)
from fastapi import Depends


def initialize_riot_profile_storage(database_path: Path) -> None:
    database_path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(database_path) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS riot_profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                game_name TEXT NOT NULL,
                tag_line TEXT NOT NULL,
                riot_id_display TEXT NOT NULL,
                riot_id_norm TEXT NOT NULL,
                region TEXT NOT NULL,
                puuid TEXT NOT NULL UNIQUE,
                account_region_routing TEXT NOT NULL,
                platform_region TEXT NOT NULL,
                is_primary INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                last_verified_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        )
        connection.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS idx_riot_profiles_single_primary
            ON riot_profiles (user_id)
            WHERE is_primary = 1
            """
        )
        connection.commit()


@dataclass(slots=True)
class RiotProfileRepository:
    database_path: Path

    def create(self, payload: CreateRiotProfileInput) -> RiotProfile:
        with sqlite3.connect(self.database_path) as connection:
            cursor = connection.execute(
                """
                INSERT INTO riot_profiles (
                    user_id,
                    game_name,
                    tag_line,
                    riot_id_display,
                    riot_id_norm,
                    region,
                    puuid,
                    account_region_routing,
                    platform_region,
                    is_primary
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    payload.user_id,
                    payload.game_name,
                    payload.tag_line,
                    payload.riot_id_display,
                    payload.riot_id_norm,
                    payload.region,
                    payload.puuid,
                    payload.account_region_routing,
                    payload.platform_region,
                    int(payload.is_primary)
                )
            )
            profile_id = int(cursor.lastrowid)
            connection.commit()
        profile = self.get_by_id(profile_id)
        if profile is None:
            raise RuntimeError("Failed to load newly created riot profile.")
        return profile

    def list_by_user_id(self, user_id: int) -> list[RiotProfile]:
        with sqlite3.connect(self.database_path) as connection:
            cursor = connection.execute(
                """
                SELECT
                    id,
                    user_id,
                    game_name,
                    tag_line,
                    riot_id_display,
                    riot_id_norm,
                    region,
                    puuid,
                    account_region_routing,
                    platform_region,
                    is_primary,
                    created_at,
                    updated_at,
                    last_verified_at
                FROM riot_profiles
                WHERE user_id = ?
                ORDER BY is_primary DESC, id ASC
                """,
                (user_id,)
            )
            rows = cursor.fetchall()
        return [self._row_to_profile(row) for row in rows]

    def get_by_id(self, profile_id: int) -> RiotProfile | None:
        with sqlite3.connect(self.database_path) as connection:
            cursor = connection.execute(
                """
                SELECT
                    id,
                    user_id,
                    game_name,
                    tag_line,
                    riot_id_display,
                    riot_id_norm,
                    region,
                    puuid,
                    account_region_routing,
                    platform_region,
                    is_primary,
                    created_at,
                    updated_at,
                    last_verified_at
                FROM riot_profiles
                WHERE id = ?
                """,
                (profile_id,)
            )
            row = cursor.fetchone()
        return self._row_to_profile(row) if row else None

    def get_owned_by_id(self, *, user_id: int, profile_id: int) -> RiotProfile | None:
        with sqlite3.connect(self.database_path) as connection:
            cursor = connection.execute(
                """
                SELECT
                    id,
                    user_id,
                    game_name,
                    tag_line,
                    riot_id_display,
                    riot_id_norm,
                    region,
                    puuid,
                    account_region_routing,
                    platform_region,
                    is_primary,
                    created_at,
                    updated_at,
                    last_verified_at
                FROM riot_profiles
                WHERE id = ? AND user_id = ?
                """,
                (profile_id, user_id)
            )
            row = cursor.fetchone()
        return self._row_to_profile(row) if row else None

    def get_by_puuid(self, puuid: str) -> RiotProfile | None:
        with sqlite3.connect(self.database_path) as connection:
            cursor = connection.execute(
                """
                SELECT
                    id,
                    user_id,
                    game_name,
                    tag_line,
                    riot_id_display,
                    riot_id_norm,
                    region,
                    puuid,
                    account_region_routing,
                    platform_region,
                    is_primary,
                    created_at,
                    updated_at,
                    last_verified_at
                FROM riot_profiles
                WHERE puuid = ?
                """,
                (puuid,)
            )
            row = cursor.fetchone()
        return self._row_to_profile(row) if row else None

    def count_by_user_id(self, user_id: int) -> int:
        with sqlite3.connect(self.database_path) as connection:
            cursor = connection.execute(
                "SELECT COUNT(*) FROM riot_profiles WHERE user_id = ?",
                (user_id,)
            )
            row = cursor.fetchone()
        return int(row[0]) if row else 0

    def delete_owned(self, *, user_id: int, profile_id: int) -> None:
        with sqlite3.connect(self.database_path) as connection:
            connection.execute(
                "DELETE FROM riot_profiles WHERE id = ? AND user_id = ?",
                (profile_id, user_id)
            )
            connection.commit()

    def get_first_by_user_id(self, user_id: int) -> RiotProfile | None:
        with sqlite3.connect(self.database_path) as connection:
            cursor = connection.execute(
                """
                SELECT
                    id,
                    user_id,
                    game_name,
                    tag_line,
                    riot_id_display,
                    riot_id_norm,
                    region,
                    puuid,
                    account_region_routing,
                    platform_region,
                    is_primary,
                    created_at,
                    updated_at,
                    last_verified_at
                FROM riot_profiles
                WHERE user_id = ?
                ORDER BY id ASC
                LIMIT 1
                """,
                (user_id,)
            )
            row = cursor.fetchone()
        return self._row_to_profile(row) if row else None

    def set_primary(self, *, user_id: int, profile_id: int) -> RiotProfile:
        with sqlite3.connect(self.database_path) as connection:
            connection.execute("BEGIN")
            connection.execute(
                """
                UPDATE riot_profiles
                SET is_primary = 0,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ? AND is_primary = 1
                """,
                (user_id,)
            )
            connection.execute(
                """
                UPDATE riot_profiles
                SET is_primary = 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ? AND id = ?
                """,
                (user_id, profile_id)
            )
            connection.commit()
        profile = self.get_owned_by_id(user_id=user_id, profile_id=profile_id)
        if profile is None:
            raise RuntimeError("Failed to load primary riot profile.")
        return profile

    def update_verification(
        self,
        *,
        profile_id: int,
        payload: UpdateVerificationInput
    ) -> RiotProfile:
        with sqlite3.connect(self.database_path) as connection:
            connection.execute(
                """
                UPDATE riot_profiles
                SET game_name = ?,
                    tag_line = ?,
                    riot_id_display = ?,
                    riot_id_norm = ?,
                    updated_at = CURRENT_TIMESTAMP,
                    last_verified_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (
                    payload.game_name,
                    payload.tag_line,
                    payload.riot_id_display,
                    payload.riot_id_norm,
                    profile_id
                )
            )
            connection.commit()
        profile = self.get_by_id(profile_id)
        if profile is None:
            raise RuntimeError("Failed to load verified riot profile.")
        return profile

    @staticmethod
    def _row_to_profile(row: tuple[object, ...]) -> RiotProfile:
        return RiotProfile(
            id=int(row[0]),
            user_id=int(row[1]),
            game_name=str(row[2]),
            tag_line=str(row[3]),
            riot_id_display=str(row[4]),
            riot_id_norm=str(row[5]),
            region=str(row[6]),
            puuid=str(row[7]),
            account_region_routing=str(row[8]),
            platform_region=str(row[9]),
            is_primary=bool(row[10]),
            created_at=str(row[11]),
            updated_at=str(row[12]),
            last_verified_at=str(row[13])
        )


def build_riot_profile_repository(
    settings: Settings = Depends(get_settings)
) -> RiotProfileRepository:
    return RiotProfileRepository(database_path=settings.sqlite_database_path)

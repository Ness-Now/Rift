import sqlite3
from dataclasses import dataclass
from pathlib import Path

from api_service.core.config import Settings, get_settings
from api_service.users.models import CreateUserInput, User
from fastapi import Depends


def initialize_user_storage(database_path: Path) -> None:
    database_path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(database_path) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        connection.commit()


@dataclass(slots=True)
class UserRepository:
    database_path: Path

    def create(self, payload: CreateUserInput) -> User:
        with sqlite3.connect(self.database_path) as connection:
            cursor = connection.execute(
                """
                INSERT INTO users (email, password_hash)
                VALUES (?, ?)
                """,
                (payload.email, payload.password_hash),
            )
            user_id = int(cursor.lastrowid)
            connection.commit()

        user = self.get_by_id(user_id)
        if user is None:
            raise RuntimeError("Failed to load newly created user.")
        return user

    def get_by_email(self, email: str) -> User | None:
        with sqlite3.connect(self.database_path) as connection:
            cursor = connection.execute(
                """
                SELECT id, email, password_hash, created_at
                FROM users
                WHERE email = ?
                """,
                (email,),
            )
            row = cursor.fetchone()
        return self._row_to_user(row) if row else None

    def get_by_id(self, user_id: int) -> User | None:
        with sqlite3.connect(self.database_path) as connection:
            cursor = connection.execute(
                """
                SELECT id, email, password_hash, created_at
                FROM users
                WHERE id = ?
                """,
                (user_id,),
            )
            row = cursor.fetchone()
        return self._row_to_user(row) if row else None

    @staticmethod
    def _row_to_user(row: tuple[object, ...]) -> User:
        return User(
            id=int(row[0]),
            email=str(row[1]),
            password_hash=str(row[2]),
            created_at=str(row[3]),
        )


def build_user_repository(
    settings: Settings = Depends(get_settings)
) -> UserRepository:
    return UserRepository(database_path=settings.sqlite_database_path)

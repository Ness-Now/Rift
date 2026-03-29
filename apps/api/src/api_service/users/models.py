from dataclasses import dataclass


@dataclass(slots=True)
class User:
    id: int
    email: str
    password_hash: str
    created_at: str


@dataclass(slots=True)
class CreateUserInput:
    email: str
    password_hash: str
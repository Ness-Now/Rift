from dataclasses import dataclass
from typing import Protocol


@dataclass(slots=True)
class JobResult:
    job_name: str
    message: str


class Job(Protocol):
    name: str

    def run(self) -> JobResult:
        ...

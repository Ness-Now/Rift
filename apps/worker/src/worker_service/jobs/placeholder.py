from worker_service.jobs.base import JobResult


class PlaceholderJob:
    name = "placeholder"

    def run(self) -> JobResult:
        return JobResult(
            job_name=self.name,
            message="Worker foundation is ready. Real jobs land in future tickets."
        )

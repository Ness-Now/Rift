import argparse

from worker_service.jobs import AVAILABLE_JOBS


def main() -> int:
    parser = argparse.ArgumentParser(description="Run a Rift worker job.")
    parser.add_argument("--job", default="placeholder", choices=sorted(AVAILABLE_JOBS.keys()))
    args = parser.parse_args()

    job = AVAILABLE_JOBS[args.job]()
    result = job.run()
    print(f"[{result.job_name}] {result.message}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

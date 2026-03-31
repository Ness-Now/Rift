from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path


def _build_pythonpath(repo_root: Path) -> str:
    entries = [
        str(repo_root / "apps" / "api" / "src"),
        str(repo_root / "packages" / "analytics" / "src"),
    ]
    existing = os.environ.get("PYTHONPATH")
    if existing:
        entries.append(existing)
    return os.pathsep.join(entries)


def main() -> int:
    repo_root = Path(__file__).resolve().parents[2]
    env = os.environ.copy()
    env["PYTHONPATH"] = _build_pythonpath(repo_root)

    host = env.get("API_HOST", "127.0.0.1")
    port = env.get("API_PORT", "8000")
    reload_enabled = env.get("API_RELOAD", "1").lower() not in {"0", "false", "no"}

    command = [
        sys.executable,
        "-m",
        "uvicorn",
        "api_service.main:app",
        "--host",
        host,
        "--port",
        port,
    ]
    if reload_enabled:
        command.append("--reload")

    try:
        return subprocess.call(command, cwd=repo_root, env=env)
    except FileNotFoundError:
        print(
            "Uvicorn is not available in the active Python environment. "
            "Install the local API runtime deps first, for example: "
            "pip install fastapi 'uvicorn[standard]' itsdangerous",
            file=sys.stderr,
        )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

from __future__ import annotations

import sys
import unittest
from pathlib import Path


def main() -> int:
    tests_dir = Path(__file__).resolve().parent
    api_src = tests_dir.parent / "src"
    sys.path.insert(0, str(api_src))

    suite = unittest.defaultTestLoader.discover(
        start_dir=str(tests_dir),
        pattern="test_contextual_chat_service_helpers.py",
    )
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    return 0 if result.wasSuccessful() else 1


if __name__ == "__main__":
    raise SystemExit(main())

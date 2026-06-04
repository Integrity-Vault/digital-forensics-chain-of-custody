"""
Reset the local SQLite database after schema changes.

Usage (from backend/):
    python scripts/reset_database.py
"""

import os
import sys

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)

from app.db.database import engine  # noqa: E402
from app.db.models import Base  # noqa: E402

DB_FILES = ["test.db", "forensic.db"]


def main() -> None:
    for name in DB_FILES:
        path = os.path.join(BACKEND_DIR, name)
        if os.path.exists(path):
            try:
                os.remove(path)
                print(f"Removed {path}")
            except OSError as exc:
                print(f"Could not remove {path}: {exc}")
                print("Stop uvicorn and retry, or delete the file manually.")

    Base.metadata.create_all(bind=engine)
    print("Database schema recreated successfully.")


if __name__ == "__main__":
    main()

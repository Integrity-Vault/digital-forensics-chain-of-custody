"""
Development-safe SQLite schema upgrades.

SQLAlchemy ``create_all`` only creates missing tables; it does not alter existing
tables. This module adds missing columns and backfills legacy rows so older
``test.db`` files keep working after model changes.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

from app.db.models import Base, Evidence

logger = logging.getLogger(__name__)

LEGACY_CASE_ID = "LEGACY-UNASSIGNED"
LEGACY_CASE_NAME = "Legacy Unassigned Evidence"
LEGACY_INVESTIGATOR = "System Migration"

# (column_name, sqlite_type, default_sql_literal for ADD COLUMN)
EVIDENCE_COLUMNS: list[tuple[str, str, str | None]] = [
    ("case_id", "VARCHAR", f"'{LEGACY_CASE_ID}'"),
    ("evidence_name", "VARCHAR", "''"),
    ("description", "TEXT", "''"),
    ("file_hash", "VARCHAR", "''"),
    ("blockchain_tx", "VARCHAR", None),
    ("uploaded_at", "DATETIME", None),
]


def _is_sqlite(engine: Engine) -> bool:
    return engine.dialect.name == "sqlite"


def _table_exists(conn, table_name: str) -> bool:
    row = conn.execute(
        text("SELECT name FROM sqlite_master WHERE type='table' AND name=:name"),
        {"name": table_name},
    ).fetchone()
    return row is not None


def _column_names(conn, table_name: str) -> set[str]:
    rows = conn.execute(text(f"PRAGMA table_info({table_name})")).fetchall()
    return {row[1] for row in rows}


def _add_column(conn, table_name: str, column_name: str, column_type: str, default_sql: str | None) -> None:
    if default_sql is not None:
        ddl = f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type} DEFAULT {default_sql}"
    else:
        ddl = f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}"
    conn.execute(text(ddl))
    logger.info("Added column %s.%s", table_name, column_name)


def _ensure_legacy_case(conn) -> None:
    if not _table_exists(conn, "cases"):
        return

    existing = conn.execute(
        text("SELECT case_id FROM cases WHERE case_id = :case_id"),
        {"case_id": LEGACY_CASE_ID},
    ).fetchone()
    if existing:
        return

    now = datetime.now(timezone.utc).isoformat()
    conn.execute(
        text(
            """
            INSERT INTO cases (case_id, case_name, investigator_name, created_at)
            VALUES (:case_id, :case_name, :investigator_name, :created_at)
            """
        ),
        {
            "case_id": LEGACY_CASE_ID,
            "case_name": LEGACY_CASE_NAME,
            "investigator_name": LEGACY_INVESTIGATOR,
            "created_at": now,
        },
    )
    logger.info("Created legacy case %s for pre-migration evidence rows.", LEGACY_CASE_ID)


def _migrate_sqlite_evidence(conn) -> None:
    if not _table_exists(conn, "evidence"):
        return

    columns = _column_names(conn, "evidence")

    for column_name, column_type, default_sql in EVIDENCE_COLUMNS:
        if column_name not in columns:
            _add_column(conn, "evidence", column_name, column_type, default_sql)
            columns.add(column_name)

    columns = _column_names(conn, "evidence")

    if "hash" in columns and "file_hash" in columns:
        conn.execute(
            text(
                """
                UPDATE evidence
                SET file_hash = hash
                WHERE (file_hash IS NULL OR file_hash = '')
                  AND hash IS NOT NULL
                  AND hash != ''
                """
            )
        )

    if "file_name" in columns and "evidence_name" in columns:
        conn.execute(
            text(
                """
                UPDATE evidence
                SET evidence_name = file_name
                WHERE (evidence_name IS NULL OR evidence_name = '')
                  AND file_name IS NOT NULL
                  AND file_name != ''
                """
            )
        )

    if "case_id" in columns:
        conn.execute(
            text(
                """
                UPDATE evidence
                SET case_id = :legacy_case_id
                WHERE case_id IS NULL OR case_id = ''
                """
            ),
            {"legacy_case_id": LEGACY_CASE_ID},
        )

    if "uploaded_at" in columns:
        now = datetime.now(timezone.utc).isoformat()
        conn.execute(
            text(
                """
                UPDATE evidence
                SET uploaded_at = :now
                WHERE uploaded_at IS NULL OR uploaded_at = ''
                """
            ),
            {"now": now},
        )

    logger.info("SQLite evidence table migration/backfill complete.")


def run_startup_migrations(engine: Engine) -> None:
    """
    Ensure the database matches current ORM models.

    - Always runs ``create_all`` (new tables).
    - On SQLite, patches the legacy ``evidence`` table with missing columns.
    """
    logger.info("Applying startup database migrations...")
    Base.metadata.create_all(bind=engine)

    if not _is_sqlite(engine):
        logger.info(
            "Database dialect '%s': relying on create_all only. "
            "Use Alembic or manual DDL for production PostgreSQL upgrades.",
            engine.dialect.name,
        )
        return

    with engine.begin() as conn:
        _migrate_sqlite_evidence(conn)
        _ensure_legacy_case(conn)

    inspector = inspect(engine)
    if inspector.has_table("evidence"):
        model_columns = {column.name for column in Evidence.__table__.columns}
        db_columns = {col["name"] for col in inspector.get_columns("evidence")}
        # Legacy databases may still have a ``hash`` column after ``file_hash`` was added.
        legacy_only = db_columns - model_columns
        still_missing = model_columns - db_columns
        if still_missing:
            logger.warning(
                "Evidence table still missing model columns after migration: %s",
                sorted(still_missing),
            )
        if legacy_only:
            logger.debug("Legacy evidence columns retained: %s", sorted(legacy_only))

    logger.info("Startup database migrations finished.")

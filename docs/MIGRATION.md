# Database Migration Guide

## Development (SQLite) — automatic

On startup, the backend runs `app.db.migrations.run_startup_migrations()` which:

1. Creates any **missing tables** (`cases`, `evidence`, `chain_of_custody_events`) via SQLAlchemy `create_all`.
2. **Adds missing columns** on an existing SQLite `evidence` table (e.g. `case_id`, `file_hash`, `evidence_name`).
3. **Backfills** legacy data:
   - `hash` → `file_hash`
   - `file_name` → `evidence_name`
   - Orphan rows → case `LEGACY-UNASSIGNED`
4. Ensures the legacy case exists so foreign keys remain valid.

No manual reset is required for typical schema upgrades. Restart uvicorn after pulling model changes.

### Legacy case

Pre-migration evidence without a case is attached to:

| Field | Value |
|-------|--------|
| Case ID | `LEGACY-UNASSIGNED` |
| Name | Legacy Unassigned Evidence |

Re-assign or re-upload evidence under a real case in the UI if needed.

## Full reset (optional)

If migrations fail or you want a clean slate:

```powershell
# Stop uvicorn first
cd backend
.\venv\Scripts\python.exe scripts\reset_database.py
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

## PostgreSQL (Docker / production)

Startup migrations only run **table creation** on non-SQLite databases. Column-level patches are SQLite-specific. For PostgreSQL production upgrades, use Alembic or apply DDL manually before deploy.

## Troubleshooting

| Error | Fix |
|-------|-----|
| `no such column: evidence.case_id` | Restart backend so startup migrations run |
| `test.db` locked during reset | Stop uvicorn, delete `backend/test.db`, restart |
| Old rows missing case | Open case `LEGACY-UNASSIGNED` in the UI |

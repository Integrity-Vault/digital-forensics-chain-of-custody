## Backend (`backend/`)

FastAPI service for forensic case management, evidence storage, chain-of-custody logging, SHA-256 integrity checks, and Ganache/Ethereum hash registration.

### Stack

- **FastAPI** + **SQLAlchemy**
- **SQLite** by default (`sqlite:///./test.db` via `DATABASE_URL`)
- Evidence files on disk under `backend/storage/` (**plain files, not encrypted**)
- **Web3.py** → Ganache + `EvidenceCustody.sol`

### Configuration

Copy `backend/.env.example` to `backend/.env`:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Default `sqlite:///./test.db` |
| `BLOCKCHAIN_PROVIDER` | Ganache RPC, default `http://127.0.0.1:7545` |
| `CONTRACT_ADDRESS` | Set by `scripts/init_blockchain.py` after deploy |

### Run locally

```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate
# Unix:    source venv/bin/activate
pip install -r requirements.txt
```

Start Ganache, then deploy/sync contract:

```bash
python scripts/init_blockchain.py
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

API: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### File storage

- Path pattern: `storage/{evidence_id}_{original_filename}`
- Metadata in SQLite: case link, evidence name, `file_hash` (SHA-256), `file_path`, `blockchain_tx`, timestamps
- **No encryption** — see `app/services/encryption.py` (placeholder only)

### Verification

| Endpoint | Checks |
|----------|--------|
| `POST /api/evidence/verify-id` | On-disk file vs DB; DB hash on blockchain |
| `POST /api/evidence/verify-file` | Uploaded file vs DB; storage vs DB; blockchain |

Failed storage/upload checks create `TAMPER_DETECTED` custody events.

### Database migrations

Startup runs `app/db/migrations.py` to add missing SQLite columns on older `test.db` files. See [../docs/MIGRATION.md](../docs/MIGRATION.md).

### Key modules

| Path | Purpose |
|------|---------|
| `app/main.py` | App entry, migrations on startup |
| `app/api/routes.py` | REST endpoints |
| `app/db/models.py` | `Case`, `Evidence`, `ChainOfCustodyEvent` |
| `app/services/custody.py` | Custody event actions |
| `app/services/verification.py` | Three-layer integrity checks |
| `app/services/blockchain.py` | Contract register/verify |
| `app/services/hashing.py` | SHA-256 |

### API response format

```json
{ "status": "success", "data": { } }
```

```json
{ "status": "error", "message": "..." }
```

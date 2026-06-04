## Backend Service (`backend/`)

This backend is a FastAPI service for evidence ingestion and integrity validation in the Blockchain-backed Digital Forensics & Chain-of-Custody system.

### How file storage works

- Uploaded files are stored on disk under `backend/storage/`.
- Each file is saved with a unique name:
  - `{evidence_id}_{original_filename}`
- Metadata persisted in DB:
  - `id`
  - `file_name`
  - `hash` (SHA-256)
  - `file_path` (absolute path to stored file)

### How verification works

- Endpoint: `GET /api/evidence/verify/{evidence_id}`
- Flow:
  1. Validate evidence ID format.
  2. Fetch evidence record from DB.
  3. Load file using stored `file_path`.
  4. Re-hash file contents.
  5. Compare current hash vs stored hash.
  6. Return `VERIFIED` or `TAMPERED`.

### Blockchain integration flow

The backend now registers evidence hashes on Ethereum (Ganache) in addition to DB/file storage.

- On upload (`POST /api/evidence/upload`):
  1. Hash file using SHA-256.
  2. Persist evidence record in DB and disk storage.
  3. Attempt to call smart contract `registerEvidence(bytes32 hash)`.
  4. Return blockchain transaction hash when successful.
  5. If blockchain registration fails, upload still succeeds (DB stays source-of-truth) and response includes blockchain failure status.

- On verify (`GET /api/evidence/verify/{evidence_id}`):
  1. Existing file-vs-DB tamper check runs as before (`db_verification`).
  2. Backend also calls smart contract `verifyEvidence(bytes32 hash)` (`blockchain_verification`).

### Blockchain environment variables

Create `backend/.env` (or export environment vars):

- `BLOCKCHAIN_PROVIDER=http://127.0.0.1:7545`
- `CONTRACT_ADDRESS=<deployed_contract_address>`

`python-dotenv` is used so these values are loaded automatically.

### Run Ganache and deploy the contract

From project root:

1. Start Ganache GUI or CLI with RPC on `http://127.0.0.1:7545`.
2. Install Node dependencies needed for deployment:
   - `npm install ethers solc`
3. Deploy contract and export ABI:
   - `node blockchain/scripts/deploy.js`
4. Copy deployed address into `backend/.env` as `CONTRACT_ADDRESS`.

Deployment script outputs:

- Contract address (for backend config).
- ABI written to `blockchain/contract_abi.json` (loaded by backend blockchain service).

### API response format

All endpoints follow a consistent structure.

- Success:

```json
{
  "status": "success",
  "data": {}
}
```

- Error:

```json
{
  "status": "error",
  "message": "..."
}
```

### Run locally

From `backend/`:

1. Create and activate a virtual environment.
2. Install dependencies:
   - `pip install -r requirements.txt`
3. (Optional) Set `DATABASE_URL`:
   - If omitted, backend falls back to SQLite (`sqlite:///./test.db`).
4. Run:
   - `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`

### SQLite schema change note

- The `Evidence` table now includes `file_path`.
- If you are using SQLite with the existing `backend/test.db`, delete `backend/test.db` and restart the backend so the updated schema is recreated.

### Run with Docker

From project root:

1. Build and start services:
   - `docker compose up --build`
2. Backend:
   - `http://localhost:8000`
3. Postgres:
   - `localhost:5432`
   - user: `forensic`
   - password: `forensic`
   - database: `forensic_db`

`docker-compose.yml` injects:

- `DATABASE_URL=postgresql://forensic:forensic@db:5432/forensic_db`

### Key files

- `app/main.py` - app entrypoint
- `app/api/routes.py` - upload, fetch, and verify routes
- `app/db/models.py` - evidence ORM model
- `app/db/database.py` - DB engine/session configuration (env-aware)
- `storage/` - persisted evidence files
- `Dockerfile` - backend container build

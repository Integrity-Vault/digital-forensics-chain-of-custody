# Digital Forensics Chain of Custody

A full-stack forensic evidence management platform for academic demonstration and professional presentation. Investigators manage **cases** first, attach **evidence** to existing cases, and every significant action is recorded in an auditable **chain of custody**. Evidence integrity is enforced through **SHA-256 hashing**, **server-side storage verification**, and **Ethereum (Ganache) blockchain** membership checks.

---

## Project Overview

### Problem solved

Digital evidence must remain trustworthy from collection through court presentation. This system provides:

- **Case-first workflows** — criminal cases exist before evidence is collected.
- **Tamper-evident storage** — disk copies are re-hashed and compared to registered records.
- **Immutable integrity anchors** — evidence hashes are registered on a Solidity smart contract.
- **Visible chain of custody** — uploads, verification, blockchain registration, and tamper alerts are logged with actor and timestamp.

### System architecture

```text
┌─────────────────┐     HTTPS/JSON      ┌──────────────────┐
│  React + Vite   │ ◄─────────────────► │  FastAPI backend │
│  (port 5173)    │                     │  (port 8000)     │
└─────────────────┘                     └────────┬─────────┘
                                                 │
                    ┌────────────────────────────┼────────────────────────────┐
                    ▼                            ▼                            ▼
            ┌───────────────┐           ┌───────────────┐           ┌─────────────────┐
            │ SQLite DB     │           │ backend/      │           │ Ganache +       │
            │ cases,        │           │ storage/      │           │ EvidenceCustody │
            │ evidence,     │           │ (plain files) │           │ .sol contract   │
            │ custody events│           └───────────────┘           └─────────────────┘
            └───────────────┘
```

| Layer | Technology | Role |
|-------|------------|------|
| Frontend | React 18, Vite, Tailwind CSS | Dashboard, cases, upload, verify, custody timeline |
| Backend | FastAPI, SQLAlchemy | REST API, hashing, custody logging, blockchain calls |
| Database | **SQLite** (`backend/test.db`) | Cases, evidence metadata, chain of custody |
| File store | Local disk `backend/storage/` | Original evidence files (**unencrypted**) |
| Blockchain | Ganache, Solidity, Web3.py | `registerEvidence` / `verifyEvidence` hash checks |

### Evidence registration workflow

1. **Create a case** (`POST /api/cases`) — e.g. `CASE-2026-001`, investigator name. A `CASE_CREATED` custody event is recorded.
2. **Upload evidence** (`POST /api/evidence/upload`) — user selects an **existing** case, provides evidence name and officer name, uploads a file.
3. Backend computes **SHA-256**, saves the file to `backend/storage/{evidence_id}_{filename}`, stores metadata in SQLite.
4. Backend calls the smart contract to register the hash; on success a `BLOCKCHAIN_REGISTERED` custody event is created.
5. `UPLOAD` custody event records who added the file and when.

### Verification workflow

Three **independent** integrity checks (full verify with file):

| Check | Comparison | Purpose |
|-------|------------|---------|
| Uploaded file | uploaded hash vs DB hash | Client-supplied copy matches registration |
| Storage | on-disk file hash vs DB hash | Server copy was not altered |
| Blockchain | DB hash on-chain | Immutable anchor still valid |

- **Quick verify** (`POST /api/evidence/verify-id`) — storage + blockchain only.
- **Full verify** (`POST /api/evidence/verify-file`) — all three checks.

Each verify action logs `VERIFY` in chain of custody.

### Chain of custody workflow

All material actions create rows in `chain_of_custody_events`:

`CASE_CREATED`, `UPLOAD`, `VIEW`, `VERIFY`, `DOWNLOAD`, `TRANSFER`, `BLOCKCHAIN_REGISTERED`, `TAMPER_DETECTED`

The **Chain of Custody** UI page and **Case Details** dashboard display a professional timeline (actor, action, timestamp, details).

### Tamper detection workflow

1. Storage or uploaded-file hash does not match the DB record during verification.
2. API returns `storage_integrity: TAMPERED` and/or `uploaded_file_integrity: TAMPERED`.
3. Backend automatically logs `TAMPER_DETECTED` with a system-generated explanation.
4. Case dashboard and global dashboard surface tampering alert counts.

**Note:** Storage tampering can be detected even when the investigator later uploads the original unmodified file — the on-disk mismatch is reported independently.

---

## Security and storage model

### Encryption

**Evidence files are not encrypted.** Uploads are written to `backend/storage/` as plain binary files. `app/services/encryption.py` is a **placeholder only** (`NotImplementedError`).

Integrity and authenticity rely on:

- SHA-256 content hashing
- SQLite metadata
- On-disk re-hash verification
- Blockchain hash registration

See [docs/decisions/adr-001-offchain-storage.md](docs/decisions/adr-001-offchain-storage.md) for the architectural decision; encryption at rest is listed under [Future Work](#future-work).

### Authentication

There is **no login, JWT, or role-based access control** in the current build. `performed_by` fields are supplied by the client (honor system for demos).

---

## Tech stack (as implemented)

- **Backend:** Python 3.11+, FastAPI, SQLAlchemy, python-dotenv, Web3.py
- **Database:** SQLite (default `sqlite:///./test.db`)
- **Frontend:** React 18, Vite 5, Tailwind CSS 3, Axios, Lucide icons
- **Blockchain:** Ganache (RPC `http://127.0.0.1:7545`), Solidity `EvidenceCustody.sol`
- **Hashing:** SHA-256 (`app/services/hashing.py`)

---

## Prerequisites

- Python 3.11+
- Node.js 18+ and npm
- [Ganache](https://trufflesuite.com/ganache/) (GUI or CLI) on `http://127.0.0.1:7545`

---

## Quick start

### 1. Clone and configure

```bash
git clone <repository-url>
cd digital-forensics-chain-of-custody
```

Copy environment template:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` only if your Ganache RPC URL differs.

### 2. Install dependencies

**Windows (PowerShell):**

```powershell
.\setup.ps1 -InstallOnly
```

**macOS / Linux:**

```bash
chmod +x setup.sh
./setup.sh --install-only
```

Manual equivalent:

```bash
cd backend && python -m venv venv
# Windows: venv\Scripts\activate  |  Unix: source venv/bin/activate
pip install -r requirements.txt
cd ../frontend && npm install
cd ../blockchain && npm install
```

### 3. Start Ganache

Launch Ganache with RPC **`http://127.0.0.1:7545`** (default in this project).

### 4. Deploy smart contract

```bash
cd backend
# Windows: venv\Scripts\python.exe scripts/init_blockchain.py
# Unix:    venv/bin/python scripts/init_blockchain.py
```

This deploys `EvidenceCustody`, syncs the ABI, and writes `CONTRACT_ADDRESS` to `backend/.env`.

### 5. Run the application

**Option A — helper scripts (starts backend + frontend):**

```powershell
.\setup.ps1          # Windows
```

```bash
./setup.sh           # macOS / Linux
```

**Option B — separate terminals:**

```bash
# Terminal 1 — backend
cd backend
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# Terminal 2 — frontend
cd frontend
npm run dev
```

- Frontend: [http://localhost:5173](http://localhost:5173)
- API docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### 6. Demo workflow

1. **Cases** → create `CASE-2026-001` (Bank Robbery, Officer Sharma).
2. **Upload Evidence** → select case, upload a file.
3. **Verify Evidence** → quick or full verify.
4. **Chain of Custody** → view timeline for the case.
5. **Tamper test** → edit a file under `backend/storage/`, run verify again → `TAMPER_DETECTED` appears.

---

## API summary

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/dashboard` | Global stats and recent custody |
| `POST` | `/api/cases` | Create case |
| `GET` | `/api/cases` | List cases |
| `GET` | `/api/cases/{case_id}` | Case dashboard |
| `GET` | `/api/cases/{case_id}/custody` | Custody timeline |
| `POST` | `/api/evidence/upload` | Upload to existing case |
| `GET` | `/api/evidence/{evidence_id}` | Evidence details |
| `POST` | `/api/evidence/verify-id` | Storage + blockchain verify |
| `POST` | `/api/evidence/verify-file` | Full three-layer verify |

---

## Repository structure

```text
backend/           FastAPI app, SQLite, storage, blockchain service
blockchain/        Solidity contract, deploy script, ABI
frontend/          React + Vite UI
docs/              Architecture, ADRs, threat model (see implementation notes)
```

---

## Database migrations

SQLite schemas upgrade automatically on backend startup (`app/db/migrations.py`). See [docs/MIGRATION.md](docs/MIGRATION.md).

---

## Future work

Planned enhancements (not implemented in this repository):

- **Authentication and RBAC** — login, roles (investigator, auditor, admin), signed sessions
- **PostgreSQL support** — production-grade RDBMS instead of SQLite
- **Docker deployment** — reproducible multi-service stack (compose files exist but are not the supported local path)
- **Production blockchain** — testnet/mainnet or permissioned network deployment
- **Evidence encryption at rest** — AES-256-GCM via `encryption.py` and key management
- **Multi-user police/court workflows** — transfers, approvals, jurisdiction boundaries
- **Advanced audit reporting** — PDF exports, compliance packs, cross-case analytics

---

## Repository hygiene

The following must **not** be committed (enforced via `.gitignore`):

| Item | Ignored |
|------|---------|
| Python venv | `venv/`, `backend/venv/` |
| Node modules | `node_modules/` |
| Uploaded evidence | `backend/storage/*` (`.gitkeep` only) |
| Secrets | `.env`, `*.key`, `*.pem` |
| Local databases | `*.db` |
| Build output | `frontend/dist/` |

Never commit Ganache private keys or real `CONTRACT_ADDRESS` values from production networks.

---

## Further reading

- [backend/README.md](backend/README.md) — API and backend details
- [frontend/README.md](frontend/README.md) — UI pages and dev server
- [blockchain/README.md](blockchain/README.md) — smart contract
- [docs/architecture/system-architecture.md](docs/architecture/system-architecture.md) — as-built architecture
- [docs/MIGRATION.md](docs/MIGRATION.md) — SQLite upgrades

---

## System Architecture (As Built)

This document describes the **current implementation** of the Digital Forensics Chain of Custody platform. For planned enterprise features (encryption, PostgreSQL, Docker, authentication), see **Future Work** in the [root README.md](../../README.md).

---

## Goals

- Preserve **integrity** of digital evidence through hashing and blockchain anchors.
- Maintain a **traceable chain of custody** for every material action.
- Support realistic forensic workflow: **cases exist before evidence collection**.

---

## Components

### Frontend (React + Vite)

- Single-page app with sidebar navigation.
- Pages: Dashboard, Cases, Case Details, Upload Evidence, Verify Evidence, Chain of Custody.
- Communicates with FastAPI over HTTP (`http://127.0.0.1:8000/api`).
- Displays integrity status and custody timelines — no raw hashes, file paths, or internal IDs in the UI.

### Backend (FastAPI)

- REST API for cases, evidence, verification, dashboard aggregates.
- SHA-256 hashing (`app/services/hashing.py`).
- Writes evidence files to `backend/storage/` as **unencrypted** binaries.
- Logs chain-of-custody events to SQLite on every significant action.
- Calls Ganache via Web3.py (`registerEvidence`, `verifyEvidence`).

### Database (SQLite)

Tables:

| Table | Purpose |
|-------|---------|
| `cases` | Investigation cases (`case_id` PK) |
| `evidence` | Files linked to cases, hashes, paths, blockchain tx |
| `chain_of_custody_events` | Audit trail |

Default connection: `sqlite:///./test.db`. Startup migrations patch older SQLite schemas (`app/db/migrations.py`).

### Off-chain file storage

- Directory: `backend/storage/`
- Naming: `{evidence_uuid}_{original_filename}`
- **Not encrypted** — integrity via hash comparison and blockchain, not confidentiality at rest.

### Blockchain (Ganache + Solidity)

- Contract: `EvidenceCustody.sol`
- Stores `bytes32` evidence hashes; `verifyEvidence` checks membership.
- Development RPC: `http://127.0.0.1:7545`

---

## Workflows

### 1. Case creation

```text
Investigator → POST /api/cases → SQLite (cases)
                              → chain_of_custody (CASE_CREATED)
```

Cases are **never** created during evidence upload.

### 2. Evidence upload

```text
Investigator → POST /api/evidence/upload (multipart)
            → SHA-256 hash
            → Write file to storage/
            → Insert evidence row
            → chain_of_custody (UPLOAD)
            → registerEvidence on Ganache
            → chain_of_custody (BLOCKCHAIN_REGISTERED) [if tx succeeds]
```

Upload **fails** if `case_id` does not exist.

### 3. Verification

**Quick verify** — storage + blockchain:

```text
Read file from storage/ → hash → compare to evidence.file_hash
verifyEvidence(file_hash) on contract
→ chain_of_custody (VERIFY)
→ chain_of_custody (TAMPER_DETECTED) if storage mismatch
```

**Full verify** — adds uploaded file check:

```text
Hash uploaded bytes → compare to file_hash
+ storage check + blockchain check
→ TAMPER_DETECTED on upload or storage mismatch
```

### 4. Chain of custody visibility

```text
GET /api/cases/{case_id}        → case dashboard + events
GET /api/cases/{case_id}/custody → ordered timeline
```

Frontend renders timeline with action icons and tamper highlighting.

### 5. Tamper detection

| Layer | Detection |
|-------|-----------|
| Storage | On-disk bytes re-hashed ≠ `file_hash` |
| Upload | Client file hash ≠ `file_hash` |
| Blockchain | Hash not found on contract |

Storage tampering is independent of upload — a correct original upload still shows `storage_integrity: TAMPERED` if the server copy was altered.

---

## Trust boundaries (current)

| Boundary | Controls today |
|----------|----------------|
| User → Frontend | None (no authentication) |
| Frontend → API | Open CORS; no API keys |
| API → SQLite | Local file DB |
| API → Storage | OS filesystem permissions |
| API → Ganache | Local test network |

---

## Off-chain storage rationale

Evidence files remain off-chain because:

- Size and cost make on-chain storage impractical.
- SHA-256 hashes on-chain detect any off-chain modification.
- Custody events in SQLite provide operational audit trails.

Encryption at rest is **not implemented**; see `app/services/encryption.py` and Future Work in the root README.

---

## Related documentation

- [Root README](../../README.md) — setup and API summary
- [ADR-001](../decisions/adr-001-offchain-storage.md) — off-chain decision record
- [MIGRATION.md](../MIGRATION.md) — SQLite upgrades

## ADR-001: Off‑Chain Storage of Digital Evidence Files

**Status**: Accepted  
**Date**: 2026‑03‑14  
**Decision Owner**: Architecture Team  

### Implementation status (current codebase)

| Aspect | Implemented? | Notes |
|--------|----------------|-------|
| Off-chain file storage | Yes | `backend/storage/`, plain files |
| SHA-256 hashing | Yes | `app/services/hashing.py` |
| On-chain hash registration | Yes | `EvidenceCustody.sol` via Ganache |
| Chain of custody (SQLite) | Yes | `chain_of_custody_events` table |
| Encryption at rest | **No** | `encryption.py` raises `NotImplementedError` |
| Encrypted object store / KMS | **No** | Future work |

---

## Context

The **Blockchain‑Backed Tamper‑Proof Digital Forensics & Chain‑of‑Custody System** must store and manage a wide variety of digital evidence, including:

- Disk images and memory dumps (often tens or hundreds of GB).
- Log archives, documents, and multimedia files.
- Derived artifacts from forensic analysis.

The system’s primary integrity guarantees are provided by:

- SHA‑256 hashes of evidence files and relevant metadata.
- Immutable custody events stored on an Ethereum blockchain.

An early design question was whether to:

1. Store evidence files directly **on‑chain**, or  
2. Store them **off‑chain** and only record cryptographic proofs (hashes) and custody events on‑chain.

This decision record documents the choice to adopt **off‑chain storage** for evidence files.

---

## Decision

The system will:

- Store **all raw digital evidence files off‑chain**, in a secure, encrypted storage system (e.g., object store, file storage, or on‑premises evidence vault).
- Compute a **SHA‑256 hash** for each evidence file (and optionally for structured metadata).
- Store **only the hashes and custody events on the Ethereum blockchain**, along with minimal metadata necessary for verification and traceability.

Off‑chain storage is treated as potentially mutable but **protected by encryption, access control, and monitoring**, while the blockchain serves as the **immutable source of truth** for integrity and chain‑of‑custody.

---

## Rationale

### 1. Scalability and Cost

- Digital forensic evidence is often very large:
  - Full disk images, mobile phone images, and long‑term log captures can reach hundreds of GB or more.
- Public and private blockchains (including Ethereum) impose:
  - Strict limits on transaction and block size.
  - Significant gas or resource costs per byte stored.
- Attempting to store raw evidence on‑chain would be:
  - Economically prohibitive.
  - Operationally slow and complex to manage.

By storing only **compact hashes and custody events on‑chain**, storage and transaction costs remain manageable while still enabling strong integrity guarantees.

### 2. Performance and User Experience

- Investigators and analysts require timely access to large evidence files for examination.
- On‑chain storage and retrieval would introduce:
  - High latency and bandwidth overhead.
  - Dependence on blockchain node performance for routine evidence access.
- Off‑chain storage systems (e.g., object stores, NAS/SAN) are purpose‑built for:
  - High‑throughput, low‑latency access to large binary objects.
  - Efficient streaming and partial reads.

The hybrid model — large objects off‑chain, hashes on‑chain — provides a **responsive user experience** while preserving verifiability.

### 3. Security and Key Management

- Off‑chain storage allows encryption strategies that are:
  - Flexible (e.g., per‑evidence keys, per‑case keys, or tenant‑scoped keys).
  - Integrable with enterprise key management systems (KMS, HSMs).
- In the event of a storage compromise:
  - Attackers see only encrypted data.
  - Without keys, evidence remains confidential.
- On‑chain data is, by design, globally replicated and transparent (subject to privacy layers), making it unsuitable for raw evidence that may contain:
  - PII and sensitive operational details.
  - Legally restricted or classified information.

By placing only **non‑sensitive hashes and minimal metadata** on‑chain, the design reduces exposure while keeping the evidence verifiable.

### 4. Legal, Regulatory, and Privacy Requirements

- Evidence may include:
  - Personal data subject to data protection regulations.
  - Information with statutory retention or deletion requirements.
- Blockchains are **append‑only and practically immutable**:
  - Once data is on‑chain, it is extremely difficult or impossible to remove.
  - This conflicts with requirements such as the “right to erasure” in some jurisdictions when applied to raw data.
- Off‑chain storage:
  - Supports flexible retention policies, archival strategies, and controlled deletion.
  - Allows compliance with legal holds and court orders.

The system uses blockchain only for **integrity assertions and custody logs**, which are generally acceptable to be immutable as they do not contain full content.

### 5. Clear Separation of Concerns

- **Blockchain Layer**:
  - Ensures immutability and verifiability of:
    - Evidence existence at a given time (via hash).
    - Chronology of custody events.
- **Storage Layer**:
  - Manages large binary objects, encryption, performance, and access control.
- **Application Layer (Backend + Database)**:
  - Orchestrates the relationship between on‑chain records and off‑chain objects.
  - Enforces business logic and user authorization.

This separation allows each layer to be **independently secured, scaled, and evolved**, while maintaining a consistent integrity model.

---

## Consequences

### Positive Consequences

- **Feasible and Cost‑Effective**:
  - The system can handle real‑world forensic evidence sizes without overwhelming blockchain capacity or budgets.
- **Strong Integrity Guarantees**:
  - Any tampering with off‑chain evidence is detectable by recomputing the hash and comparing it to the on‑chain record.
- **Improved Privacy and Compliance**:
  - Sensitive content never appears on‑chain.
  - Storage and retention policies can be tailored to legal and organizational needs.
- **Operational Flexibility**:
  - Storage technologies can be changed (e.g., on‑prem → cloud) without altering the blockchain data model.
  - Encryption schemes and key management approaches can be upgraded over time.

### Negative Consequences / Trade‑offs

- **Dependency on Off‑Chain Infrastructure**:
  - Availability of evidence depends on the reliability and security of the storage system and the backend.
  - If off‑chain storage is lost without backup, the on‑chain hash alone cannot reconstruct the evidence.
- **Additional Integration Complexity**:
  - The backend must reliably coordinate:
    - Encryption and decryption.
    - Hash computation.
    - Consistency between off‑chain storage, database records, and on‑chain data.
- **Verification Workflow Complexity**:
  - Integrity checks require access to the off‑chain file and decryption keys.
  - Auditors must trust that the verification process is correct, or independently re‑implement it.

Despite these trade‑offs, the architecture remains aligned with the system’s primary objective: **tamper‑evident, traceable digital forensics and chain‑of‑custody**, at realistic scale and cost.

---

## Alternatives Considered

1. **Storing Evidence On‑Chain**
   - Rejected due to:
     - Extreme storage and transaction costs.
     - Size and performance limitations.
     - Privacy and regulatory risks.

2. **Using a Distributed Content Addressable Store (e.g., IPFS) as Primary Storage**
   - Considered but deferred due to:
     - Operational and governance complexity for regulated environments.
     - Additional infrastructure overhead.
   - May be revisited as an optional storage backend in future iterations.

---

## Decision Outcome

The project will proceed with **off‑chain encrypted storage of evidence files**, with **on‑chain storage of hashes and custody events** as the authoritative source of integrity and chain‑of‑custody. All subsequent design and implementation work should assume this model as a foundational architectural constraint.


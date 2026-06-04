## Threat Model

> **Implementation note:** This document includes **target-state** security controls (encryption at rest, authentication, PostgreSQL, MFA). The running application uses **SQLite**, **unencrypted** local storage, **no authentication**, and **Ganache**. See the [root README.md](../../README.md) and [system-architecture.md](../architecture/system-architecture.md) for what is actually deployed.

This document captures the threat model for the **Digital Forensics Chain of Custody System**. It identifies critical assets, likely threat actors, key threats, and corresponding mitigations.

The purpose of this threat model is to guide security design decisions, drive testing priorities, and support audits and certifications.

---

## Assets

- **Digital Evidence Files**
  - Raw evidence data (disk images, memory captures, log exports, documents, media files).
  - Stored off‑chain in encrypted storage.

- **Evidence Integrity Proofs**
  - SHA‑256 hashes of evidence files.
  - Optional hashes of structured metadata.
  - Stored on the Ethereum blockchain and mirrored in PostgreSQL.

- **Custody Records**
  - Immutable, chronological records of actions (collect, transfer, view, verify, release).
  - Stored as smart contract events and referenced in the backend database.

- **Encryption Keys**
  - AES keys used to encrypt evidence files off‑chain.
  - Keys (or wrapping keys) may be stored in a KMS or dedicated secrets management system.

- **User Identities and Credentials**
  - Investigator, lab technician, administrator, and auditor accounts.
  - Authentication tokens (e.g., JWTs) and API keys.

- **Backend and Database**
  - FastAPI services and PostgreSQL database instances.
  - Application configuration, access control rules, and audit logs.

- **Blockchain Accounts and Smart Contracts**
  - Deployed custody smart contract(s) on Ethereum.
  - Accounts/keys used for contract administration and transaction signing.

---

## Threat Actors

- **External Attacker**
  - Unauthenticated user on the internet.
  - Goals: gain unauthorized access to evidence or metadata, disrupt service availability, or attempt to inject forged custody records.

- **Malicious Insider (Investigator / Technician)**
  - Authorized user with legitimate access to some evidence.
  - Goals: modify or delete evidence, hide or forge custody events, or access data beyond their need‑to‑know.

- **Compromised Administrator / Privileged Insider**
  - System or database administrator with elevated access.
  - Goals: alter evidence metadata, circumvent audit trails, tamper with logs, or exfiltrate sensitive data and keys.

- **Blockchain‑Focused Adversary**
  - Attacker who targets the Ethereum network, smart contracts, or keys used for blockchain operations.
  - Goals: forge or reorder custody records, exploit vulnerabilities in smart contracts, or perform denial‑of‑service against blockchain access.

- **Supply Chain and Infrastructure Attacker**
  - Attacker exploiting vulnerabilities in third‑party dependencies, container images, or CI/CD pipelines.
  - Goals: inject malicious code, backdoors, or misconfigurations.

---

## Key Threats and Mitigations

### 1. Evidence Tampering (Off‑Chain)

**Description**: An attacker or malicious insider modifies or replaces a stored evidence file in the off‑chain storage system (e.g., changes bytes in a disk image or log file).

**Impact**:
- Potential invalidation of investigative findings and legal cases.
- Loss of trust in the evidence management process.

**Mitigations**:
- **Cryptographic Hashing**:
  - Compute SHA‑256 hash of each evidence file at upload time.
  - Store hashes immutably on the Ethereum blockchain and in PostgreSQL.
- **Regular Integrity Checks**:
  - On demand and periodic verification workflows that:
    - Retrieve the encrypted file.
    - Decrypt it using the AES key.
    - Recompute the hash and compare against the blockchain record.
- **Tamper‑Evident Storage**:
  - Enforce write‑once semantics at the application layer: evidence files are append‑only or immutable.
  - Use storage systems that support object versioning and immutable retention policies.
- **Access Control and Logging**:
  - Strong RBAC: restrict who can upload or mark evidence as superseded.
  - Detailed audit logs for all access to evidence files, including reads and downloads.

---

### 2. Insider Modification of Custody Records

**Description**: A privileged user or administrator attempts to alter or delete historical custody events to conceal mishandling or tampering.

**Impact**:
- Undermines the integrity of the chain‑of‑custody.
- Weakens evidentiary value in legal proceedings.

**Mitigations**:
- **Immutable Blockchain Storage**:
  - All custody events are appended to a smart contract log and cannot be edited or removed once confirmed on the blockchain.
- **Write‑Only API for Custody Events**:
  - The backend only supports appending new events, never updating or deleting existing ones.
- **Role‑Based Permissions**:
  - Only authorized roles can initiate custody actions; their identifiers (or pseudonymous IDs) are recorded on‑chain.
- **Database Consistency Checks**:
  - Periodic reconciliation:
    - Compare custody events in PostgreSQL with those on the blockchain.
    - Detect and flag discrepancies for investigation.

---

### 3. Forged Custody Events

**Description**: An attacker attempts to create fake custody events suggesting that an unauthorized user handled evidence, or that evidence followed a different path than it actually did.

**Impact**:
- Misleading or fabricated history of evidence handling.
- Potential to discredit legitimate evidence by injecting conflicting records.

**Mitigations**:
- **Strong Authentication & MFA**:
  - Enforce secure authentication for all users (password + MFA or hardware tokens).
- **Backend‑Mediated Contract Access**:
  - Users do not interact with the smart contract directly.
  - All blockchain writes are performed by the backend after enforcing authorization and validation rules.
- **Cryptographic Binding to Evidence IDs**:
  - Custody events reference canonical evidence IDs and hashes.
  - The contract validates that events are associated with existing evidence records.
- **Audit Trails and Alerts**:
  - Monitor for anomalous custody patterns (e.g., unexpected transfers or high‑volume activity).
  - Generate alerts and require secondary approvals for sensitive actions.

---

### 4. Unauthorized Access to Evidence Files

**Description**: An external attacker, insider, or compromised account gains access to raw evidence files or decrypted content without proper authorization.

**Impact**:
- Exposure of sensitive investigative data and PII.
- Legal and regulatory violations.

**Mitigations**:
- **AES Encryption at Rest**:
  - Encrypt all evidence files with strong AES (e.g., AES‑256‑GCM).
  - Store keys in a KMS or secure secrets manager with strict access controls.
- **Least‑Privilege Access to Decryption Keys**:
  - Only the backend service (and limited operational workflows) may obtain decryption keys.
  - Operators cannot directly access keys or unencrypted files.
- **Fine‑Grained Authorization**:
  - Role‑based and case‑based access control policies in the backend.
  - Restrict who can view or download evidence.
- **Network Segmentation**:
  - Isolate evidence storage and database from public networks.
  - Use private subnets, firewalls, and VPC‑level controls.

---

### 5. Unauthorized Access to Custody Metadata

**Description**: An attacker gains access to metadata that reveals sensitive information (who handled which evidence, when, and for which case), even if the evidence content remains encrypted.

**Impact**:
- Privacy and operational security concerns.
- Potential to infer investigative scope and relationships.

**Mitigations**:
- **Pseudonymization of User Identifiers On‑Chain**:
  - On‑chain records may store pseudonymous IDs or role identifiers instead of full personal details.
- **Access Control to Backend APIs**:
  - Only authorized users can resolve pseudonymous IDs to real identities.
- **Minimization of On‑Chain Metadata**:
  - Limit on‑chain data to what is necessary for integrity and traceability.
  - Keep detailed mappings in the backend database with stricter access control.

---

### 6. Compromise of Backend or Database

**Description**: An attacker compromises the FastAPI backend or PostgreSQL database (e.g., via vulnerability exploitation or stolen credentials).

**Impact**:
- Manipulation of metadata.
- Unauthorized access to encrypted evidence or decryption operations.
- Attempted creation of fraudulent custody events.

**Mitigations**:
- **Defense‑in‑Depth**:
  - Network isolation, hardened OS images, and minimized attack surface.
  - Regular patching, vulnerability scanning, and dependency management.
- **Separation of Duties**:
  - Distinct roles for system administration, security operations, and application maintenance.
- **Restricted DB Permissions**:
  - Application accounts only have the minimum required privileges.
  - Use read‑only replicas for reporting where appropriate.
- **Immutable Blockchain Layer**:
  - Even if the database is compromised, existing on‑chain custody records remain tamper‑evident.
  - Reconciliation processes can identify discrepancies introduced by a compromised backend.

---

### 7. Smart Contract Vulnerabilities

**Description**: Bugs or design flaws in the smart contract allow unauthorized state changes, reordering of events, or denial‑of‑service.

**Impact**:
- Corrupted or inconsistent custody records.
- Inability to append new events or verify integrity.

**Mitigations**:
- **Formalized Contract Design and Review**:
  - Clear specification of data structures and invariants (e.g., monotonic event sequence numbers per evidence ID).
  - Peer review and security assessment of the design and implementation.
- **Controlled Upgrade Mechanisms**:
  - If upgradability is required, implement it with strict governance (e.g., multi‑sig for admin actions).
- **Use of Test Networks and Tools**:
  - Thorough testing on Ganache and other test networks before main deployment.
  - Use static analysis and fuzzing tools where appropriate.

---

### 8. Denial‑of‑Service (DoS)

**Description**: Attackers flood the API, blockchain node, or storage backends with requests to degrade service.

**Impact**:
- Delayed evidence registration and custody updates.
- Reduced availability for investigators and auditors.

**Mitigations**:
- **Rate Limiting and Throttling**:
  - Enforce per‑user and per‑IP limits on API endpoints.
- **Autoscaling and Resource Isolation**:
  - Use container‑based scaling strategies for backend services where appropriate.
- **Circuit Breakers and Backoff Strategies**:
  - Gracefully handle blockchain or storage back‑pressure.

---

## Summary

By combining off‑chain encrypted storage for large evidence files with on‑chain immutable hashes and custody records, the system is designed to make tampering and unauthorized modifications **detectable and attributable**, while enforcing strong access control and privacy safeguards. This threat model should be revisited regularly as the system evolves and as new threats, regulatory requirements, and deployment contexts emerge.


## Documentation (`docs/`)

Design and security documentation for the Digital Forensics Chain of Custody project.

> **Important:** Some documents describe target or enterprise architecture (encryption, PostgreSQL, authentication). The **as-built system** is documented in the [root README.md](../README.md) and [architecture/system-architecture.md](architecture/system-architecture.md).

### Index

| Document | Description |
|----------|-------------|
| [architecture/system-architecture.md](architecture/system-architecture.md) | **Current** implementation architecture |
| [MIGRATION.md](MIGRATION.md) | SQLite schema upgrades on startup |
| [decisions/adr-001-offchain-storage.md](decisions/adr-001-offchain-storage.md) | Why evidence files stay off-chain |
| [threat-model/threat-model.md](threat-model/threat-model.md) | Threat analysis (includes planned controls) |
| [smart-contract/contract-design.md](smart-contract/contract-design.md) | Contract design notes |
| [ui-wireframes/wireframes.md](ui-wireframes/wireframes.md) | Early UI wireframes |

### For implementers

- Start with the root README and `system-architecture.md`.
- Treat encryption, Docker, and PostgreSQL references in older docs as **future work** unless marked as implemented.

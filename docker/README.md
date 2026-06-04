## Docker (`docker/`)

> **Status:** Not used for the supported local development workflow.

This folder contains experimental Docker artifacts (`Dockerfile`, `docker-compose.yml`) oriented toward a **PostgreSQL + backend** stack that is **not** aligned with the current application defaults.

### What the project actually uses

- **SQLite** (`backend/test.db`)
- Manual or scripted startup (`setup.ps1`, `setup.sh`)
- **Ganache** started separately on the host

See the [root README.md](../README.md) for the supported quick start.

### Future work

Docker-based deployment is listed under **Future Work** in the root README (containerized backend, database, and blockchain services).

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router as api_router
from app.db.database import engine
from app.db.migrations import run_startup_migrations
from app.services.blockchain import ensure_blockchain_ready

run_startup_migrations(engine)


def create_application() -> FastAPI:
    """
    Create and configure the FastAPI application instance.

    This service acts as the main backend entrypoint for:
    - Evidence upload and registration.
    - Evidence retrieval.
    - Integrity verification against blockchain-backed hashes.
    """
    app = FastAPI(
        title="Digital Forensics Chain of Custody API",
        version="1.0.0",
        description=(
            "Forensic evidence management with case workflows, chain of custody "
            "audit trails, and blockchain-backed integrity verification."
        ),
    )

    # CORS configuration can be tightened for specific frontends/environments.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router, prefix="/api")

    @app.on_event("startup")
    def verify_blockchain_dependencies() -> None:
        ensure_blockchain_ready()

    return app


app = create_application()


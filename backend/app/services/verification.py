import logging
import os

from sqlalchemy.orm import Session

from app.db.models import Evidence
from app.services.blockchain import verify_on_chain
from app.services.custody import TAMPER_DETECTED, VERIFY, log_custody_event
from app.services.hashing import hash_file

logger = logging.getLogger(__name__)

VALID = "VALID"
TAMPERED = "TAMPERED"
NOT_CHECKED = "NOT_CHECKED"


def _read_stored_file_hash(evidence: Evidence) -> str | None:
    file_path = evidence.file_path
    if not file_path or not os.path.isfile(file_path):
        return None
    with open(file_path, "rb") as file_handle:
        content = file_handle.read()
    if not content:
        return None
    return hash_file(content)


def check_storage_integrity(evidence: Evidence) -> str:
    db_hash = evidence.file_hash
    stored_hash = _read_stored_file_hash(evidence)
    if stored_hash and stored_hash == db_hash:
        return VALID
    return TAMPERED


def check_blockchain_integrity(evidence: Evidence) -> str:
    try:
        if verify_on_chain(evidence.file_hash):
            return VALID
    except Exception as exc:
        logger.exception("Blockchain verification failed for evidence %s: %s", evidence.id, exc)
    return TAMPERED


def check_uploaded_integrity(uploaded_content: bytes | None, db_hash: str) -> str:
    if uploaded_content is None:
        return NOT_CHECKED
    if not uploaded_content:
        return TAMPERED
    uploaded_hash = hash_file(uploaded_content)
    return VALID if uploaded_hash == db_hash else TAMPERED


def run_verification(
    evidence: Evidence,
    *,
    uploaded_content: bytes | None = None,
    check_uploaded: bool = False,
) -> dict[str, str]:
    db_hash = evidence.file_hash
    uploaded_integrity = (
        check_uploaded_integrity(uploaded_content, db_hash)
        if check_uploaded
        else NOT_CHECKED
    )
    storage_integrity = check_storage_integrity(evidence)
    blockchain_integrity = check_blockchain_integrity(evidence)

    return {
        "uploaded_file_integrity": uploaded_integrity,
        "storage_integrity": storage_integrity,
        "blockchain_integrity": blockchain_integrity,
    }


def record_verification_custody(
    db: Session,
    evidence: Evidence,
    *,
    performed_by: str,
    verification: dict[str, str],
    details: str = "Integrity verification performed",
) -> None:
    log_custody_event(
        db,
        case_id=evidence.case_id,
        evidence_id=evidence.id,
        action=VERIFY,
        performed_by=performed_by,
        details=details,
    )

    tamper_reasons = []
    if verification["storage_integrity"] == TAMPERED:
        tamper_reasons.append("Stored file hash mismatch")
    if verification.get("uploaded_file_integrity") == TAMPERED:
        tamper_reasons.append("Uploaded file hash mismatch")

    if tamper_reasons:
        log_custody_event(
            db,
            case_id=evidence.case_id,
            evidence_id=evidence.id,
            action=TAMPER_DETECTED,
            performed_by="System",
            details="; ".join(tamper_reasons),
        )

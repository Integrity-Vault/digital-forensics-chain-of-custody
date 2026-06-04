from sqlalchemy.orm import Session

from app.db.models import ChainOfCustodyEvent

CASE_CREATED = "CASE_CREATED"
UPLOAD = "UPLOAD"
VIEW = "VIEW"
VERIFY = "VERIFY"
DOWNLOAD = "DOWNLOAD"
TRANSFER = "TRANSFER"
BLOCKCHAIN_REGISTERED = "BLOCKCHAIN_REGISTERED"
TAMPER_DETECTED = "TAMPER_DETECTED"


def log_custody_event(
    db: Session,
    *,
    case_id: str,
    action: str,
    performed_by: str,
    details: str = "",
    evidence_id: str | None = None,
) -> ChainOfCustodyEvent:
    event = ChainOfCustodyEvent(
        case_id=case_id,
        evidence_id=evidence_id,
        action=action,
        performed_by=performed_by,
        details=details,
    )
    db.add(event)
    db.flush()
    return event

from app.db.models import Case, ChainOfCustodyEvent, Evidence
from app.services.verification import check_blockchain_integrity, check_storage_integrity, VALID


def format_timestamp(value) -> str:
    if value is None:
        return ""
    return value.strftime("%d %b %Y %H:%M")


def serialize_case(case: Case) -> dict:
    return {
        "case_id": case.case_id,
        "case_name": case.case_name,
        "investigator_name": case.investigator_name,
        "created_at": format_timestamp(case.created_at),
    }


def serialize_custody_event(event: ChainOfCustodyEvent) -> dict:
    return {
        "event_id": event.event_id,
        "case_id": event.case_id,
        "evidence_id": event.evidence_id,
        "action": event.action,
        "performed_by": event.performed_by,
        "timestamp": format_timestamp(event.timestamp),
        "details": event.details or "",
    }


def serialize_evidence_summary(evidence: Evidence) -> dict:
    storage = check_storage_integrity(evidence)
    blockchain = check_blockchain_integrity(evidence)
    overall = VALID if storage == VALID and blockchain == VALID else "TAMPERED"

    return {
        "evidence_id": evidence.id,
        "case_id": evidence.case_id,
        "evidence_name": evidence.evidence_name,
        "description": evidence.description or "",
        "file_name": evidence.file_name,
        "uploaded_at": format_timestamp(evidence.uploaded_at),
        "blockchain_registered": bool(evidence.blockchain_tx),
        "integrity_status": overall,
        "storage_integrity": storage,
        "blockchain_integrity": blockchain,
    }


def serialize_evidence_detail(evidence: Evidence) -> dict:
    summary = serialize_evidence_summary(evidence)
    summary["blockchain_status"] = "Registered" if evidence.blockchain_tx else "Pending"
    return summary

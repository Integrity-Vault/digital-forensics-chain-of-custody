import logging
import os
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import JSONResponse
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.api.schemas import (
    format_timestamp,
    serialize_case,
    serialize_custody_event,
    serialize_evidence_detail,
    serialize_evidence_summary,
)
from app.db.database import get_db
from app.db.models import Case, ChainOfCustodyEvent, Evidence
from app.services.blockchain import register_on_chain
from app.services.custody import (
    BLOCKCHAIN_REGISTERED,
    CASE_CREATED,
    UPLOAD,
    VIEW,
    log_custody_event,
)
from app.services.hashing import hash_file
from app.services.verification import (
    NOT_CHECKED,
    TAMPERED,
    VALID,
    record_verification_custody,
    run_verification,
)

router = APIRouter()
logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
storage_path = os.path.join(BASE_DIR, "storage")
os.makedirs(storage_path, exist_ok=True)


def success_response(data: dict, status_code: int = 200) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"status": "success", "data": data})


def error_response(message: str, status_code: int) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"status": "error", "message": message})


def is_valid_uuid(value: str) -> bool:
    try:
        UUID(value)
        return True
    except ValueError:
        return False


def get_case_or_404(db: Session, case_id: str) -> Case | None:
    return db.query(Case).filter(Case.case_id == case_id).first()


# --- Cases ---


@router.post("/cases")
def create_case(
    case_id: str = Form(...),
    case_name: str = Form(...),
    investigator_name: str = Form(...),
    db: Session = Depends(get_db),
):
    case_id = case_id.strip()
    if not case_id:
        return error_response("case_id is required", 400)

    if db.query(Case).filter(Case.case_id == case_id).first():
        return error_response("Case already exists", 409)

    case = Case(
        case_id=case_id,
        case_name=case_name.strip(),
        investigator_name=investigator_name.strip(),
    )
    db.add(case)
    db.flush()

    log_custody_event(
        db,
        case_id=case.case_id,
        action=CASE_CREATED,
        performed_by=case.investigator_name,
        details=f"Case opened: {case.case_name}",
    )
    db.commit()
    db.refresh(case)

    return success_response(serialize_case(case), status_code=201)


@router.get("/cases")
def list_cases(db: Session = Depends(get_db)):
    cases = db.query(Case).order_by(desc(Case.created_at)).all()
    results = []
    for case in cases:
        evidence_count = db.query(Evidence).filter(Evidence.case_id == case.case_id).count()
        item = serialize_case(case)
        item["evidence_count"] = evidence_count
        results.append(item)
    return success_response({"cases": results, "total": len(results)})


@router.get("/cases/{case_id}")
def get_case_dashboard(case_id: str, db: Session = Depends(get_db)):
    case = get_case_or_404(db, case_id)
    if not case:
        return error_response("Case not found", 404)

    evidence_items = (
        db.query(Evidence)
        .filter(Evidence.case_id == case_id)
        .order_by(desc(Evidence.uploaded_at))
        .all()
    )
    custody_events = (
        db.query(ChainOfCustodyEvent)
        .filter(ChainOfCustodyEvent.case_id == case_id)
        .order_by(desc(ChainOfCustodyEvent.timestamp))
        .all()
    )

    evidence_summaries = [serialize_evidence_summary(item) for item in evidence_items]
    tampering_alerts = sum(1 for item in evidence_summaries if item["integrity_status"] == TAMPERED)
    verified_count = sum(1 for item in evidence_summaries if item["integrity_status"] == VALID)

    overall_status = "SECURE"
    if tampering_alerts > 0:
        overall_status = "COMPROMISED"
    elif len(evidence_summaries) == 0:
        overall_status = "NO_EVIDENCE"

    return success_response(
        {
            "case": serialize_case(case),
            "evidence_count": len(evidence_summaries),
            "verified_evidence_count": verified_count,
            "tampering_alerts": tampering_alerts,
            "case_integrity_status": overall_status,
            "evidence": evidence_summaries,
            "chain_of_custody": [serialize_custody_event(event) for event in custody_events],
        }
    )


@router.get("/cases/{case_id}/custody")
def get_case_custody_timeline(case_id: str, db: Session = Depends(get_db)):
    case = get_case_or_404(db, case_id)
    if not case:
        return error_response("Case not found", 404)

    events = (
        db.query(ChainOfCustodyEvent)
        .filter(ChainOfCustodyEvent.case_id == case_id)
        .order_by(ChainOfCustodyEvent.timestamp)
        .all()
    )
    return success_response(
        {
            "case": serialize_case(case),
            "events": [serialize_custody_event(event) for event in events],
        }
    )


# --- Dashboard ---


@router.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db)):
    total_cases = db.query(Case).count()
    total_evidence = db.query(Evidence).count()

    evidence_items = db.query(Evidence).all()
    verified_count = 0
    tampering_alerts = 0
    for item in evidence_items:
        summary = serialize_evidence_summary(item)
        if summary["integrity_status"] == VALID:
            verified_count += 1
        else:
            tampering_alerts += 1

    recent_events = (
        db.query(ChainOfCustodyEvent)
        .order_by(desc(ChainOfCustodyEvent.timestamp))
        .limit(10)
        .all()
    )

    recent_cases = db.query(Case).order_by(desc(Case.created_at)).limit(5).all()

    return success_response(
        {
            "total_cases": total_cases,
            "total_evidence": total_evidence,
            "verified_evidence": verified_count,
            "tampering_alerts": tampering_alerts,
            "recent_activity": [serialize_custody_event(event) for event in recent_events],
            "recent_cases": [serialize_case(case) for case in recent_cases],
        }
    )


# --- Evidence ---


@router.post("/evidence/upload")
async def upload_evidence(
    case_id: str = Form(...),
    evidence_name: str = Form(...),
    performed_by: str = Form(...),
    file: UploadFile = File(...),
    description: str = Form(""),
    db: Session = Depends(get_db),
):
    case_id = case_id.strip()
    case = get_case_or_404(db, case_id)
    if not case:
        return error_response("Case does not exist. Create the case before uploading evidence.", 400)

    if file is None or not file.filename:
        return error_response("No file was provided", 400)

    content = await file.read()
    if not content:
        return error_response("Uploaded file is empty", 400)

    file_hash = hash_file(content)
    original_name = os.path.basename(file.filename)
    investigator = performed_by.strip() or case.investigator_name

    file_path = None
    try:
        evidence = Evidence(
            case_id=case_id,
            evidence_name=evidence_name.strip() or original_name,
            description=description.strip(),
            file_name=original_name,
            file_hash=file_hash,
        )
        db.add(evidence)
        db.flush()

        file_path = os.path.join(storage_path, f"{evidence.id}_{original_name}")
        with open(file_path, "wb") as file_handle:
            file_handle.write(content)
        evidence.file_path = file_path

        log_custody_event(
            db,
            case_id=case_id,
            evidence_id=evidence.id,
            action=UPLOAD,
            performed_by=investigator,
            details=f"Added {evidence.evidence_name}",
        )
        db.commit()
        db.refresh(evidence)
    except Exception as exc:
        logger.exception("Failed to store evidence: %s", exc)
        db.rollback()
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
        return error_response("Failed to store evidence", 500)

    blockchain_tx = None
    try:
        blockchain_tx = register_on_chain(file_hash)
        if blockchain_tx:
            evidence.blockchain_tx = str(blockchain_tx)
            log_custody_event(
                db,
                case_id=case_id,
                evidence_id=evidence.id,
                action=BLOCKCHAIN_REGISTERED,
                performed_by="System",
                details="Hash written to blockchain",
            )
            db.commit()
            db.refresh(evidence)
    except Exception as exc:
        logger.exception("Blockchain registration failed for evidence %s: %s", evidence.id, exc)

    return success_response(
        {
            "evidence_id": evidence.id,
            "case_id": evidence.case_id,
            "evidence_name": evidence.evidence_name,
            "file_name": evidence.file_name,
            "blockchain_status": "Registered" if evidence.blockchain_tx else "Pending",
            "integrity_status": "Registered",
        },
        status_code=201,
    )


@router.get("/evidence/{evidence_id}")
def get_evidence(evidence_id: str, performed_by: str = "System", db: Session = Depends(get_db)):
    if not is_valid_uuid(evidence_id):
        return error_response("Invalid evidence_id format", 400)

    evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not evidence:
        return error_response("Evidence not found", 404)

    log_custody_event(
        db,
        case_id=evidence.case_id,
        evidence_id=evidence.id,
        action=VIEW,
        performed_by=performed_by,
        details=f"Viewed {evidence.evidence_name}",
    )
    db.commit()

    return success_response(serialize_evidence_detail(evidence))


@router.post("/evidence/verify-id")
def verify_evidence_by_id(
    evidence_id: str = Form(...),
    performed_by: str = Form("System"),
    db: Session = Depends(get_db),
):
    if not is_valid_uuid(evidence_id):
        return error_response("Invalid evidence_id format", 400)

    evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not evidence:
        return error_response("Evidence not found", 404)

    verification = run_verification(evidence, check_uploaded=False)
    record_verification_custody(
        db,
        evidence,
        performed_by=performed_by.strip() or "System",
        verification=verification,
        details="Storage and blockchain integrity verification performed",
    )
    db.commit()

    return success_response(
        {
            "evidence_id": evidence.id,
            "evidence_name": evidence.evidence_name,
            "case_id": evidence.case_id,
            **verification,
            "overall_integrity": (
                VALID
                if verification["storage_integrity"] == VALID
                and verification["blockchain_integrity"] == VALID
                else TAMPERED
            ),
        }
    )


@router.post("/evidence/verify-file")
async def verify_evidence_with_file(
    evidence_id: str = Form(...),
    file: UploadFile = File(...),
    performed_by: str = Form("System"),
    db: Session = Depends(get_db),
):
    if not is_valid_uuid(evidence_id):
        return error_response("Invalid evidence_id format", 400)

    evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not evidence:
        return error_response("Evidence not found", 404)

    await file.seek(0)
    content = await file.read()
    if not content:
        return error_response("Empty file received", 400)

    verification = run_verification(evidence, uploaded_content=content, check_uploaded=True)
    record_verification_custody(
        db,
        evidence,
        performed_by=performed_by.strip() or "System",
        verification=verification,
        details="Full integrity verification performed (uploaded file, storage, blockchain)",
    )
    db.commit()

    overall = VALID
    for key in ("uploaded_file_integrity", "storage_integrity", "blockchain_integrity"):
        if verification[key] == TAMPERED:
            overall = TAMPERED
            break

    return success_response(
        {
            "evidence_id": evidence.id,
            "evidence_name": evidence.evidence_name,
            "case_id": evidence.case_id,
            **verification,
            "overall_integrity": overall,
        }
    )


@router.post("/evidence/verify")
async def verify_stored_evidence(
    evidence_id: str = Form(...),
    file: UploadFile = File(...),
    performed_by: str = Form("System"),
    db: Session = Depends(get_db),
):
    return await verify_evidence_with_file(
        evidence_id=evidence_id,
        file=file,
        performed_by=performed_by,
        db=db,
    )

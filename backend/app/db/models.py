import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship

from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


def utc_now():
    return datetime.now(timezone.utc)


class Case(Base):
    __tablename__ = "cases"

    case_id = Column(String, primary_key=True)
    case_name = Column(String, nullable=False)
    investigator_name = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    evidence_items = relationship("Evidence", back_populates="case", cascade="all, delete-orphan")
    custody_events = relationship("ChainOfCustodyEvent", back_populates="case", cascade="all, delete-orphan")


class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String, ForeignKey("cases.case_id"), nullable=False, index=True)
    evidence_name = Column(String, nullable=False)
    description = Column(Text, default="")
    file_name = Column(String, nullable=False)
    file_hash = Column(String, nullable=False)
    file_path = Column(String)
    blockchain_tx = Column(String)
    uploaded_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    case = relationship("Case", back_populates="evidence_items")
    custody_events = relationship("ChainOfCustodyEvent", back_populates="evidence")


class ChainOfCustodyEvent(Base):
    __tablename__ = "chain_of_custody_events"

    event_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String, ForeignKey("cases.case_id"), nullable=False, index=True)
    evidence_id = Column(String, ForeignKey("evidence.id"), nullable=True, index=True)
    action = Column(String, nullable=False)
    performed_by = Column(String, nullable=False)
    timestamp = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    details = Column(Text, default="")

    case = relationship("Case", back_populates="custody_events")
    evidence = relationship("Evidence", back_populates="custody_events")

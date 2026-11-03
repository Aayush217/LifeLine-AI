"""
PostgreSQL Database layer with SQLAlchemy for LifeLine AI.
Persists all Users, Requests, Warnings, Proactive Donations, and Blood Banks.
Includes zero-crash resilient fallback for cloud deployment (e.g., Render/Railway/Neon).
"""
import os
import json
import uuid
import random
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

from sqlalchemy import (
    create_engine,
    Column,
    String,
    Integer,
    Float,
    Text,
    DateTime,
    Boolean
)
from sqlalchemy.orm import declarative_base, sessionmaker, scoped_session

logger = logging.getLogger("lifeline.db")

# Read database URL, converting postgres:// and postgresql:// to postgresql+psycopg2://
RAW_DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@127.0.0.1:5432/lifeline")
if RAW_DATABASE_URL.startswith("postgres://"):
    RAW_DATABASE_URL = RAW_DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
elif RAW_DATABASE_URL.startswith("postgresql://"):
    RAW_DATABASE_URL = RAW_DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

# Establish connection engine with resilient fallback
try:
    engine = create_engine(
        RAW_DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=300
    )
    # Test connection
    with engine.connect() as test_conn:
        pass
    logger.info("Successfully connected to primary PostgreSQL database.")
except Exception as db_err:
    logger.warning(
        f"Primary database connection failed ({db_err}). Falling back to persistent local SQLite."
    )
    FALLBACK_URL = "sqlite:///./lifeline_local.db"
    engine = create_engine(FALLBACK_URL, connect_args={"check_same_thread": False})

SessionLocal = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))
Base = declarative_base()

# ─── SQLALCHEMY MODELS ────────────────────────────────────────────────────────

class UserModel(Base):
    __tablename__ = "users"

    id = Column(String(64), primary_key=True)
    name = Column(String(128), nullable=False)
    email = Column(String(128), unique=True, index=True, nullable=False)
    password = Column(String(256), nullable=False)
    role = Column(String(32), default="donor") # 'admin', 'hospital', 'donor'
    blood_type = Column(String(16), default="O+")
    lat = Column(Float, default=26.9124)
    lng = Column(Float, default=75.7873)
    points = Column(Integer, default=0)
    lives_saved = Column(Integer, default=0)
    badges = Column(Text, default="[]") # JSON list of strings
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        try:
            badges_list = json.loads(self.badges) if self.badges else []
        except Exception:
            badges_list = []
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "password": self.password,
            "role": self.role,
            "bloodType": self.blood_type,
            "location": {"lat": self.lat, "lng": self.lng},
            "points": self.points,
            "livesSaved": self.lives_saved,
            "badges": badges_list,
            "createdAt": self.created_at.isoformat() if self.created_at else None
        }


class ActiveRequestModel(Base):
    __tablename__ = "active_requests"

    id = Column(String(64), primary_key=True)
    hospital_id = Column(String(64), nullable=True)
    blood_type = Column(String(16), nullable=False)
    units_needed = Column(Integer, default=1)
    urgency = Column(String(32), default="Critical")
    lat = Column(Float, default=26.9124)
    lng = Column(Float, default=75.7873)
    matches = Column(Integer, default=0)
    eta = Column(Integer, default=15)
    routing_details = Column(Text, default="[]") # JSON list of routing details
    accepted_donors = Column(Text, default="[]") # JSON list of donor IDs
    status = Column(String(32), default="active") # 'active', 'closed'
    timestamp = Column(String(64), default=lambda: datetime.utcnow().isoformat())

    def to_dict(self):
        try:
            routing = json.loads(self.routing_details) if self.routing_details else []
        except Exception:
            routing = []
        try:
            donors = json.loads(self.accepted_donors) if self.accepted_donors else []
        except Exception:
            donors = []
        return {
            "id": self.id,
            "hospital_id": self.hospital_id,
            "bloodType": self.blood_type,
            "unitsNeeded": self.units_needed,
            "urgency": self.urgency,
            "lat": self.lat,
            "lng": self.lng,
            "matches": self.matches,
            "eta": self.eta,
            "routingDetails": routing,
            "accepted_donors": donors,
            "status": self.status,
            "timestamp": self.timestamp
        }


class WarningModel(Base):
    __tablename__ = "warnings"

    id = Column(String(64), primary_key=True)
    region_id = Column(String(64), nullable=False)
    blood_type = Column(String(16), default="Any")
    message = Column(Text, nullable=False)
    severity = Column(String(32), default="High")
    timestamp = Column(String(64), default=lambda: datetime.utcnow().isoformat())

    def to_dict(self):
        return {
            "id": self.id,
            "region_id": self.region_id,
            "bloodType": self.blood_type,
            "message": self.message,
            "severity": self.severity,
            "timestamp": self.timestamp
        }


class ProactiveDonationModel(Base):
    __tablename__ = "proactive_donations"

    id = Column(String(64), primary_key=True)
    donor_id = Column(String(64), nullable=False)
    hospital_id = Column(String(64), nullable=False)
    hospital_name = Column(String(128), nullable=False)
    blood_type = Column(String(16), default="O+")
    status = Column(String(32), default="Scheduled")
    timestamp = Column(String(64), default=lambda: datetime.utcnow().isoformat())

    def to_dict(self):
        return {
            "id": self.id,
            "donor_id": self.donor_id,
            "hospital_id": self.hospital_id,
            "hospital_name": self.hospital_name,
            "bloodType": self.blood_type,
            "status": self.status,
            "timestamp": self.timestamp
        }


class BloodBankModel(Base):
    __tablename__ = "blood_banks"

    id = Column(String(64), primary_key=True)
    name = Column(String(128), nullable=False)
    address = Column(String(256), nullable=False)
    contact = Column(String(64), default="+91 141 2560291")
    lat = Column(Float, default=26.9124)
    lng = Column(Float, default=75.7873)
    available_units = Column(Integer, default=120)
    inventory = Column(Text, default="{}") # JSON of blood types: { "O-": 12, "O+": 25, ... }

    def to_dict(self):
        try:
            inv = json.loads(self.inventory) if self.inventory else {}
        except Exception:
            inv = {}
        return {
            "id": self.id,
            "name": self.name,
            "address": self.address,
            "contact": self.contact,
            "lat": self.lat,
            "lng": self.lng,
            "availableUnits": self.available_units,
            "inventory": inv
        }


class HospitalStorageBatchModel(Base):
    __tablename__ = "hospital_storage"

    id = Column(String(64), primary_key=True)
    hospital_id = Column(String(64), nullable=False, index=True)
    batch_number = Column(String(64), nullable=False)
    blood_type = Column(String(16), nullable=False)
    units = Column(Integer, default=1)
    expiry_days = Column(Integer, default=35)
    priority = Column(String(32), default="Stable")
    timestamp = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "hospital_id": self.hospital_id,
            "batchNumber": self.batch_number,
            "bloodType": self.blood_type,
            "units": self.units,
            "expiryDays": self.expiry_days,
            "priority": self.priority,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None
        }


class SystemMetaModel(Base):
    __tablename__ = "system_meta"

    key = Column(String(64), primary_key=True)
    value = Column(String(256), nullable=False)


class PasswordResetTokenModel(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(String(64), primary_key=True)
    email = Column(String(128), index=True, nullable=False)
    code = Column(String(32), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


# Auto-create tables
Base.metadata.create_all(bind=engine)


# ─── SEED INITIAL DATA IF EMPTY ───────────────────────────────────────────────

def seed_defaults():
    session = SessionLocal()
    try:
        # Seed Admin if not exists
        admin = session.query(UserModel).filter_by(id="admin").first()
        if not admin:
            admin_user = UserModel(
                id="admin",
                name="System Administrator",
                email="admin@lifeline.com",
                password="admin",
                role="admin",
                blood_type="Any",
                lat=26.9124,
                lng=75.7873,
                points=0,
                lives_saved=0,
                badges="[]"
            )
            session.add(admin_user)

        # Remove any lingering dummy active requests
        session.query(ActiveRequestModel).filter(ActiveRequestModel.id == "REQ-SMS-01").delete()

        # Seed initial accredited Blood Banks in Jaipur ONCE on setup
        init_flag = session.query(SystemMetaModel).filter_by(key="blood_banks_initialized").first()
        if not init_flag:
            if session.query(BloodBankModel).count() == 0:
                sample_banks = [
                    BloodBankModel(
                        id="BB-SMS",
                        name="SMS Hospital Central Blood Bank",
                        address="JLN Marg, Ashok Nagar, Jaipur",
                        contact="+91 141 2518291",
                        lat=26.8924,
                        lng=75.8152,
                        available_units=184,
                        inventory=json.dumps({"O-": 8, "O+": 42, "A+": 38, "B+": 51, "AB+": 25, "A-": 6, "B-": 9, "AB-": 5})
                    ),
                    BloodBankModel(
                        id="BB-SDMH",
                        name="Santokba Durlabhji Memorial Blood Bank",
                        address="Bhawani Singh Marg, Bapu Nagar, Jaipur",
                        contact="+91 141 2566251",
                        lat=26.8988,
                        lng=75.8034,
                        available_units=120,
                        inventory=json.dumps({"O-": 4, "O+": 28, "A+": 24, "B+": 36, "AB+": 16, "A-": 3, "B-": 5, "AB-": 4})
                    ),
                    BloodBankModel(
                        id="BB-ROTARY",
                        name="Rotary Club Regional Blood Center",
                        address="Sector 5, Malviya Nagar, Jaipur",
                        contact="+91 141 2722100",
                        lat=26.8532,
                        lng=75.8194,
                        available_units=95,
                        inventory=json.dumps({"O-": 2, "O+": 22, "A+": 19, "B+": 31, "AB+": 11, "A-": 2, "B-": 4, "AB-": 4})
                    ),
                    BloodBankModel(
                        id="BB-EHCC",
                        name="Eternal Heart Care Blood Storage Reserve",
                        address="Jawahar Circle, Malviya Nagar, Jaipur",
                        contact="+91 141 5174000",
                        lat=26.8398,
                        lng=75.8042,
                        available_units=76,
                        inventory=json.dumps({"O-": 5, "O+": 18, "A+": 14, "B+": 22, "AB+": 10, "A-": 1, "B-": 4, "AB-": 2})
                    )
                ]
                session.add_all(sample_banks)
            session.add(SystemMetaModel(key="blood_banks_initialized", value="true"))

        session.commit()
    except Exception as e:
        session.rollback()
        logger.error(f"Error seeding database defaults: {e}")
    finally:
        session.close()

seed_defaults()


# ─── CRUD HELPER FUNCTIONS (API COMPATIBLE) ───────────────────────────────────

def get_user_by_email(email: str) -> Optional[dict]:
    session = SessionLocal()
    try:
        user = session.query(UserModel).filter(UserModel.email == email).first()
        return user.to_dict() if user else None
    finally:
        session.close()

def get_user_by_id(user_id: str) -> Optional[dict]:
    session = SessionLocal()
    try:
        user = session.query(UserModel).filter(UserModel.id == user_id).first()
        return user.to_dict() if user else None
    finally:
        session.close()

def add_user(user_data: dict) -> dict:
    session = SessionLocal()
    try:
        user_id = user_data.get("id") or str(uuid.uuid4())
        loc = user_data.get("location", {})
        badges_json = json.dumps(user_data.get("badges", []))
        
        user_model = UserModel(
            id=user_id,
            name=user_data.get("name", "User"),
            email=user_data["email"],
            password=user_data.get("password", ""),
            role=user_data.get("role", "donor"),
            blood_type=user_data.get("bloodType", "O+"),
            lat=loc.get("lat", user_data.get("lat", 26.9124)),
            lng=loc.get("lng", user_data.get("lng", 75.7873)),
            points=user_data.get("points", 0),
            lives_saved=user_data.get("livesSaved", 0),
            badges=badges_json
        )
        session.add(user_model)
        session.commit()
        session.refresh(user_model)
        return user_model.to_dict()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

def get_leaderboard() -> List[dict]:
    session = SessionLocal()
    try:
        donors = session.query(UserModel).filter(UserModel.role == "donor") \
            .order_by(UserModel.points.desc()).limit(10).all()
        safe_donors = []
        for d in donors:
            d_dict = d.to_dict()
            d_dict.pop("password", None)
            safe_donors.append(d_dict)
        return safe_donors
    finally:
        session.close()

def add_request(req_data: dict) -> dict:
    session = SessionLocal()
    try:
        req_id = req_data.get("id") or f"REQ-{uuid.uuid4().hex[:6].upper()}"
        routing_json = json.dumps(req_data.get("routingDetails", []))
        donors_json = json.dumps(req_data.get("accepted_donors", []))
        
        req_model = ActiveRequestModel(
            id=req_id,
            hospital_id=req_data.get("hospital_id"),
            blood_type=req_data.get("bloodType", "O-"),
            units_needed=req_data.get("unitsNeeded", 1),
            urgency=req_data.get("urgency", "Critical"),
            lat=req_data.get("lat", 26.9124),
            lng=req_data.get("lng", 75.7873),
            matches=req_data.get("matches", 0),
            eta=req_data.get("eta", 15),
            routing_details=routing_json,
            accepted_donors=donors_json,
            status="active",
            timestamp=req_data.get("timestamp") or datetime.utcnow().isoformat()
        )
        session.add(req_model)
        session.commit()
        session.refresh(req_model)
        return req_model.to_dict()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

def get_all_active_requests() -> List[dict]:
    session = SessionLocal()
    try:
        requests = session.query(ActiveRequestModel).filter(ActiveRequestModel.status == "active") \
            .order_by(ActiveRequestModel.timestamp.desc()).all()
        return [r.to_dict() for r in requests]
    finally:
        session.close()

def accept_request(req_id: str, donor_id: str) -> Optional[dict]:
    session = SessionLocal()
    try:
        req = session.query(ActiveRequestModel).filter(ActiveRequestModel.id == req_id).first()
        if not req:
            return None
        
        donors = json.loads(req.accepted_donors) if req.accepted_donors else []
        if donor_id not in donors:
            donors.append(donor_id)
            req.accepted_donors = json.dumps(donors)
            req.matches = (req.matches or 0) + 1
            session.commit()
            session.refresh(req)
        return req.to_dict()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

def close_request(req_id: str, donor_id: Optional[str] = None) -> Optional[dict]:
    session = SessionLocal()
    try:
        req = session.query(ActiveRequestModel).filter(ActiveRequestModel.id == req_id).first()
        if not req:
            return None
        
        req.status = "closed"
        
        # Credit points & lives to donor if specified
        if donor_id:
            user = session.query(UserModel).filter(UserModel.id == donor_id).first()
            if user:
                units = req.units_needed or 1
                user.points += units * 50
                user.lives_saved += units * 3
                badges = json.loads(user.badges) if user.badges else []
                if user.points >= 500 and "First Blood" not in badges:
                    badges.append("First Blood")
                if user.points >= 2000 and "Silver Saver" not in badges:
                    badges.append("Silver Saver")
                user.badges = json.dumps(badges)

        session.commit()
        session.refresh(req)
        return req.to_dict()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

def add_warning(warning_data: dict) -> dict:
    session = SessionLocal()
    try:
        w_id = warning_data.get("id") or f"WARN-{uuid.uuid4().hex[:6].upper()}"
        model = WarningModel(
            id=w_id,
            region_id=warning_data.get("region_id", "Unknown"),
            blood_type=warning_data.get("bloodType", "Any"),
            message=warning_data.get("message", ""),
            severity=warning_data.get("severity", "High"),
            timestamp=warning_data.get("timestamp") or datetime.utcnow().isoformat()
        )
        session.add(model)
        session.commit()
        session.refresh(model)
        return model.to_dict()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

def get_warnings() -> List[dict]:
    session = SessionLocal()
    try:
        warns = session.query(WarningModel).order_by(WarningModel.timestamp.desc()).all()
        return [w.to_dict() for w in warns]
    finally:
        session.close()

def add_proactive_donation(donation_data: dict) -> dict:
    session = SessionLocal()
    try:
        d_id = donation_data.get("id") or f"PRO-{uuid.uuid4().hex[:6].upper()}"
        model = ProactiveDonationModel(
            id=d_id,
            donor_id=donation_data.get("donor_id", ""),
            hospital_id=donation_data.get("hospital_id", ""),
            hospital_name=donation_data.get("hospital_name", ""),
            blood_type=donation_data.get("bloodType", "O+"),
            status=donation_data.get("status", "Scheduled"),
            timestamp=donation_data.get("timestamp") or datetime.utcnow().isoformat()
        )
        session.add(model)
        session.commit()
        session.refresh(model)
        return model.to_dict()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

def get_proactive_donations() -> List[dict]:
    session = SessionLocal()
    try:
        pro = session.query(ProactiveDonationModel).order_by(ProactiveDonationModel.timestamp.desc()).all()
        result = []
        for p in pro:
            d = p.to_dict()
            user = session.query(UserModel).filter(
                (UserModel.id == p.donor_id) | (UserModel.email == p.donor_id)
            ).first()
            if user:
                d["donor_name"] = user.name
                d["donor_email"] = user.email
                if not d.get("bloodType") or d.get("bloodType") == "N/A":
                    d["bloodType"] = user.blood_type or "O+"
            else:
                d["donor_name"] = "Registered Donor"
                d["donor_email"] = "donor@lifeline.com"
            result.append(d)
        return result
    finally:
        session.close()

def complete_proactive_donation(donation_id: str) -> dict:
    session = SessionLocal()
    try:
        donation = session.query(ProactiveDonationModel).filter(ProactiveDonationModel.id == donation_id).first()
        if not donation:
            return {"error": f"Donation ticket {donation_id} not found."}

        if donation.status == "Completed":
            return {"message": "Donation already completed and verified.", "donation": donation.to_dict()}

        donation.status = "Completed"
        b_type = donation.blood_type or "O+"

        # 1. Update Blood Bank inventory (+1 unit)
        bank = None
        if donation.hospital_id:
            bank = session.query(BloodBankModel).filter(BloodBankModel.id == donation.hospital_id).first()
        if not bank and donation.hospital_name:
            bank = session.query(BloodBankModel).filter(BloodBankModel.name == donation.hospital_name).first()

        if bank:
            try:
                inv = json.loads(bank.inventory) if bank.inventory else {}
            except Exception:
                inv = {}
            current_units = int(inv.get(b_type, 0))
            inv[b_type] = current_units + 1
            bank.inventory = json.dumps(inv)
            bank.available_units = int(bank.available_units or 0) + 1

        # 2. Reward donor with points & life saved
        donor_user = session.query(UserModel).filter(
            (UserModel.id == donation.donor_id) | (UserModel.email == donation.donor_id)
        ).first()
        donor_email = None
        donor_name = "Valued Donor"
        if donor_user:
            donor_user.points = (donor_user.points or 0) + 50
            donor_user.lives_saved = (donor_user.lives_saved or 0) + 1
            badges = json.loads(donor_user.badges) if donor_user.badges else []
            if donor_user.points >= 50 and "First Donation" not in badges:
                badges.append("First Donation")
            if donor_user.points >= 200 and "Silver Saver" not in badges:
                badges.append("Silver Saver")
            donor_user.badges = json.dumps(badges)
            donor_email = donor_user.email
            donor_name = donor_user.name

        session.commit()
        session.refresh(donation)

        # 3. Trigger completion email
        if donor_email:
            try:
                from app.services.email_service import send_donation_completed_email
                send_donation_completed_email(
                    to_email=donor_email,
                    donor_name=donor_name,
                    facility_name=donation.hospital_name or "Authorized Blood Center",
                    blood_type=b_type,
                    points_awarded=50
                )
            except Exception as e:
                logger.error(f"Failed to dispatch donation completion email: {e}")

        res = donation.to_dict()
        res["donor_name"] = donor_name
        res["donor_email"] = donor_email
        res["blood_bank_units"] = bank.available_units if bank else None

        return {
            "message": "Donation verified! +1 unit added to blood bank inventory, +50 points awarded to donor.",
            "donation": res
        }
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_all_blood_banks() -> List[dict]:
    session = SessionLocal()
    try:
        banks = session.query(BloodBankModel).all()
        return [b.to_dict() for b in banks]
    finally:
        session.close()

def add_blood_bank(data: dict) -> dict:
    session = SessionLocal()
    try:
        bank_id = data.get("id") or f"BB-{uuid.uuid4().hex[:6].upper()}"
        inventory = data.get("inventory", {})
        inventory_json = json.dumps(inventory) if isinstance(inventory, dict) else str(inventory)
        total_units = sum(int(v) for v in inventory.values()) if isinstance(inventory, dict) else int(data.get("available_units", 0))

        bank = BloodBankModel(
            id=bank_id,
            name=data["name"],
            address=data.get("address", ""),
            contact=data.get("contact", ""),
            lat=float(data.get("lat", 26.9124)),
            lng=float(data.get("lng", 75.7873)),
            available_units=total_units,
            inventory=inventory_json
        )
        session.add(bank)
        session.commit()
        session.refresh(bank)
        return bank.to_dict()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

def delete_blood_bank(bank_id: str) -> bool:
    session = SessionLocal()
    try:
        bank = session.query(BloodBankModel).filter(BloodBankModel.id == bank_id).first()
        if not bank:
            return False
        session.delete(bank)
        session.commit()
        return True
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

def get_hospital_storage(hospital_id: str) -> List[dict]:
    session = SessionLocal()
    try:
        batches = session.query(HospitalStorageBatchModel)\
            .filter(HospitalStorageBatchModel.hospital_id == hospital_id)\
            .order_by(HospitalStorageBatchModel.expiry_days.asc())\
            .all()
        return [b.to_dict() for b in batches]
    finally:
        session.close()

def add_hospital_storage_batch(data: dict) -> dict:
    session = SessionLocal()
    try:
        batch_id = data.get("id") or f"BATCH-{uuid.uuid4().hex[:6].upper()}"
        batch = HospitalStorageBatchModel(
            id=batch_id,
            hospital_id=data["hospital_id"],
            batch_number=data.get("batch_number") or f"#{uuid.uuid4().hex[:4].upper()}",
            blood_type=data.get("blood_type", "O+"),
            units=int(data.get("units", 1)),
            expiry_days=int(data.get("expiry_days", 35)),
            priority=data.get("priority", "Stable")
        )
        session.add(batch)
        session.commit()
        session.refresh(batch)
        return batch.to_dict()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

def delete_hospital_storage_batch(batch_id: str, hospital_id: Optional[str] = None) -> bool:
    session = SessionLocal()
    try:
        query = session.query(HospitalStorageBatchModel).filter(HospitalStorageBatchModel.id == batch_id)
        if hospital_id:
            query = query.filter(HospitalStorageBatchModel.hospital_id == hospital_id)
        batch = query.first()
        if not batch:
            return False
        session.delete(batch)
        session.commit()
        return True
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

def request_blood_from_bank(bank_id: str, hospital_id: str, blood_type: str, units: int) -> dict:
    session = SessionLocal()
    try:
        bank = session.query(BloodBankModel).filter(BloodBankModel.id == bank_id).first()
        if not bank:
            raise ValueError("Blood Bank not found")

        try:
            inv = json.loads(bank.inventory) if bank.inventory else {}
        except Exception:
            inv = {}

        current_units = inv.get(blood_type, 0)
        if current_units < units:
            raise ValueError(f"Insufficient units for blood type {blood_type}. Available: {current_units}, Requested: {units}")

        # Deduct requested units from bank inventory
        inv[blood_type] = current_units - units
        bank.inventory = json.dumps(inv)
        bank.available_units = sum(inv.values())

        # Transfer batch directly to hospital storage
        batch_id = f"BBTR-{uuid.uuid4().hex[:6].upper()}"
        batch = HospitalStorageBatchModel(
            id=batch_id,
            hospital_id=hospital_id,
            batch_number=f"TR-{bank.name[:3].upper()}-{uuid.uuid4().hex[:4].upper()}",
            blood_type=blood_type,
            units=units,
            expiry_days=42, # 42-day standard shelf life for refrigerated whole blood
            priority="Stable"
        )
        session.add(batch)
        session.commit()
        session.refresh(bank)
        session.refresh(batch)

        return {
            "message": f"Successfully transferred {units} units of {blood_type} from {bank.name}",
            "bank": bank.to_dict(),
            "batch": batch.to_dict()
        }
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

def get_system_stats() -> dict:
    session = SessionLocal()
    try:
        donor_count = session.query(UserModel).filter(UserModel.role == "donor").count()
        hospital_count = session.query(UserModel).filter(UserModel.role == "hospital").count()
        banks = session.query(BloodBankModel).all()
        total_blood_bank_units = sum(b.available_units or 0 for b in banks)
        storage_batches = session.query(HospitalStorageBatchModel).all()
        total_hospital_storage_units = sum(b.units or 0 for b in storage_batches)
        active_requests_count = session.query(ActiveRequestModel).filter(ActiveRequestModel.status == "active").count()

        return {
            "active_donors": donor_count,
            "active_hospitals": hospital_count,
            "total_blood_banks": len(banks),
            "total_blood_reserve": total_blood_bank_units + total_hospital_storage_units,
            "blood_bank_units": total_blood_bank_units,
            "hospital_storage_units": total_hospital_storage_units,
            "active_dispatches": active_requests_count
        }
    finally:
        session.close()

def create_password_reset_code(email: str) -> str:
    session = SessionLocal()
    try:
        # Mark previous unused tokens for this email as used
        session.query(PasswordResetTokenModel).filter(
            PasswordResetTokenModel.email == email,
            PasswordResetTokenModel.used == False
        ).update({"used": True})

        # Generate 6-digit numeric verification code
        code = f"{random.randint(100000, 999999)}"
        token_id = f"PR-{uuid.uuid4().hex[:8].upper()}"
        expires_at = datetime.utcnow() + timedelta(minutes=15)

        reset_token = PasswordResetTokenModel(
            id=token_id,
            email=email,
            code=code,
            expires_at=expires_at,
            used=False
        )
        session.add(reset_token)
        session.commit()
        return code
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

def verify_and_use_password_reset_code(email: str, code: str, new_password: str) -> bool:
    session = SessionLocal()
    try:
        token = session.query(PasswordResetTokenModel).filter(
            PasswordResetTokenModel.email == email,
            PasswordResetTokenModel.code == code.strip(),
            PasswordResetTokenModel.used == False,
            PasswordResetTokenModel.expires_at >= datetime.utcnow()
        ).first()

        if not token:
            return False

        # Find user and update password
        user = session.query(UserModel).filter(UserModel.email == email).first()
        if not user:
            return False

        user.password = new_password
        token.used = True
        session.commit()
        return True
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

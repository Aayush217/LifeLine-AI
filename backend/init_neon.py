"""
LifeLine AI - Neon Cloud Database Initializer & Migration Tool.
Connects to Neon PostgreSQL, creates all 8 schema tables, and seeds initial data.
"""
import os
import sys
import json
import logging
from dotenv import load_dotenv

# Load .env
load_dotenv()

from sqlalchemy import create_engine, inspect, text
from app.database import Base, seed_defaults, UserModel, BloodBankModel

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("lifeline.neon")

def init_neon_database(database_url: str = None):
    url = database_url or os.getenv("DATABASE_URL")
    if not url:
        print("\n[ERROR] No DATABASE_URL found. Please paste your Neon connection string in backend/.env or pass it as an argument.\n")
        return False

    # Standardize connection string for SQLAlchemy
    raw_url = url.strip()
    if raw_url.startswith("postgres://"):
        raw_url = raw_url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif raw_url.startswith("postgresql://") and not raw_url.startswith("postgresql+psycopg2://"):
        raw_url = raw_url.replace("postgresql://", "postgresql+psycopg2://", 1)

    host_masked = raw_url.split("@")[-1] if "@" in raw_url else "database"
    print(f"\n Connecting to database at: {host_masked} ...")

    try:
        engine = create_engine(raw_url, pool_pre_ping=True)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print(" Connected successfully to PostgreSQL!")

        print("\n Creating all LifeLine AI schema tables in Neon...")
        Base.metadata.create_all(bind=engine)

        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        print(f" Created {len(existing_tables)} tables in public schema:")
        for tbl in sorted(existing_tables):
            print(f"    - {tbl}")

        print("\n Seeding initial admin and blood bank facilities...")
        from sqlalchemy.orm import sessionmaker
        Session = sessionmaker(bind=engine)
        session = Session()

        from app.database import seed_defaults_with_session
        # Ensure initial seed
        from app.database import UserModel, BloodBankModel, SystemMetaModel
        
        # Check Admin
        admin = session.query(UserModel).filter(UserModel.email == "admin@lifeline.com").first()
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
            print("    Created default admin: admin@lifeline.com / admin")

        # Check default blood banks
        bb_count = session.query(BloodBankModel).count()
        if bb_count == 0:
            sample_banks = [
                BloodBankModel(
                    id="BB-SMS",
                    name="SMS Hospital Blood Bank & Transfusion Center",
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
            print("    Created 4 initial authorized Regional Blood Banks in Jaipur.")

        session.commit()
        session.close()

        print("\n[SUCCESS] Neon Cloud Database is fully initialized!")
        print("Refresh your Neon browser console tab to view the tables live.\n")
        return True
    except Exception as e:
        print(f"\n[ERROR] Failed to initialize Neon database: {e}\n")
        return False

if __name__ == "__main__":
    neon_url = sys.argv[1] if len(sys.argv) > 1 else None
    init_neon_database(neon_url)


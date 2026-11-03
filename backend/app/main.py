from fastapi import FastAPI, HTTPException, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict
from .services import ml_prediction, matcher
from .services.email_service import (
    send_welcome_email,
    send_password_reset_email,
    send_password_changed_confirmation_email,
    send_appointment_confirmation_email,
    send_donation_completed_email
)
from .database import (
    get_user_by_email, 
    get_user_by_id,
    add_user, 
    get_leaderboard, 
    add_request, 
    close_request,
    get_all_active_requests,
    accept_request,
    add_warning,
    get_warnings,
    add_proactive_donation,
    get_proactive_donations,
    complete_proactive_donation,
    get_all_blood_banks,
    add_blood_bank,
    delete_blood_bank,
    get_hospital_storage,
    add_hospital_storage_batch,
    delete_hospital_storage_batch,
    request_blood_from_bank,
    get_system_stats,
    create_password_reset_code,
    verify_and_use_password_reset_code
)

app = FastAPI(title="LifeLine AI Backend", version="1.0.0")

# Configure CORS so the Next.js frontend can connect
# Allows both local dev (localhost:3000) and any Vercel production domain
ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://lifelineai-one.vercel.app",   # actual Vercel deployment URL
    "https://lifeline-ai.vercel.app",      # legacy URL (keep for safety)
    "https://*.vercel.app",                # allow all Vercel preview deployments
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",  # matches all vercel preview URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "LifeLine AI Hub is running"}

@app.get("/api/stats")
def get_stats_route():
    return get_system_stats()

@app.get("/api/predictions")
def get_predictions():
    """
    Returns the AI predictions for the frontend map.
    This routes to the ML microservice which runs SVM/XGBoost logic.
    """
    return ml_prediction.get_shortage_forecasts()

@app.post("/api/match")
def trigger_match(request_payload: dict):
    """
    Takes a Hospital Request (Blood Type, Location) and returns
    the maximum match from available donors within a 20km radius 
    using the Hopcroft-Karp algorithm.
    """
    return matcher.run_hopcroft_karp(request_payload)

# --- AUTHENTICATION ENDPOINTS ---

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str # 'donor' or 'hospital'
    bloodType: str = "Unknown"
    lat: float = 26.9124 # Default to Jaipur Center
    lng: float = 75.7873 # Default to Jaipur Center

@app.post("/api/auth/login")
def login(req: LoginRequest):
    user = get_user_by_email(req.email)
    if not user or user.get("password") != req.password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    
    # Return user safe object
    safe_user = {k: v for k, v in user.items() if k != "password"}
    return {"message": "Login successful", "user": safe_user}

@app.post("/api/auth/register")
def register(req: RegisterRequest, background_tasks: BackgroundTasks):
    if get_user_by_email(req.email):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
        
    new_user = {
        "name": req.name,
        "email": req.email,
        "password": req.password,
        "role": req.role,
        "bloodType": req.bloodType,
        "location": {"lat": req.lat, "lng": req.lng},
        "points": 0,
        "livesSaved": 0,
        "badges": []
    }
    
    user = add_user(new_user)
    safe_user = {k: v for k, v in user.items() if k != "password"}

    # Dispatch welcome activation email asynchronously
    background_tasks.add_task(
        send_welcome_email,
        to_email=user["email"],
        user_name=user["name"],
        role=user["role"],
        blood_type=user.get("bloodType", "N/A")
    )

    return {"message": "Registration successful", "user": safe_user}

class ForgotPasswordRequest(BaseModel):
    email: str

@app.post("/api/auth/forgot-password")
def forgot_password(req: ForgotPasswordRequest, background_tasks: BackgroundTasks):
    user = get_user_by_email(req.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account registered with this email address."
        )

    code = create_password_reset_code(req.email)

    # Dispatch reset code email asynchronously
    background_tasks.add_task(
        send_password_reset_email,
        to_email=user["email"],
        user_name=user.get("name", "User"),
        reset_code=code
    )

    return {
        "message": f"Verification code sent to {req.email}.",
        "email": req.email
    }

class ResetPasswordRequest(BaseModel):
    email: str
    code: str
    newPassword: str

@app.post("/api/auth/reset-password")
def reset_password(req: ResetPasswordRequest, background_tasks: BackgroundTasks):
    if len(req.newPassword) < 4:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 4 characters long.")

    success = verify_and_use_password_reset_code(req.email, req.code, req.newPassword)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code. Please request a new code."
        )

    user = get_user_by_email(req.email)
    if user:
        # Dispatch confirmation email asynchronously
        background_tasks.add_task(
            send_password_changed_confirmation_email,
            to_email=user["email"],
            user_name=user.get("name", "User")
        )

    return {"message": "Password successfully updated! You can now sign in."}

class GoogleAuthRequest(BaseModel):
    email: str
    name: str
    role: Optional[str] = "donor"
    bloodType: Optional[str] = "O+"
    lat: Optional[float] = 26.9124
    lng: Optional[float] = 75.7873

@app.post("/api/auth/google")
def google_auth(req: GoogleAuthRequest, background_tasks: BackgroundTasks):
    existing = get_user_by_email(req.email)
    if existing:
        safe_user = {k: v for k, v in existing.items() if k != "password"}
        return {"message": "Google Login successful", "user": safe_user}

    # Automatically register new Google user
    new_user = {
        "name": req.name,
        "email": req.email,
        "password": f"g_oauth_{uuid.uuid4().hex[:12]}",
        "role": req.role or "donor",
        "bloodType": req.bloodType or "O+",
        "location": {"lat": req.lat or 26.9124, "lng": req.lng or 75.7873},
        "points": 50, # Initial welcome bonus
        "livesSaved": 0,
        "badges": ["Google Verified"]
    }

    user = add_user(new_user)
    safe_user = {k: v for k, v in user.items() if k != "password"}

    # Dispatch welcome email asynchronously
    background_tasks.add_task(
        send_welcome_email,
        to_email=user["email"],
        user_name=user["name"],
        role=user["role"],
        blood_type=user.get("bloodType", "N/A")
    )

    return {"message": "Google Registration successful", "user": safe_user}

# --- GLOBAL STATE ENDPOINTS ---

@app.get("/api/leaderboard")
def get_leaderboard_route():
    return get_leaderboard()

@app.get("/api/requests/active")
def get_active_requests():
    return get_all_active_requests()

class CloseRequestModel(BaseModel):
    donor_id: Optional[str] = None

@app.post("/api/requests/{request_id}/close")
def close_request_route(request_id: str, payload: CloseRequestModel):
    closed_req = close_request(request_id, payload.donor_id)
    if not closed_req:
        raise HTTPException(status_code=404, detail="Request not found or already closed")
    
    # Persist the received batch into the hospital's cold chain storage in the database
    if closed_req.get("hospital_id"):
        try:
            add_hospital_storage_batch({
                "hospital_id": closed_req["hospital_id"],
                "batch_number": f"DISP-{closed_req['id'][-4:]}",
                "blood_type": closed_req.get("bloodType", "O-"),
                "units": closed_req.get("unitsNeeded", 1),
                "expiry_days": 42,
                "priority": "Stable"
            })
        except Exception:
            pass

    return {"message": "Request closed successfully", "closed_request": closed_req}

class AcceptRequestModel(BaseModel):
    donor_id: str

@app.post("/api/requests/{request_id}/accept")
def accept_request_route(request_id: str, payload: AcceptRequestModel):
    accepted_req = accept_request(request_id, payload.donor_id)
    if not accepted_req:
        raise HTTPException(status_code=404, detail="Request not found or already closed by hospital")
    return {"message": "Accepted Match", "request": accepted_req}

@app.post("/api/requests")
def broadcast_request(req: dict):
    # Run the real bipartite matching against registered donors
    match_result = matcher.run_hopcroft_karp({
        "lat": req.get("lat"),
        "lng": req.get("lng"),
        "bloodType": req.get("bloodType")
    })
    
    # Register the request into the global active db
    new_req = add_request({
        "hospital_id": req.get("hospital_id"),
        "bloodType": req.get("bloodType"),
        "unitsNeeded": req.get("unitsNeeded", 1),
        "urgency": req.get("urgency", "Critical"),
        "lat": req.get("lat", 26.9124),
        "lng": req.get("lng", 75.7873),
        "matches": match_result.get("matches_found", 0),
        "eta": match_result.get("closest_match_time_mins", 0),
        "routingDetails": match_result.get("matched_donors_routing", [])
    })
    
    return {
        "message": match_result.get("message"),
        "matches_found": match_result.get("matches_found", 0),
        "closest_match_time_mins": match_result.get("closest_match_time_mins", 0),
        "matched_donors_routing": match_result.get("matched_donors_routing", []),
        "request_ticket": new_req
    }

# --- ADMIN WARNING ENDPOINTS ---

@app.get("/api/warnings")
def get_warnings_route():
    return get_warnings()

class WarningRequest(BaseModel):
    region_id: str
    bloodType: str
    message: str
    severity: str = "High"

@app.post("/api/warnings")
def create_warning(req: WarningRequest):
    return add_warning({
        "region_id": req.region_id,
        "bloodType": req.bloodType,
        "message": req.message,
        "severity": req.severity
    })

# --- PROACTIVE DONATIONS ENDPOINTS ---

class ProactiveDonationRequest(BaseModel):
    donor_id: str
    hospital_id: str
    hospital_name: str
    bloodType: str
    donor_name: Optional[str] = None
    donor_email: Optional[str] = None

@app.post("/api/donations/proactive")
def create_proactive_donation(req: ProactiveDonationRequest, background_tasks: BackgroundTasks):
    donation = add_proactive_donation({
        "donor_id": req.donor_id,
        "hospital_id": req.hospital_id,
        "hospital_name": req.hospital_name,
        "bloodType": req.bloodType,
        "status": "Scheduled"
    })

    # Find donor details to send appointment confirmation email
    donor = get_user_by_id(req.donor_id) or get_user_by_email(req.donor_id)
    donor_email = req.donor_email or (donor.get("email") if donor else None)
    donor_name = req.donor_name or (donor.get("name") if donor else "Valued Donor")

    if donor_email:
        background_tasks.add_task(
            send_appointment_confirmation_email,
            donor_email,
            donor_name,
            req.hospital_name,
            req.bloodType,
            donation["id"]
        )
    return donation

@app.get("/api/donations/proactive")
def get_proactive_donations_route():
    return get_proactive_donations()

@app.post("/api/donations/proactive/{donation_id}/complete")
def complete_proactive_donation_route(donation_id: str):
    res = complete_proactive_donation(donation_id)
    if "error" in res:
        raise HTTPException(status_code=404, detail=res["error"])
    return res

# --- BLOOD BANKS ENDPOINTS ---

@app.get("/api/bloodbanks")
def get_blood_banks_route():
    return get_all_blood_banks()

class CreateBloodBankRequest(BaseModel):
    name: str
    address: str
    contact: str
    lat: float = 26.9124
    lng: float = 75.7873
    inventory: Dict[str, int]

@app.post("/api/bloodbanks")
def create_blood_bank_route(req: CreateBloodBankRequest):
    new_bank = add_blood_bank({
        "name": req.name,
        "address": req.address,
        "contact": req.contact,
        "lat": req.lat,
        "lng": req.lng,
        "inventory": req.inventory
    })
    return {"message": "Blood bank added successfully", "bank": new_bank}

@app.delete("/api/bloodbanks/{bank_id}")
def delete_blood_bank_route(bank_id: str):
    success = delete_blood_bank(bank_id)
    if not success:
        raise HTTPException(status_code=404, detail="Blood bank not found")
    return {"message": "Blood bank removed successfully"}

class RequestBloodBankTransfer(BaseModel):
    hospital_id: str
    hospital_name: str
    bloodType: str
    units: int

@app.post("/api/bloodbanks/{bank_id}/request")
def request_blood_from_bank_route(bank_id: str, req: RequestBloodBankTransfer):
    try:
        result = request_blood_from_bank(
            bank_id=bank_id,
            hospital_id=req.hospital_id,
            blood_type=req.bloodType,
            units=req.units
        )
        return result
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to process stock transfer")

# --- HOSPITAL STORAGE ENDPOINTS ---

@app.get("/api/hospital/storage")
def get_hospital_storage_route(hospital_id: str):
    return get_hospital_storage(hospital_id)

class AddHospitalBatchRequest(BaseModel):
    hospital_id: str
    batch_number: str
    blood_type: str
    units: int = 1
    expiry_days: int = 35
    priority: str = "Stable"

@app.post("/api/hospital/storage")
def add_hospital_storage_batch_route(req: AddHospitalBatchRequest):
    batch = add_hospital_storage_batch({
        "hospital_id": req.hospital_id,
        "batch_number": req.batch_number,
        "blood_type": req.blood_type,
        "units": req.units,
        "expiry_days": req.expiry_days,
        "priority": req.priority
    })
    return {"message": "Batch added to storage", "batch": batch}

@app.delete("/api/hospital/storage/{batch_id}")
def delete_hospital_storage_batch_route(batch_id: str, hospital_id: Optional[str] = None):
    success = delete_hospital_storage_batch(batch_id, hospital_id)
    if not success:
        raise HTTPException(status_code=404, detail="Batch not found")
    return {"message": "Batch removed from cold chain storage"}

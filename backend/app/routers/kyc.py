import logging
import os
import re
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Request
from pydantic import BaseModel
from supabase import create_client

from ..services.activity_service import seed_partner_baseline
from ..services.fraud_layer1 import haversine_km, run_layer1
from ..services.fraud_layer3 import check_adverse_selection_forecast
from ..services.otp_service import OTP_EXPIRY_MINUTES, generate_otp, send_otp_sms
from ..services.ring_detection import detect_ring_membership
from ..trigger_config import ZONE_DISTANCE_THRESHOLD_KM

router = APIRouter()
logger = logging.getLogger(__name__)
_otp_store: dict[str, dict] = {}


def get_supabase():
    return create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_SERVICE_KEY"),
    )


class OTPRequest(BaseModel):
    mobile_number: str


class OTPVerify(BaseModel):
    mobile_number: str
    otp: str


@router.post("/send-otp")
async def send_otp(req: OTPRequest):
    """
    Generate and send real OTP via Fast2SMS.
    Stores OTP with expiry in memory for verification.
    """
    mobile_clean = req.mobile_number.replace("+91", "").replace(" ", "").strip()

    if not re.match(r"^\d{10}$", mobile_clean):
        return {"success": False, "error": "Invalid mobile number"}

    otp = generate_otp()
    expiry = datetime.now(tz=timezone.utc) + timedelta(minutes=OTP_EXPIRY_MINUTES)
    success = await send_otp_sms(mobile_clean, otp)

    _otp_store[mobile_clean] = {
        "otp": otp,
        "expiry": expiry,
        "attempts": 0,
    }

    if success:
        return {
            "success": True,
            "message": f"OTP sent to {mobile_clean[-4:].zfill(10)}",
            "expires_in_minutes": OTP_EXPIRY_MINUTES,
        }

    return {
        "success": False,
        "message": "SMS delivery failed. Please try again.",
        "error": "SMS delivery failed. Please try again.",
    }


@router.post("/verify-otp")
async def verify_otp(req: OTPVerify):
    """
    Verify OTP entered by partner.
    Max 3 attempts before invalidation.
    OTP expires after OTP_EXPIRY_MINUTES.
    """
    mobile_clean = req.mobile_number.replace("+91", "").replace(" ", "").strip()
    stored = _otp_store.get(mobile_clean)

    if not stored:
        return {
            "success": False,
            "verified": False,
            "message": "No OTP found. Please request a new one.",
            "error": "No OTP found. Please request a new one.",
        }

    if datetime.now(tz=timezone.utc) > stored["expiry"]:
        del _otp_store[mobile_clean]
        return {
            "success": False,
            "verified": False,
            "message": "OTP expired. Please request a new one.",
            "error": "OTP expired. Please request a new one.",
        }

    stored["attempts"] += 1
    if stored["attempts"] > 3:
        del _otp_store[mobile_clean]
        return {
            "success": False,
            "verified": False,
            "message": "Too many attempts. Please request a new OTP.",
            "error": "Too many attempts. Please request a new OTP.",
        }

    if stored["otp"] == req.otp.strip():
        del _otp_store[mobile_clean]
        return {
            "success": True,
            "verified": True,
            "message": "OTP verified successfully.",
        }

    remaining = 3 - stored["attempts"]
    message = f"Invalid OTP. {remaining} attempt(s) remaining."
    return {
        "success": False,
        "verified": False,
        "message": message,
        "error": message,
    }


class PANRequest(BaseModel):
    pan_number: str
    name: str


@router.post("/verify-pan")
async def verify_pan(req: PANRequest):
    pan = req.pan_number.upper().strip()
    if not re.match(r"^[A-Z]{5}[0-9]{4}[A-Z]{1}$", pan):
        return {"success": False, "error": "Invalid PAN format", "code": "PAN_INVALID"}

    supabase = get_supabase()
    result = (
        supabase.table("mock_kyc_records")
        .select("*")
        .eq("document_type", "pan")
        .eq("document_number", pan)
        .execute()
    )

    if not result.data:
        return {"success": False, "error": "PAN not found", "code": "PAN_NOT_FOUND"}

    record = result.data[0]
    if not record["is_valid"]:
        return {
            "success": False,
            "error": "PAN is invalid or deactivated",
            "code": "PAN_DEACTIVATED",
        }

    record_first = record["holder_name"].split()[0].upper()
    input_first = req.name.strip().split()[0].upper() if req.name.strip() else ""
    name_match = record_first == input_first
    masked = f"{pan[:2]}XXX{pan[5:9]}X"

    return {
        "success": True,
        "name_match": name_match,
        "holder_name": record["holder_name"],
        "pan_masked": masked,
        "code": "NAME_MISMATCH" if not name_match else "VERIFIED",
    }


class DLRequest(BaseModel):
    dl_number: str
    dob: str


@router.post("/verify-dl")
async def verify_dl(req: DLRequest):
    dl = req.dl_number.upper().replace(" ", "").replace("-", "")
    supabase = get_supabase()
    result = (
        supabase.table("mock_kyc_records")
        .select("*")
        .eq("document_type", "dl")
        .eq("document_number", dl)
        .execute()
    )

    if not result.data:
        return {
            "success": False,
            "error": "Driving licence not found",
            "code": "DL_NOT_FOUND",
        }

    record = result.data[0]
    if not record["is_valid"]:
        return {
            "success": False,
            "error": "Driving licence is invalid",
            "code": "DL_INVALID",
        }

    if record["expiry_date"]:
        expiry = date.fromisoformat(record["expiry_date"])
        if expiry < date.today():
            return {
                "success": False,
                "error": "Driving licence has expired",
                "code": "DL_EXPIRED",
            }

    masked = dl[:4] + "X" * (len(dl) - 8) + dl[-4:]
    return {
        "success": True,
        "holder_name": record["holder_name"],
        "expiry_date": record["expiry_date"],
        "dl_masked": masked,
        "code": "VERIFIED",
    }


class RCRequest(BaseModel):
    rc_number: str


@router.post("/verify-rc")
async def verify_rc(req: RCRequest):
    rc = req.rc_number.upper().replace(" ", "")
    supabase = get_supabase()
    result = (
        supabase.table("mock_kyc_records")
        .select("*")
        .eq("document_type", "rc")
        .eq("document_number", rc)
        .execute()
    )

    if not result.data:
        return {
            "success": False,
            "error": "Vehicle not found in Vahan registry",
            "code": "VEHICLE_NOT_FOUND",
        }

    record = result.data[0]
    if not record["is_valid"]:
        return {
            "success": False,
            "error": "Vehicle registration is invalid",
            "code": "RC_INVALID",
        }

    return {
        "success": True,
        "holder_name": record["holder_name"],
        "registered_city": record.get("registered_city"),
        "expiry_date": record["expiry_date"],
        "code": "VERIFIED",
    }


class GPSPayload(BaseModel):
    lat: float
    lng: float


@router.post("/partners/{partner_id}/seed-baseline")
async def seed_baseline(
    partner_id: str,
    request: Request,
    avg_daily_orders: int = 20,
    avg_daily_hours: float = 8.0,
    city: str = "",
    zone: str = "",
):
    supabase = get_supabase()
    seed_partner_baseline(partner_id, avg_daily_orders, avg_daily_hours, supabase)

    if not city or not zone:
        partner_result = (
            supabase.table("partners")
            .select("city, operating_zone")
            .eq("id", partner_id)
            .limit(1)
            .execute()
        )
        if partner_result.data:
            city = city or partner_result.data[0].get("city", "")
            zone = zone or partner_result.data[0].get("operating_zone", "")

    if city and zone:
        registration_ip = request.client.host if request.client else ""
        await run_layer1(partner_id, city, zone, registration_ip, supabase)

    ring_result = await detect_ring_membership(partner_id, supabase)

    (
        supabase.table("partners")
        .update({
            "ring_flag": ring_result["ring_flag"],
            "ring_cluster_id": ring_result["ring_cluster_id"],
            "ring_edge_types": ring_result["ring_edge_types"],
        })
        .eq("id", partner_id)
        .execute()
    )

    return {"success": True}


@router.get("/adverse-selection-check")
async def adverse_selection_check(city: str):
    """
    Called at onboarding completion and at Change Plan.
    Returns blocked=True if OWM 5-day forecast breach probability
    exceeds ADVERSE_SELECTION_FORECAST_THRESHOLD for any trigger type.
    """
    result = await check_adverse_selection_forecast(city)
    return result


@router.post("/partners/{partner_id}/enrollment-gps")
async def store_enrollment_gps(partner_id: str, payload: GPSPayload):
    """
    Store GPS coordinates captured at enrollment completion.
    Compare against partner's declared zone centroid.
    Flag if distance exceeds ZONE_DISTANCE_THRESHOLD_KM.

    Fails open - GPS mismatch does not block registration.
    Result stored on partners table for fraud scoring.
    """
    supabase = get_supabase()

    try:
        result = (
            supabase.table("partners")
            .select("zone_lat, zone_lng, city")
            .eq("id", partner_id)
            .single()
            .execute()
        )

        if not result.data:
            return {"success": False, "error": "Partner not found"}

        partner = result.data
        zone_lat = partner.get("zone_lat")
        zone_lng = partner.get("zone_lng")

        gps_flag = False
        if zone_lat is not None and zone_lng is not None:
            distance_km = haversine_km(
                payload.lat,
                payload.lng,
                float(zone_lat),
                float(zone_lng),
            )
            gps_flag = distance_km > ZONE_DISTANCE_THRESHOLD_KM

            if gps_flag:
                logger.warning(
                    f"[EnrollmentGPS] Partner {partner_id}: "
                    f"GPS ({payload.lat},{payload.lng}) is "
                    f"{distance_km:.1f}km from zone centroid "
                    f"({zone_lat},{zone_lng}) - flag raised"
                )

        (
            supabase.table("partners")
            .update({
                "enrollment_lat": payload.lat,
                "enrollment_lng": payload.lng,
                "enrollment_gps_flag": gps_flag,
            })
            .eq("id", partner_id)
            .execute()
        )

        return {
            "success": True,
            "gps_flag": gps_flag,
            "enrollment_lat": payload.lat,
            "enrollment_lng": payload.lng,
        }

    except Exception as e:
        logger.error(f"[EnrollmentGPS] Failed for partner {partner_id}: {e}")
        return {"success": False, "error": str(e)}


@router.post("/partners/{partner_id}/last-known-location")
async def update_last_known_location(partner_id: str, payload: GPSPayload):
    """
    Update partner's last known GPS location from login event.
    Used as a real zone_match signal at claim time.
    Replaces the synthetic zone_match=1 placeholder in fraud features.
    Fails open - never blocks login.
    """
    supabase = get_supabase()

    try:
        (
            supabase.table("partners")
            .update({
                "last_known_lat": payload.lat,
                "last_known_lng": payload.lng,
                "last_known_at": datetime.utcnow().isoformat(),
            })
            .eq("id", partner_id)
            .execute()
        )

        logger.info(
            f"[LastKnownLocation] Updated partner {partner_id}: "
            f"({payload.lat},{payload.lng})"
        )
        return {"success": True}

    except Exception as e:
        logger.error(f"[LastKnownLocation] Failed for partner {partner_id}: {e}")
        return {"success": False, "error": str(e)}


IFSC_BANK_MAP = {
    "SBIN": "State Bank of India",
    "HDFC": "HDFC Bank",
    "ICIC": "ICICI Bank",
    "PUNB": "Punjab National Bank",
    "UBIN": "Union Bank of India",
    "BARB": "Bank of Baroda",
    "KKBK": "Kotak Mahindra Bank",
    "YESB": "Yes Bank",
    "IOBA": "Indian Overseas Bank",
    "CNRB": "Canara Bank",
    "IDIB": "Indian Bank",
    "FDRL": "Federal Bank",
    "UTIB": "Axis Bank",
    "ALLA": "Allahabad Bank",
    "MAHB": "Bank of Maharashtra",
}


class IFSCRequest(BaseModel):
    ifsc_code: str


@router.post("/verify-ifsc")
async def verify_ifsc(req: IFSCRequest):
    ifsc = req.ifsc_code.upper().strip()
    if not re.match(r"^[A-Z]{4}0[A-Z0-9]{6}$", ifsc):
        return {"success": False, "error": "Invalid IFSC format", "code": "IFSC_INVALID"}

    bank_prefix = ifsc[:4]
    bank_name = IFSC_BANK_MAP.get(bank_prefix, "Scheduled Commercial Bank")
    return {
        "success": True,
        "bank_name": bank_name,
        "ifsc_code": ifsc,
        "code": "VERIFIED",
    }

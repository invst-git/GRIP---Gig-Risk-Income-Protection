import os
import re
from datetime import date

from fastapi import APIRouter
from pydantic import BaseModel
from supabase import create_client

router = APIRouter()


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
    if not re.match(r"^\d{10}$", req.mobile_number):
        return {"success": False, "error": "Invalid mobile number"}
    return {"success": True, "message": "OTP sent (use 1234 in demo mode)"}


@router.post("/verify-otp")
async def verify_otp(req: OTPVerify):
    if req.otp == "1234":
        return {"success": True, "verified": True}
    return {"success": False, "verified": False, "error": "Invalid OTP"}


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

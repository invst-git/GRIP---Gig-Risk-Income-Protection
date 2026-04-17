"""
Real OTP delivery via Fast2SMS OTP route.

Falls back to console log if FAST2SMS_API_KEY not set -
allows local development without consuming SMS credits.
"""

import logging
import os
import random

import httpx

logger = logging.getLogger(__name__)

FAST2SMS_API_KEY = os.getenv("FAST2SMS_API_KEY")
FAST2SMS_URL = "https://www.fast2sms.com/dev/bulkV2"
FAST2SMS_TIMEOUT = 8.0
OTP_EXPIRY_MINUTES = 10
OTP_LENGTH = 4


def generate_otp() -> str:
    """Generate a 4-digit numeric OTP."""
    lower = 10 ** (OTP_LENGTH - 1)
    upper = (10 ** OTP_LENGTH) - 1
    return str(random.randint(lower, upper))


def _extract_fast2sms_error(data: dict) -> str:
    message = data.get("message")
    if isinstance(message, list):
        return " ".join(str(item) for item in message if item)
    if isinstance(message, str) and message.strip():
        return message
    return "SMS delivery failed. Please try again."


async def send_otp_sms(mobile: str, otp: str) -> tuple[bool, str | None]:
    """
    Send OTP via Fast2SMS OTP route to Indian mobile number.
    mobile: 10-digit number without country code (e.g. '9000000001')
    Returns (success, error_message).
    """
    if not FAST2SMS_API_KEY:
        logger.warning(
            f"[OTPService] FAST2SMS_API_KEY not set. "
            f"DEV MODE - OTP for {mobile}: {otp}"
        )
        return True, None

    try:
        async with httpx.AsyncClient(timeout=FAST2SMS_TIMEOUT) as client:
            resp = await client.post(
                FAST2SMS_URL,
                headers={
                    "authorization": FAST2SMS_API_KEY,
                },
                data={
                    "variables_values": otp,
                    "route":            "otp",
                    "numbers":          mobile,
                    "flash":            "0",
                },
            )
        data = resp.json()
        if resp.is_success and data.get("return") is True:
            logger.info(f"[OTPService] OTP sent to {mobile} via Fast2SMS")
            return True, None

        if data.get("status_code") == 996:
            logger.error(
                "[OTPService] Fast2SMS OTP API is not enabled for this account. "
                "Complete website verification in the Fast2SMS OTP Message menu."
            )
        logger.error(f"[OTPService] Fast2SMS returned error: {data}")
        return False, _extract_fast2sms_error(data)

    except Exception as e:
        logger.error(f"[OTPService] SMS send failed for {mobile}: {e}")
        return False, "SMS delivery failed. Please try again."

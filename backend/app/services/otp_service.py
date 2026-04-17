"""
Real OTP delivery via Fast2SMS Quick route.
No DLT registration required for low-volume transactional OTP.
Free tier: 50 SMS on signup at fast2sms.com

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


async def send_otp_sms(mobile: str, otp: str) -> bool:
    """
    Send OTP via Fast2SMS Quick route to Indian mobile number.
    mobile: 10-digit number without country code (e.g. '9000000001')
    Returns True if sent successfully, False otherwise.
    """
    if not FAST2SMS_API_KEY:
        logger.warning(
            f"[OTPService] FAST2SMS_API_KEY not set. "
            f"DEV MODE - OTP for {mobile}: {otp}"
        )
        return True

    message = (
        f"Your GRIP insurance OTP is {otp}. "
        f"Valid for {OTP_EXPIRY_MINUTES} minutes. Do not share."
    )

    try:
        async with httpx.AsyncClient(timeout=FAST2SMS_TIMEOUT) as client:
            resp = await client.get(
                FAST2SMS_URL,
                params={
                    "authorization": FAST2SMS_API_KEY,
                    "message": message,
                    "language": "english",
                    "route": "q",
                    "numbers": mobile,
                },
            )
            resp.raise_for_status()

        data = resp.json()
        if data.get("return") is True:
            logger.info(f"[OTPService] OTP sent to {mobile[-4:].zfill(10)} via Fast2SMS")
            return True

        logger.error(f"[OTPService] Fast2SMS returned error: {data}")
        return False

    except Exception as e:
        logger.error(f"[OTPService] SMS send failed for {mobile}: {e}")
        return False

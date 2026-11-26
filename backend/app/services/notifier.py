from datetime import datetime, timezone
from sqlalchemy import select
import os
import requests
from ..database import AsyncSessionLocal
from ..models import EmergencyContact, Notification

# Load TextBee credentials
TEXTBEE_API_KEY = os.getenv("TEXTBEE_API_KEY")
TEXTBEE_DEVICE_ID = os.getenv("TEXTBEE_DEVICE_ID")
# CORRECT URL: No device ID here
TEXTBEE_URL = "https://api.textbee.dev/api/v1/gateway/send-sms"

def send_real_sms_via_textbee(to_phone: str, message: str):
    if not TEXTBEE_API_KEY or not TEXTBEE_DEVICE_ID:
        print("[ERROR] TextBee credentials not set in .env")
        return False
    
    headers = {
        "x-api-key": TEXTBEE_API_KEY,
        "Content-Type": "application/json"
    }
    payload = {
        "recipients": [to_phone],
        "message": message,
        "deviceId": TEXTBEE_DEVICE_ID,
        "sender": "ElderCare"  # <-- Added custom Sender ID here
    }
    
    try:
        response = requests.post(TEXTBEE_URL, json=payload, headers=headers, timeout=10)
        response.raise_for_status()
        print(f"✅ [REAL SMS SENT via TextBee] to {to_phone}")
        return True
    except Exception as e:
        print(f"❌ [SMS FAILED] to {to_phone}: {str(e)}")
        # Print the actual response from TextBee to see the real error
        if hasattr(e, 'response') and e.response is not None:
            print(f"   Error Details: {e.response.text}")
        return False

def send_mock_call(to_phone: str, event_type: str):
    print(f"\n🚨🚨🚨 [EMERGENCY ALARM CALL INITIATED] 🚨🚨🚨")
    print(f"Dialing: {to_phone}")
    print(f"Voice Message: 'Emergency! A {event_type.replace('_', ' ')} was detected. Please check the ElderCare app immediately.'")
    print(f"🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨\n")
    return True

async def notify_emergency_contacts(emergency_id: int, elderly_id: int, event_type: str):
    async with AsyncSessionLocal() as db:
        contacts = (await db.execute(
            select(EmergencyContact)
            .where(EmergencyContact.elderly_id == elderly_id)
            .order_by(EmergencyContact.priority)
        )).scalars().all()

        if not contacts:
            print(f"[NOTIFIER] No contacts found for elderly_id {elderly_id}.")
            return

        sms_message = f"URGENT: A {event_type.replace('_', ' ')} was detected for your elderly profile. Check the dashboard immediately."

        for contact in contacts:
            # 1. Send REAL SMS via TextBee
            sms_success = send_real_sms_via_textbee(contact.phone, sms_message)
            if sms_success:
                db.add(Notification(
                    emergency_id=emergency_id,
                    contact_id=contact.id,
                    channel="SMS",
                    status="SENT",
                    message=sms_message,
                    sent_at=datetime.now(timezone.utc)
                ))

            # 2. Send Mock Alarm Call (Logs only)
            call_success = send_mock_call(contact.phone, event_type)
            if call_success:
                db.add(Notification(
                    emergency_id=emergency_id,
                    contact_id=contact.id,
                    channel="VOICE_CALL",
                    status="SENT",
                    message=f"Alarm call sent regarding {event_type}",
                    sent_at=datetime.now(timezone.utc)
                ))
            
        await db.commit()
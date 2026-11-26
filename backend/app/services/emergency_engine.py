from sqlalchemy.future import select
from ..models import Device, EmergencyEvent, AlertNotification
from ..database import AsyncSessionLocal
from ..websockets.manager import manager
from .notifier import notify_emergency_contacts

async def check_emergencies(data: dict):
    device_id = data.get("device_id")
    
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Device).where(Device.device_id == device_id))
        device = result.scalars().first()
        
        if not device or not device.elderly_id:
            return
            
        elderly_id = device.elderly_id
        
        # RULE 1: Fall Detection (From Hardware/Simulation)
        if data.get("fall_detected") is True:
            await trigger_emergency(db, elderly_id, device_id, "POSSIBLE_FALL", "EMERGENCY", "Possible fall detected by MPU6050.")
            
        # RULE 2: Washroom Timeout (Flagged by MQTT State Machine)
        if data.get("washroom_timeout") is True:
            await trigger_emergency(db, elderly_id, device_id, "WASHROOM_TIMEOUT", "WARNING", "Prolonged washroom occupancy detected. Elderly may need assistance.")
            
        # RULE 3: Abnormal Heart Rate (Flagged by MQTT Settings Check)
        if data.get("abnormal_heart_rate") is True:
            hr = data.get("heart_rate")
            await trigger_emergency(db, elderly_id, device_id, "ABNORMAL_HEART_RATE", "WARNING", f"Abnormal heart rate detected: {hr} BPM.")

async def trigger_emergency(db, elderly_id, device_id, event_type, severity, description):
    event = EmergencyEvent(
        elderly_id=elderly_id,
        device_id=device_id,
        event_type=event_type,
        severity=severity,
        description=description,
        status="ACTIVE"
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    
    notification = AlertNotification(event_id=event.id, channel="IN_APP", status="SENT")
    db.add(notification)
    await db.commit()

    await manager.broadcast({
        "type": "new_emergency",
        "data": {
            "id": event.id,
            "elderly_id": elderly_id,
            "event_type": event_type,
            "severity": severity,
            "description": description,
            "created_at": str(event.created_at)
        }
    })
    print(f"[ALERT] {event_type} triggered for Elderly ID {elderly_id}")
    
    # Trigger SMS Escalation (Phase 20)
    await notify_emergency_contacts(
        emergency_id=event.id,
        elderly_id=elderly_id,
        event_type=event_type
    )
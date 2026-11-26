from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
import csv
import io

from ..database import get_db
from ..models import User, ElderlyProfile, Device, EmergencyEvent, AuditLog, SensorReading
from ..security import get_current_user

router = APIRouter(prefix="/admin", tags=["Admin Dashboard"])

# Helper function to ensure user is admin
def check_admin(current_user: User):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")

@router.get("/stats")
async def get_admin_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_admin(current_user)

    users_count = (await db.execute(select(func.count(User.id)))).scalar()
    elderly_count = (await db.execute(select(func.count(ElderlyProfile.id)))).scalar()
    devices_count = (await db.execute(select(func.count(Device.id)))).scalar()
    active_emergencies = (await db.execute(
        select(func.count(EmergencyEvent.id)).where(EmergencyEvent.status == "ACTIVE")
    )).scalar()

    return {
        "total_users": users_count,
        "total_elderly": elderly_count,
        "total_devices": devices_count,
        "active_emergencies": active_emergencies
    }

@router.get("/users")
async def get_all_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_admin(current_user)

    result = await db.execute(
        select(User).order_by(desc(User.created_at))
    )
    users = result.scalars().all()
    
    return [
        {
            "id": u.id,
            "full_name": u.full_name,
            "email": u.email,
            "role": u.role,
            "status": u.account_status,
            "created_at": u.created_at
        }
        for u in users
    ]

@router.get("/audit-logs")
async def get_audit_logs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_admin(current_user)

    result = await db.execute(
        select(AuditLog, User.full_name)
        .outerjoin(User, AuditLog.user_id == User.id)
        .order_by(desc(AuditLog.created_at))
        .limit(100)
    )
    logs = result.all()

    return [
        {
            "id": log.AuditLog.id,
            "user_name": log.full_name or "System",
            "action": log.AuditLog.action,
            "target": log.AuditLog.target,
            "ip_address": log.AuditLog.ip_address,
            "created_at": log.AuditLog.created_at
        }
        for log in logs
    ]

# --- NEW PHASE 24 CSV EXPORT ---
@router.get("/export-csv")
async def export_sensor_data_csv(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_admin(current_user)

    # Fetch all sensor readings (you can add a .limit() if the DB gets too big)
    result = await db.execute(select(SensorReading).order_by(SensorReading.timestamp))
    readings = result.scalars().all()

    # Create an in-memory string buffer
    output = io.StringIO()
    writer = csv.writer(output)

    # Write the header row
    writer.writerow(["ID", "Device ID", "Timestamp", "Heart Rate", "SpO2", "Accel X", "Accel Y", "Accel Z"])

    # Write the data rows
    for r in readings:
        writer.writerow([
            r.id, 
            r.device_id, 
            r.timestamp, 
            r.heart_rate, 
            r.spo2, 
            r.accel_x, 
            r.accel_y, 
            r.accel_z
        ])

    # Move the cursor to the beginning of the buffer
    output.seek(0)

    # Return as a downloadable file
    return StreamingResponse(
        iter([output.getvalue()]), 
        media_type="text/csv", 
        headers={"Content-Disposition": "attachment; filename=eldercare_sensor_data.csv"}
    )
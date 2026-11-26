from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime
from typing import List

from ..database import get_db
from ..models import User, EmergencyEvent
from ..security import get_current_user
from ..websockets.manager import manager
from ..models import ElderlyProfile

router = APIRouter(prefix="/emergency", tags=["Emergency"])

@router.get("/active")
async def get_active_emergencies(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(EmergencyEvent).where(EmergencyEvent.status == "ACTIVE").order_by(EmergencyEvent.created_at.desc()))
    events = result.scalars().all()
    return events

@router.post("/{event_id}/acknowledge")
async def acknowledge_event(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(EmergencyEvent).where(EmergencyEvent.id == event_id))
    event = result.scalars().first()
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.status != "ACTIVE":
        raise HTTPException(status_code=400, detail="Event is already acknowledged")

    event.status = "ACKNOWLEDGED"
    event.acknowledged_at = datetime.utcnow()
    event.acknowledged_by = current_user.id
    await db.commit()
    
    # Broadcast the acknowledgment to all caregivers
    await manager.broadcast({
        "type": "emergency_acknowledged",
        "data": {"event_id": event_id, "acknowledged_by": current_user.full_name}
    })
    
    return {"status": "success", "message": "Emergency acknowledged"}
@router.get("/history/{elderly_id}")
async def get_emergency_history(
    elderly_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify access
    from ..models import CaregiverRelationship
    result = await db.execute(
        select(CaregiverRelationship)
        .where(CaregiverRelationship.caregiver_id == current_user.id)
        .where(CaregiverRelationship.elderly_id == elderly_id)
    )
    if not result.scalars().first():
        raise HTTPException(status_code=403, detail="Not authorized")

    # Fetch all emergency events for this elderly person
    result = await db.execute(
        select(EmergencyEvent)
        .where(EmergencyEvent.elderly_id == elderly_id)
        .order_by(EmergencyEvent.created_at.desc())
    )
    events = result.scalars().all()
    
    return events
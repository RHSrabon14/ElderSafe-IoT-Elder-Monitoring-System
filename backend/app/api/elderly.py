from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel

from ..database import get_db
from ..models import (
    User, ElderlyProfile, CaregiverRelationship, Device, 
    SensorReading, ActivityEvent, DoorEvent, EmergencyContact,
    MonitoringSettings
)
from ..schemas.elderly import ElderlyCreate, ElderlyResponse, DeviceCreate, DeviceResponse, ElderlyUpdate
from ..security import get_current_user

router = APIRouter(prefix="/elderly", tags=["Elderly Profiles"])

@router.get("/{elderly_id}/history")
async def get_elderly_history(
    elderly_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify access
    result = await db.execute(
        select(CaregiverRelationship)
        .where(CaregiverRelationship.caregiver_id == current_user.id)
        .where(CaregiverRelationship.elderly_id == elderly_id)
    )
    if not result.scalars().first():
        raise HTTPException(status_code=403, detail="Not authorized")

    # Find the device linked to this elderly person
    result = await db.execute(select(Device).where(Device.elderly_id == elderly_id))
    device = result.scalars().first()
    if not device:
        return []

    # Fetch the last 100 readings for this device
    result = await db.execute(
        select(SensorReading)
        .where(SensorReading.device_id == device.device_id)
        .order_by(desc(SensorReading.timestamp))
        .limit(100)
    )
    readings = result.scalars().all()
    
    # Reverse to show chronological order in the chart
    readings.reverse()
    
    return readings

@router.post("/", response_model=ElderlyResponse)
async def create_elderly(
    elderly_in: ElderlyCreate, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin" and current_user.role != "caregiver":
        raise HTTPException(status_code=403, detail="Not authorized to create profiles")

    new_elderly = ElderlyProfile(
        name=elderly_in.name,
        age=elderly_in.age,
        date_of_birth=elderly_in.date_of_birth,
        gender=elderly_in.gender,
        address=elderly_in.address,
        phone_number=elderly_in.phone_number,
        medical_conditions=elderly_in.medical_conditions,
        doctor_contact=elderly_in.doctor_contact,
        medical_notes=elderly_in.medical_notes
    )
    db.add(new_elderly)
    await db.commit()
    await db.refresh(new_elderly)

    # Automatically link the caregiver who created the profile as "primary"
    relationship = CaregiverRelationship(
        caregiver_id=current_user.id,
        elderly_id=new_elderly.id,
        permission_level="primary"
    )
    db.add(relationship)

    # Automatically create default monitoring settings for this new profile
    default_settings = MonitoringSettings(elderly_id=new_elderly.id)
    db.add(default_settings)

    await db.commit()

    return new_elderly

@router.get("/", response_model=List[ElderlyResponse])
async def get_my_elderly(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Fetch only the elderly profiles linked to this caregiver
    result = await db.execute(
        select(ElderlyProfile)
        .join(CaregiverRelationship)
        .where(CaregiverRelationship.caregiver_id == current_user.id)
    )
    return result.scalars().all()

@router.put("/{elderly_id}", response_model=ElderlyResponse)
async def update_elderly(
    elderly_id: int,
    profile_data: ElderlyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify access
    result = await db.execute(
        select(CaregiverRelationship)
        .where(CaregiverRelationship.caregiver_id == current_user.id)
        .where(CaregiverRelationship.elderly_id == elderly_id)
    )
    if not result.scalars().first():
        raise HTTPException(status_code=403, detail="Not authorized")

    result = await db.execute(select(ElderlyProfile).where(ElderlyProfile.id == elderly_id))
    profile = result.scalars().first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
        
    # Update only the fields that were provided
    for key, value in profile_data.model_dump(exclude_unset=True).items():
        setattr(profile, key, value)
        
    await db.commit()
    await db.refresh(profile)
    return profile

@router.post("/{elderly_id}/devices", response_model=DeviceResponse)
async def assign_device(
    elderly_id: int,
    device_in: DeviceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify the caregiver owns this profile
    result = await db.execute(
        select(CaregiverRelationship)
        .where(CaregiverRelationship.caregiver_id == current_user.id)
        .where(CaregiverRelationship.elderly_id == elderly_id)
    )
    if not result.scalars().first():
        raise HTTPException(status_code=403, detail="Not authorized for this profile")

    # Check if device exists or create a new one
    result = await db.execute(select(Device).where(Device.device_id == device_in.device_id))
    device = result.scalars().first()
    
    if device:
        device.elderly_id = elderly_id
    else:
        device = Device(device_id=device_in.device_id, elderly_id=elderly_id)
        db.add(device)
        
    await db.commit()
    await db.refresh(device)
    return device

@router.get("/{elderly_id}/device-status")
async def get_device_status(
    elderly_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Device).where(Device.elderly_id == elderly_id))
    device = result.scalars().first()
    
    if not device or not device.last_seen:
        return {"status": "OFFLINE", "last_seen": None}
        
    now = datetime.now(timezone.utc)
    # Make sure last_seen is timezone-aware
    last_seen = device.last_seen
    if last_seen.tzinfo is None:
        last_seen = last_seen.replace(tzinfo=timezone.utc)
        
    time_diff = now - last_seen
    
    if time_diff > timedelta(minutes=2):
        return {"status": "OFFLINE", "last_seen": device.last_seen}
        
    return {"status": "ONLINE", "last_seen": device.last_seen}

@router.get("/{elderly_id}/events")
async def get_elderly_events(
    elderly_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    acts = (await db.execute(
        select(ActivityEvent)
        .where(ActivityEvent.elderly_id == elderly_id)
        .order_by(desc(ActivityEvent.created_at))
        .limit(20)
    )).scalars().all()

    doors = (await db.execute(
        select(DoorEvent)
        .where(DoorEvent.elderly_id == elderly_id)
        .order_by(desc(DoorEvent.created_at))
        .limit(20)
    )).scalars().all()

    return {
        "activities": [
            {"id": a.id, "event_type": a.event_type,
             "description": a.description, "created_at": a.created_at}
            for a in acts
        ],
        "doors": [
            {"id": d.id, "door_state": d.door_state, "created_at": d.created_at}
            for d in doors
        ],
    }

# --- PHASE 20 ENDPOINTS ---

class ContactCreate(BaseModel):
    name: str
    phone: str
    relationship: Optional[str] = None
    priority: int = 1

@router.get("/{elderly_id}/contacts")
async def get_contacts(
    elderly_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(EmergencyContact).where(EmergencyContact.elderly_id == elderly_id)
        .order_by(EmergencyContact.priority)
    )
    return result.scalars().all()

@router.post("/{elderly_id}/contacts")
async def add_contact(
    elderly_id: int,
    contact: ContactCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_contact = EmergencyContact(
        elderly_id=elderly_id,
        name=contact.name,
        phone=contact.phone,
        relationship=contact.relationship,
        priority=contact.priority
    )
    db.add(new_contact)
    await db.commit()
    await db.refresh(new_contact)
    return new_contact

# --- PHASE 22 ENDPOINTS ---

class SettingsUpdate(BaseModel):
    max_heart_rate: Optional[int] = None
    min_heart_rate: Optional[int] = None
    washroom_timeout_seconds: Optional[int] = None
    inactivity_timeout_minutes: Optional[int] = None

@router.get("/{elderly_id}/settings")
async def get_settings(
    elderly_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(MonitoringSettings).where(MonitoringSettings.elderly_id == elderly_id))
    settings = result.scalars().first()
    
    if not settings:
        # Create defaults if missing
        settings = MonitoringSettings(elderly_id=elderly_id)
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
        
    return settings

@router.put("/{elderly_id}/settings")
async def update_settings(
    elderly_id: int,
    settings_data: SettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(MonitoringSettings).where(MonitoringSettings.elderly_id == elderly_id))
    settings = result.scalars().first()
    
    if not settings:
        settings = MonitoringSettings(elderly_id=elderly_id)
        db.add(settings)
    
    for key, value in settings_data.model_dump(exclude_unset=True).items():
        setattr(settings, key, value)
        
    await db.commit()
    await db.refresh(settings)
    return settings
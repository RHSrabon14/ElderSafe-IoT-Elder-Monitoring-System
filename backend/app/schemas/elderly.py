from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class ElderlyCreate(BaseModel):
    name: str
    age: int
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    phone_number: Optional[str] = None
    medical_conditions: Optional[str] = None
    doctor_contact: Optional[str] = None
    medical_notes: Optional[str] = None

class ElderlyUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    phone_number: Optional[str] = None
    medical_conditions: Optional[str] = None
    doctor_contact: Optional[str] = None
    medical_notes: Optional[str] = None

class ElderlyResponse(BaseModel):
    id: int
    name: str
    age: int
    date_of_birth: Optional[str]
    gender: Optional[str]
    address: Optional[str]
    phone_number: Optional[str]
    medical_conditions: Optional[str]
    doctor_contact: Optional[str]
    medical_notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class DeviceCreate(BaseModel):
    device_id: str

class DeviceResponse(BaseModel):
    id: int
    device_id: str
    last_seen: Optional[datetime]
    elderly_id: Optional[int]

    class Config:
        from_attributes = True
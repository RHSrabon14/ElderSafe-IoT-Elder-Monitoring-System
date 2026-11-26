from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    phone_number: Optional[str] = None
    password: str
    role: str = "caregiver"
    relationship_to_elderly: Optional[str] = None
    terms_accepted: bool = True

class UserResponse(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    phone_number: Optional[str]
    role: str
    relationship_to_elderly: Optional[str]
    profile_picture: Optional[str]
    account_status: str
    email_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
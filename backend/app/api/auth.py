from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import timedelta

from ..database import get_db
from ..models import User
from ..schemas.user import UserCreate, UserResponse, Token
from ..security import get_password_hash, verify_password, create_access_token, get_current_user
from ..config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    if not user_in.terms_accepted:
        raise HTTPException(status_code=400, detail="You must accept the terms and conditions")
        
    # 1. Check if Email exists
    result = await db.execute(select(User).where(User.email == user_in.email))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="An account with this email already exists. Please log in.")
    
    # 2. Check if Phone Number exists (if provided)
    if user_in.phone_number:
        result = await db.execute(select(User).where(User.phone_number == user_in.phone_number))
        if result.scalars().first():
            raise HTTPException(status_code=400, detail="An account with this phone number already exists. Please log in.")
    
    # Create new user
    assigned_role = user_in.role if user_in.role in ["caregiver", "elderly"] else "caregiver"
    
    new_user = User(
        full_name=user_in.full_name,
        email=user_in.email,
        phone_number=user_in.phone_number,
        hashed_password=get_password_hash(user_in.password),
        role=assigned_role,
        relationship_to_elderly=user_in.relationship_to_elderly,
        email_verified=False
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalars().first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if user.account_status != "active":
        raise HTTPException(status_code=403, detail="Account is disabled")
    
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/me", response_model=UserResponse)
async def update_me(
    user_in: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if "full_name" in user_in: current_user.full_name = user_in["full_name"]
    if "phone_number" in user_in: current_user.phone_number = user_in["phone_number"]
    if "relationship_to_elderly" in user_in: current_user.relationship_to_elderly = user_in["relationship_to_elderly"]
    if "profile_picture" in user_in: current_user.profile_picture = user_in["profile_picture"]
    
    await db.commit()
    await db.refresh(current_user)
    return current_user
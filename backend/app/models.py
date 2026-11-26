from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone_number = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="caregiver")
    relationship_to_elderly = Column(String, nullable=True)
    profile_picture = Column(String, nullable=True)
    account_status = Column(String, default="active")
    email_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ElderlyProfile(Base):
    __tablename__ = "elderly_profiles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    age = Column(Integer)
    date_of_birth = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    address = Column(String, nullable=True)
    phone_number = Column(String, nullable=True)
    medical_conditions = Column(String, nullable=True)
    doctor_contact = Column(String, nullable=True)
    medical_notes = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    caregivers = relationship("CaregiverRelationship", back_populates="elderly")
    devices = relationship("Device", back_populates="elderly")

class CaregiverRelationship(Base):
    __tablename__ = "caregiver_relationships"
    id = Column(Integer, primary_key=True, index=True)
    caregiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    elderly_id = Column(Integer, ForeignKey("elderly_profiles.id"), nullable=False)
    permission_level = Column(String, default="primary")

    elderly = relationship("ElderlyProfile", back_populates="caregivers")

class Device(Base):
    __tablename__ = "devices"
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String, unique=True, index=True, nullable=False)
    elderly_id = Column(Integer, ForeignKey("elderly_profiles.id"), nullable=True)
    last_seen = Column(DateTime(timezone=True), nullable=True)

    elderly = relationship("ElderlyProfile", back_populates="devices")

class SensorReading(Base):
    __tablename__ = "sensor_readings"
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String, index=True, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    heart_rate = Column(Integer, nullable=True)
    spo2 = Column(Integer, nullable=True)
    accel_x = Column(Float, nullable=True)
    accel_y = Column(Float, nullable=True)
    accel_z = Column(Float, nullable=True)

class EmergencyEvent(Base):
    __tablename__ = "emergency_events"
    id = Column(Integer, primary_key=True, index=True)
    elderly_id = Column(Integer, ForeignKey("elderly_profiles.id"), nullable=False)
    device_id = Column(String, index=True, nullable=False)
    event_type = Column(String, nullable=False)
    severity = Column(String, default="EMERGENCY")
    status = Column(String, default="ACTIVE")
    description = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    acknowledged_by = Column(Integer, ForeignKey("users.id"), nullable=True)

class AlertNotification(Base):
    __tablename__ = "alert_notifications"
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("emergency_events.id"), nullable=False)
    channel = Column(String, default="IN_APP")
    status = Column(String, default="SENT")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ActivityEvent(Base):
    __tablename__ = "activity_events"
    id = Column(Integer, primary_key=True, index=True)
    elderly_id = Column(Integer, ForeignKey("elderly_profiles.id"), nullable=False)
    device_id = Column(String, nullable=False)
    event_type = Column(String, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class DoorEvent(Base):
    __tablename__ = "door_events"
    id = Column(Integer, primary_key=True, index=True)
    elderly_id = Column(Integer, ForeignKey("elderly_profiles.id"), nullable=False)
    device_id = Column(String, nullable=False)
    door_state = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class EmergencyContact(Base):
    __tablename__ = "emergency_contacts"
    id = Column(Integer, primary_key=True, index=True)
    elderly_id = Column(Integer, ForeignKey("elderly_profiles.id"), nullable=False)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    relationship = Column(String, nullable=True)
    priority = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    emergency_id = Column(Integer, ForeignKey("emergency_events.id"), nullable=False)
    contact_id = Column(Integer, ForeignKey("emergency_contacts.id"), nullable=False)
    channel = Column(String, nullable=False)
    status = Column(String, default="SENT")
    message = Column(String, nullable=True)
    sent_at = Column(DateTime(timezone=True), server_default=func.now())

class WashroomSession(Base):
    __tablename__ = "washroom_sessions"
    id = Column(Integer, primary_key=True, index=True)
    elderly_id = Column(Integer, ForeignKey("elderly_profiles.id"), nullable=False)
    device_id = Column(String, nullable=False)
    enter_time = Column(DateTime(timezone=True), server_default=func.now())
    exit_time = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    status = Column(String, default="ACTIVE")

class MonitoringSettings(Base):
    __tablename__ = "monitoring_settings"
    id = Column(Integer, primary_key=True, index=True)
    elderly_id = Column(Integer, ForeignKey("elderly_profiles.id"), nullable=False, unique=True)
    max_heart_rate = Column(Integer, default=120)
    min_heart_rate = Column(Integer, default=50)
    washroom_timeout_seconds = Column(Integer, default=60)
    inactivity_timeout_minutes = Column(Integer, default=120)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

# --- PHASE 23 MODEL ---

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String, nullable=False)        # e.g., "LOGIN", "CREATE_PROFILE"
    target = Column(String, nullable=True)         # e.g., "Elderly ID 1"
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
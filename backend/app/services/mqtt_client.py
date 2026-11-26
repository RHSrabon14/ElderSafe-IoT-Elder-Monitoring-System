import json
import asyncio
import paho.mqtt.client as mqtt
from datetime import datetime, timezone
from sqlalchemy.future import select
from sqlalchemy import desc
from ..database import AsyncSessionLocal
from ..models import (
    SensorReading, Device, ActivityEvent, DoorEvent, WashroomSession, MonitoringSettings
)
from .emergency_engine import check_emergencies

MQTT_BROKER = "mqtt"
MQTT_PORT = 1883


class MQTTService:
    def __init__(self):
        self.client = mqtt.Client()
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message
        self.loop = None
        self.manager = None

    def start(self, loop, manager):
        self.loop = loop
        self.manager = manager
        self.client.connect(MQTT_BROKER, MQTT_PORT, 60)
        self.client.loop_start()

    def on_connect(self, client, userdata, flags, rc):
        print(f"[MQTT] Connected with result code {rc}")
        client.subscribe("eldercare/+/telemetry")

    def on_message(self, client, userdata, msg):
        payload = json.loads(msg.payload.decode())
        asyncio.run_coroutine_threadsafe(self.process_telemetry(payload), self.loop)

    async def process_telemetry(self, data):
        device = None
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Device).where(Device.device_id == data["device_id"]))
            device = result.scalars().first()

            if device:
                # 1. Update last seen (Phase 18)
                device.last_seen = datetime.now(timezone.utc)

                # Fetch dynamic settings (Phase 22)
                result = await db.execute(select(MonitoringSettings).where(MonitoringSettings.elderly_id == device.elderly_id))
                settings = result.scalars().first()
                
                # Fallback if settings don't exist yet
                max_hr = settings.max_heart_rate if settings else 120
                min_hr = settings.min_heart_rate if settings else 50
                washroom_limit = settings.washroom_timeout_seconds if settings else 60

                # 2. Save sensor reading
                reading = SensorReading(
                    device_id=data["device_id"],
                    heart_rate=data.get("heart_rate"),
                    spo2=data.get("spo2"),
                    accel_x=data.get("accel", {}).get("x"),
                    accel_y=data.get("accel", {}).get("y"),
                    accel_z=data.get("accel", {}).get("z"),
                )
                db.add(reading)

                # 3. Save ActivityEvent when a fall is detected (Phase 19)
                if data.get("fall_detected") is True:
                    db.add(ActivityEvent(
                        elderly_id=device.elderly_id,
                        device_id=device.device_id,
                        event_type="POSSIBLE_FALL",
                        description="Possible fall detected by MPU6050.",
                    ))

                # 4. Check for Abnormal Heart Rate dynamically (Phase 22)
                hr = data.get("heart_rate")
                if hr and (hr < min_hr or hr > max_hr):
                    data["abnormal_heart_rate"] = True  # Flag for the emergency engine

                # 5. Save DoorEvent and Update Washroom State (Phase 19 & 21)
                if data.get("door_state") is not None:
                    door_state = str(data["door_state"]).upper()
                    
                    db.add(DoorEvent(
                        elderly_id=device.elderly_id,
                        device_id=device.device_id,
                        door_state=door_state,
                    ))

                    if door_state == "OPEN":
                        # Check if there is already an active session to prevent duplicates
                        result = await db.execute(
                            select(WashroomSession)
                            .where(WashroomSession.elderly_id == device.elderly_id)
                            .where(WashroomSession.status == "ACTIVE")
                        )
                        active_session = result.scalars().first()
                        
                        if not active_session:
                            # Start a new session
                            new_session = WashroomSession(
                                elderly_id=device.elderly_id,
                                device_id=device.device_id,
                                status="ACTIVE"
                            )
                            db.add(new_session)

                    elif door_state == "CLOSED":
                        # Find the active session and close it
                        result = await db.execute(
                            select(WashroomSession)
                            .where(WashroomSession.elderly_id == device.elderly_id)
                            .where(WashroomSession.status == "ACTIVE")
                            .order_by(desc(WashroomSession.enter_time))
                        )
                        active_session = result.scalars().first()
                        
                        if active_session:
                            now = datetime.now(timezone.utc)
                            enter_time = active_session.enter_time
                            if enter_time.tzinfo is None:
                                enter_time = enter_time.replace(tzinfo=timezone.utc)
                                
                            duration = int((now - enter_time).total_seconds())
                            active_session.exit_time = now
                            active_session.duration_seconds = duration
                            
                            # Phase 21/22: Trigger Timeout Emergency based on dynamic settings
                            if duration >= washroom_limit:
                                active_session.status = "TIMEOUT"
                                data["washroom_timeout"] = True
                            else:
                                active_session.status = "COMPLETED"

                await db.commit()
                print(f"[MQTT] Saved telemetry + events for {data['device_id']}")
            else:
                print(f"[MQTT] Warning: Device {data['device_id']} not found in database. Data ignored.")

        # Trigger Emergency Rules (only if device exists)
        if device:
            await check_emergencies(data)

        # Broadcast to WebSockets in real-time
        if self.manager:
            await self.manager.broadcast({
                "type": "telemetry",
                "data": data,
            })


mqtt_service = MQTTService()
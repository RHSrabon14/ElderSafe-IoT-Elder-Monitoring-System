import asyncio
from datetime import datetime, timezone
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from .database import engine, Base, AsyncSessionLocal
from .api import auth, elderly, emergency, admin
from .services.mqtt_client import mqtt_service
from .services.emergency_engine import trigger_emergency
from .websockets.manager import manager
from .models import WashroomSession, MonitoringSettings, Device, SensorReading

app = FastAPI(title="ElderCare Guardian API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(elderly.router, prefix="/api/v1")
app.include_router(emergency.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")

# --- BACKGROUND WATCHDOG TASK ---
async def watchdog_worker():
    """Runs every 10 seconds to check for Washroom Timeouts and Heart Rate Flatlines."""
    while True:
        try:
            async with AsyncSessionLocal() as db:
                now = datetime.now(timezone.utc)

                # 1. Check Washroom Timeouts
                active_sessions = (await db.execute(
                    select(WashroomSession).where(WashroomSession.status == "ACTIVE")
                )).scalars().all()

                for session in active_sessions:
                    # Get the specific timeout settings for this elderly person
                    settings = (await db.execute(
                        select(MonitoringSettings).where(MonitoringSettings.elderly_id == session.elderly_id)
                    )).scalars().first()
                    
                    limit = settings.washroom_timeout_seconds if settings else 60
                    
                    enter_time = session.enter_time
                    if enter_time.tzinfo is None:
                        enter_time = enter_time.replace(tzinfo=timezone.utc)
                        
                    duration = (now - enter_time).total_seconds()
                    
                    if duration >= limit:
                        # Mark session as TIMEOUT so we don't alert again
                        session.status = "TIMEOUT"
                        await db.commit()
                        
                        # Trigger the emergency and escalate to SMS/Calls
                        await trigger_emergency(
                            db, session.elderly_id, session.device_id, 
                            "WASHROOM_TIMEOUT", "EMERGENCY", 
                            f"Elderly has been in the washroom for over {int(duration)} seconds."
                        )

                # 2. Check for Flatline (Heart Rate = 0 or missing while device is online)
                # For simplicity, we check the last reading of online devices
                devices = (await db.execute(select(Device).where(Device.last_seen.isnot(None)))).scalars().all()
                for device in devices:
                    last_seen = device.last_seen
                    if last_seen.tzinfo is None:
                        last_seen = last_seen.replace(tzinfo=timezone.utc)
                        
                    # If the device is considered ONLINE (sent data in last 2 mins)
                    if (now - last_seen).total_seconds() < 120:
                        last_reading = (await db.execute(
                            select(SensorReading)
                            .where(SensorReading.device_id == device.device_id)
                            .order_by(SensorReading.timestamp.desc())
                        )).scalars().first()
                        
                        # If no heart rate or HR is 0, trigger Flatline
                        if last_reading and (last_reading.heart_rate is None or last_reading.heart_rate == 0):
                            # Check if we already triggered a flatline recently to avoid spam
                            # (Simplified: just trigger it)
                            await trigger_emergency(
                                db, device.elderly_id, device.device_id,
                                "HEART_RATE_LOST", "EMERGENCY",
                                "Device is online but heart rate is not being measured or is flatlining."
                            )
                            
        except Exception as e:
            print(f"[WATCHDOG ERROR] {e}")
        
        await asyncio.sleep(10) # Run every 10 seconds

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    loop = asyncio.get_running_loop()
    mqtt_service.start(loop, manager)
    
    # Start the background watchdog task
    asyncio.create_task(watchdog_worker())
    print("[SYSTEM] Watchdog Worker started.")

@app.get("/")
async def root():
    return {"status": "ok", "message": "ElderCare Guardian API is running"}
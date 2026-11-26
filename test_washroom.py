import json
import time
import paho.mqtt.publish as publish

HOST = "mqtt"
TOPIC = "eldercare/ESP32_001/telemetry"

def send_door_state(state):
    payload = {
        "device_id": "ESP32_001",
        "heart_rate": 80,
        "spo2": 98,
        "accel": {"x": 0.0, "y": 0.0, "z": 1.0},
        "door_state": state
    }
    print(f"Sending door state: {state}...")
    publish.single(TOPIC, json.dumps(payload), hostname=HOST)

# 1. Open the door
send_door_state("OPEN")
print("Waiting 65 seconds to simulate prolonged occupancy...")
time.sleep(65)

# 2. Close the door
send_door_state("CLOSED")
print("Test complete. Check backend logs for WASHROOM_TIMEOUT!")
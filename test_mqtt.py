import paho.mqtt.client as mqtt
import json
import time

client = mqtt.Client()
client.connect("mqtt", 1883, 60)

payload = {
    "device_id": "ESP32_001",
    "heart_rate": 78,
    "spo2": 98,
    "signal_quality": "good",
    "accel": {"x": 0.1, "y": 0.1, "z": 9.8},
    "fall_detected": True,  # <--- CHANGED TO TRUE
    "door_state": "closed"
}

client.publish("eldercare/ESP32_001/telemetry", json.dumps(payload))
print("Fall message published successfully!")
time.sleep(1)
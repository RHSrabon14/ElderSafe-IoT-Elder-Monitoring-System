import json
import paho.mqtt.publish as publish

publish.single(
    "eldercare/ESP32_001/telemetry",
    json.dumps({
        "device_id": "ESP32_001",
        "heart_rate": 82,
        "spo2": 97,
        "accel": {"x": 0.1, "y": 0.2, "z": 1.0},
        "fall_detected": True,
        "door_state": "OPEN",
    }),
    hostname="mqtt",
)
print("Published telemetry with fall + door open")
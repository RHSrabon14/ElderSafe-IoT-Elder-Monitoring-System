# 🏥 ElderSafe: IoT Full-Stack Elder Monitoring System

An end-to-end IoT system designed to monitor the health and safety of elderly individuals in real-time, featuring fall detection, heart rate monitoring, washroom occupancy tracking, and automated multi-channel emergency escalation.

## 📸 Project Showcase

### 💻 Software Dashboard
*Here are the key features of the live React dashboard and real-time alerts.*

**Dashboard & Notification Bell:**
![Dashboard](docs/software/software2.png)
![Live Alerts](docs/software/software5.png)

**Profile & Health Analytics:**
![Profile](docs/software/software3.png)
![Health](docs/software/software9.png)
![Emergency Log](docs/software/software10.png)
![Admin panel](docs/software/software11.png)

**Real SMS Alerts on Phone:**
![SMS Alert](docs/software/software10.png)

### 🔌 Hardware Prototype
*The physical ESP32 integration with the three sensors.*

**ESP32 Setup:**
![Hardware 1](docs/hardware/hardware2.jpeg)
![Hardware 2](docs/hardware/hardware5.jpeg)
![Hardware 3](docs/hardware/hardware8.jpeg)
![Hardware 4](docs/hardware/hardware9.jpeg)

---

## 🛠 Tech Stack
- **Hardware:** ESP32, MPU6050 (Fall), MAX30102 (Heart Rate), MC-38 (Door)
- **Backend:** FastAPI, PostgreSQL, SQLAlchemy, Mosquitto MQTT, TextBee (SMS)
- **Frontend:** React, TypeScript, Tailwind CSS, Recharts, React Query

## 🚀 How to Run Locally
1. Clone this repository.
2. Create a `.env` file based on `.env.example`.
3. Run `docker compose up --build -d`.
4. Access the dashboard at `http://localhost:5173`.
5. Access the API docs at `http://localhost:8000/docs`.

# TN-GridSense: Technical Proposal

**Distributed Smart Pole Telemetry & Predictive Fault Management System**

*A State-Scale Platform for Tamil Nadu Electricity Board (TNEB)*

---

## 1. The Core Problem

Tamil Nadu's distribution grid faces structural stress:

- **Evening peak deficit** up to 5,000 MW
- **Transformer overload** during 6–10 PM peak hours
- **Delayed maintenance** due to night-time work restrictions
- **AT&C losses** from both theft and technical inefficiency
- **Rising renewable variability** from solar and wind integration
- **High debt burden** limiting infrastructure upgrade budgets

### The Fundamental Gap

The grid lacks **granular, real-time, pole-level visibility**.

Today, utilities monitor at the feeder level. They do not know micro-level stress conditions until a failure occurs. Failures are **reactive**. Maintenance is **manual**. Losses are **invisible** until audited.

---

## 2. The Vision

Deploy intelligent edge monitoring nodes on every distribution pole across Tamil Nadu.

Each pole becomes:

| Function | Capability |
|----------|-----------|
| **Real-time sensor** | Voltage, current, temperature monitoring |
| **Local protection unit** | Automatic relay trip on fault |
| **Telemetry device** | Continuous data transmission to cloud |
| **Predictive maintenance source** | Health scoring and failure prediction |

**Instead of waiting for failures, the system detects and predicts them.**

---

## 3. System Architecture

### A. Edge Layer — Smart Pole Node

Each pole contains:

- **ESP32** microcontroller
- **ADS1115** 16-bit ADC for precision voltage/current measurement
- **ACS712** AC current sensor (30A range)
- **AC Voltage Divider** for mains voltage sensing
- **INA219** DC bus monitor
- **MAX6675** thermocouple for transformer temperature
- **LoRa SX1278** for long-range communication
- **WiFi** for internet connectivity
- **OLED Display** for local readout
- **5V Relay** for fault protection
- NTP time synchronization
- Local data buffering
- Over-the-air (OTA) firmware update capability

**Each pole transmits a structured telemetry packet every 5 seconds:**

| Field | Description |
|-------|-------------|
| Pole ID | Unique identifier |
| Timestamp | NTP-synced IST time |
| Voltage | AC mains voltage (V) |
| Current | AC line current (A) |
| Temperature | Transformer temperature (°C) |
| Power | Active power (W) |
| Health Score | 0–100% composite score |
| Relay State | ON/OFF |
| Status | NORMAL / OVERVOLTAGE / UNDERVOLTAGE / OVERLOAD / OVERHEAT |
| Signal Strength | WiFi/LoRa RSSI |

### B. Communication Layer

**Hybrid model:**

| Environment | Technology | Path |
|-------------|-----------|------|
| Urban | WiFi / 4G | Pole → Cloud directly |
| Rural | LoRa (433 MHz) | Pole → Regional Gateway → Cloud |

Data is transmitted securely with authentication tokens.

### C. Backend Layer

Built using **Bun + Elysia** for high-performance, low-latency processing:

- **Telemetry ingestion API** — handles concurrent POST requests from all poles
- **In-memory time-series store** — 24-hour rolling history per pole
- **Feeder aggregation engine** — computes feeder-level and district-level summaries
- **Anomaly detection engine** — voltage deviation, current spikes, thermal runaway
- **Health scoring engine** — weighted composite from temperature, voltage, current, events
- **Predictive maintenance engine** — risk classification (LOW/MODERATE/HIGH/CRITICAL)
- **AT&C loss estimator** — feeder input vs pole-sum deviation analysis
- **WebSocket server** — real-time push updates to dashboard

Capable of handling **100,000+ poles** with horizontal scaling.

### D. Dashboard Layer

Three-tier interactive dashboard:

#### Level 1 — State Overview
- Tamil Nadu district map with color-coded health status
- KPI cards: total poles, active, faults, overheats, total load
- District health ranking table
- Live fault event feed

#### Level 2 — District View
- Feeder-level card grid with load, health, and AT&C loss
- Load distribution chart
- Health circle visualization
- Full poles table with drill-down

#### Level 3 — Pole Inspector
- Live voltage, current, temperature, health gauges
- 24-hour trend charts (voltage/current, temperature/health)
- Event log
- Maintenance recommendation with risk factors
- Relay state and signal quality

---

## 4. Key Functional Capabilities

### 4.1 Real-Time Grid Visibility

Provides **pole-level** voltage and current data across the entire state. Enables load balancing and peak hour monitoring that was previously impossible.

### 4.2 Intelligent Fault Detection

Automatically detects:
- **Overvoltage** (>253V / >248V warning)
- **Undervoltage** (<207V / <212V warning)
- **Overload** (>25A warning / >28A critical)
- **Transformer overheating** (>65°C warning / >80°C critical / >95°C emergency)

Triggers relay protection and logs event with full telemetry context.

### 4.3 Predictive Maintenance

Uses temperature trends, overload event frequency, and voltage stability to compute:

- **Transformer Health Score** (0–100%)
- **Risk Level** (LOW / MODERATE / HIGH / CRITICAL)
- **Estimated days to failure**
- **Specific maintenance recommendations**

Flags high-risk poles before failure occurs. **Reduces unplanned outages.**

### 4.4 AT&C Loss Reduction

Compares:
- **Feeder input power** (from feeder meter)
- **Sum of pole-level loads** (from GridSense nodes)

Detects abnormal deviation patterns indicating:
- Technical losses beyond normal 7% baseline
- Theft clusters (>15% deviation flagged)

Generates theft cluster alerts for field investigation.

### 4.5 Renewable Integration Support

Provides real-time district-level load data that enables:
- Pre-activation of backup generation before evening peak
- Strategic battery storage deployment planning
- Evening peak deficit management (5,000 MW problem)

### 4.6 Maintenance Optimization

When night maintenance is restricted:
- System identifies **exact pole and fault type**
- Field staff respond **precisely** the next morning
- **Reduces downtime** from hours to minutes

### 4.7 Data Integrity & Reliability

Each node supports:
- **NTP time synchronization** (IST, hourly re-sync)
- **Local buffering** during network outages (100 packets)
- **Secure authentication** tokens
- **Over-the-air firmware updates**

---

## 5. Impact on Tamil Nadu Grid

| Impact Area | Benefit |
|-------------|---------|
| **Outage Duration** | Precise fault localization → faster restoration |
| **Transformer Failures** | Early overheat detection → preventive action |
| **AT&C Losses** | Data-driven theft identification → revenue recovery |
| **Renewable Management** | Load forecasting → better grid stability |
| **Policy Decisions** | Granular consumption patterns → evidence-based planning |

---

## 6. Scalability

| Phase | Scale | Scope |
|-------|-------|-------|
| Phase 1 | 1,000 poles | Pilot in one district |
| Phase 2 | 10,000 poles | Regional rollout |
| Phase 3 | 100,000+ poles | State-wide deployment |
| Phase 4 | — | AI-driven predictive grid optimization |

Architecture supports horizontal scaling through:
- Regional aggregation gateways
- Time-series database partitioning
- Hierarchical dashboard caching

---

## 7. Economic Justification

- Even **1% reduction in AT&C losses** across Tamil Nadu saves **hundreds of crores annually**
- Reduced transformer replacements (₹3–8 lakhs per unit)
- Reduced emergency maintenance dispatches
- Improved billing accuracy
- System cost amortizes within **2–3 years**

---

## 8. What Makes This Different

This is **not** just a smart meter or data logger.

It is **edge-based protection + telemetry + predictive intelligence** integrated into one cohesive system:

| Layer | What It Does |
|-------|-------------|
| Hardware | Senses, protects, communicates |
| Communication | Hybrid WiFi + LoRa for universal coverage |
| Cloud/Backend | Ingests, stores, analyzes, predicts |
| Dashboard | Visualizes at state/district/pole level |
| Analytics | Detects, predicts, recommends |

---

## 9. Long-Term Vision

- Smart city integration
- Transformer asset lifecycle management
- Demand response systems
- Dynamic load pricing platform
- State-level energy intelligence network

---

*This system is realistic, technically grounded, and scalable. It does not claim to generate power — it optimizes and protects distribution. That is exactly where utilities struggle today.*

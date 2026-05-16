# TN-GridSense — Full Idea Document

**Distributed Smart Pole Telemetry & Predictive Fault Management System**

*A State-Scale Platform for Tamil Nadu Electricity Board (TNEB)*

*Version 2.0 — Updated March 2026 with Production Upgrade Roadmap*

---

## 1. The Problem

Tamil Nadu's electrical distribution grid is **blind below the feeder level**. Today, utilities have no idea what's happening at each individual distribution pole until something breaks.

### 1.1 The Numbers

| Issue | Scale |
|-------|-------|
| Evening peak deficit | Up to **5,000 MW** |
| Transformer overload hours | Daily **6–10 PM** peak |
| AT&C losses (national average) | **~20%** of generated power |
| Transformer failures per year | Thousands of units at **₹3–8 lakhs each** |
| Maintenance response model | **Reactive** — fix after failure |

### 1.2 Root Causes

1. **No granular visibility** — Monitoring stops at the feeder level. Individual pole conditions are unknown.
2. **Reactive maintenance** — Field crews are dispatched *after* a failure is reported, not before.
3. **Invisible losses** — AT&C (Aggregate Technical & Commercial) losses from theft and line inefficiency are only discovered during quarterly audits.
4. **Night-time restrictions** — Maintenance work on live lines is restricted after dark, causing delays until the next morning.
5. **Rising renewable variability** — Solar and wind integration creates unpredictable load fluctuations.
6. **High debt burden** — TNEB's financial constraints limit large infrastructure upgrades.

### 1.3 The Fundamental Gap

> The grid lacks **real-time, pole-level visibility**.
> Failures are reactive. Maintenance is manual. Losses are invisible until audited. The system is flying blind.

---

## 2. The Idea

### 2.1 Core Concept

Deploy an intelligent edge monitoring node on **every distribution pole** across Tamil Nadu. Each node senses, protects, transmits, and predicts — transforming a passive wooden pole into an active grid intelligence unit.

### 2.2 What Each Pole Becomes

| Role | What It Does |
|------|-------------|
| **Real-time sensor** | Continuously measures voltage, current, and transformer temperature |
| **Local protection unit** | Automatically trips a relay to disconnect the load on critical fault |
| **Telemetry transmitter** | Sends structured data to the cloud every 5 seconds via WiFi or LoRa |
| **Predictive maintenance source** | Computes a Health Score and predicts time-to-failure |
| **Grid intelligence node** | Feeds state-scale analytics, AT&C loss detection, and AI diagnostics |

### 2.3 The One-Line Pitch

> **Instead of waiting for failures, TN-GridSense detects and predicts them — at every single pole across the state.**

---

## 3. System Architecture

TN-GridSense is a five-layer system:

```
┌─────────────────────────────────────────────────┐
│  LAYER 1 — EDGE (Smart Pole Hardware)           │
│  ESP32 + Sensors + LoRa + Relay + OLED          │
└──────────────────┬──────────────────────────────┘
                   │ WiFi HTTP POST / LoRa 433 MHz
┌──────────────────▼──────────────────────────────┐
│  LAYER 2 — COMMUNICATION                        │
│  Urban: WiFi/4G → Cloud Direct                  │
│  Rural: LoRa → Regional Gateway → Cloud         │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│  LAYER 3 — BACKEND (Bun + Elysia)              │
│  Telemetry Ingestion → In-Memory Store          │
│  → Analytics Engine → WebSocket Broadcast       │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│  LAYER 4 — AI & ANALYTICS                       │
│  Grid Copilot · NL2SQL · Anomaly Detection      │
│  Predictive Maintenance · AT&C Loss · APFC      │
│  Automated Dispatch + Work Order Generation     │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│  LAYER 5 — DASHBOARD (Next.js + Leaflet)        │
│  State Map → District Drill-Down → Pole View    │
│  Fault Feed · Maintenance · AI Copilot Chat     │
└─────────────────────────────────────────────────┘
```

---

## 4. Layer 1 — Edge Hardware (Smart Pole Node)

Each pole carries a compact, weatherproof sensor unit built around the ESP32 microcontroller.

### 4.1 Hardware Bill of Materials (Per Pole)

| Component | Model | Purpose |
|-----------|-------|---------|
| Microcontroller | **ESP32 Dev Board** | Main brain — WiFi, BLE, dual-core |
| ADC | **ADS1115 (16-bit)** | High-precision analog measurement |
| Voltage Sensor | **AC Voltage Divider** | Mains voltage sensing (230V) |
| Current Sensor | **ACS712 (30A)** | AC line current measurement |
| DC Monitor | **INA219** | DC bus voltage/current |
| Temperature | **MAX6675 + K-type Probe** | Transformer core temperature |
| Radio | **LoRa SX1278 (433 MHz)** | Long-range rural communication |
| Display | **OLED 0.96" SSD1306** | Local status readout |
| Protection | **5V Relay Module** | Automatic fault disconnection |

### 4.2 What the Firmware Does

The 838-line Arduino firmware runs a continuous loop:

1. **Read all sensors** — voltage (200-sample RMS), current (200-sample RMS), temperature, DC bus
2. **Evaluate faults** — check against 10 threshold conditions (overvoltage, undervoltage, overload, overheat, multi-fault)
3. **Trip relay** if critical fault detected — automatic load disconnection
4. **Compute Health Score** — weighted composite: Temperature (35%), Voltage (25%), Current (20%), Event History (20%)
5. **Assemble telemetry packet** — structured JSON with all readings + pole identity + timestamp
6. **Send via WiFi** (HTTP POST) and **broadcast via LoRa**
7. **Buffer locally** if network is down (up to 100 packets in SPIFFS flash)
8. **Update OLED display** — live voltage, current, temp, status, health
9. **Sync NTP** — maintain accurate IST timestamps
10. **Accept OTA updates** — over-the-air firmware upgrades without physical access

### 4.3 Fault Detection Thresholds (Indian Standard — 230V)

| Condition | Warning | Critical |
|-----------|---------|----------|
| **Overvoltage** | > 248V (+8%) | > 253V (+10%) |
| **Undervoltage** | < 212V (−8%) | < 207V (−10%) |
| **Overload** | > 25A | > 28A |
| **Overheat** | > 65°C | > 80°C / 95°C emergency |

### 4.4 Telemetry Packet (sent every 5 seconds)

```
{
  "poleId": "POLE-001",
  "feederId": "FDR-CHN-01",
  "districtId": "CHENNAI",
  "timestamp": "2026-03-03T21:45:00+05:30",
  "voltage": 231.4,
  "current": 12.7,
  "temperature": 58.2,
  "power": 2938.8,
  "healthScore": 87.5,
  "relayState": true,
  "status": "NORMAL",
  "signal": -42,
  "powerFactor": 0.92,
  "degradationRatio": 0.15,
  "predictedTTF": 180
}
```

---

## 5. Layer 2 — Communication

A hybrid model ensures coverage across all terrain types:

| Environment | Technology | Path | Range |
|-------------|-----------|------|-------|
| **Urban** | WiFi / 4G | Pole → Cloud directly | LAN/Internet |
| **Rural** | LoRa (433 MHz) | Pole → Regional Gateway → Cloud | 10+ km |

- All transmissions carry authentication tokens
- Data is buffered locally during network outages
- NTP time synchronization ensures accurate timestamps

---

## 6. Layer 3 — Backend (Cloud Processing)

Built on **Bun + Elysia** for extreme performance and low latency.

### 6.1 Processing Pipeline

```
Incoming Telemetry → Validate & Parse → Ingest to Store → Fault Detection
                                                ↓
                                    ┌───────────┴───────────┐
                                    │                       │
                              Aggregate Data          Analytics Engine
                              (Feeders, Districts)    (Anomaly, Maintenance,
                                                       AT&C Loss, AI)
                                    │                       │
                                    └───────────┬───────────┘
                                                ↓
                                        WebSocket Broadcast
                                        → All Connected Dashboards
```

### 6.2 Key Capabilities

| Capability | Description |
|-----------|-------------|
| **Telemetry Ingestion** | Accepts concurrent POST packets from all poles |
| **In-Memory Store** | Sub-millisecond read/write with rolling history buffers |
| **Feeder Aggregation** | Computes feeder-level totals (load, health, voltage, AT&C loss) |
| **District Aggregation** | Rolls up feeder data into 38 district summaries |
| **System Stats** | Real-time KPIs: total poles, faults, overheats, load, health |
| **16 REST Endpoints** | Complete API for all data access |
| **WebSocket Push** | Real-time broadcast to all connected clients |

### 6.3 Production Architecture (Upgrade Roadmap)

The prototype in-memory store is designed to scale into a production-grade architecture:

| Component | Prototype | Production Target |
|-----------|-----------|------------------|
| **Data Store** | In-memory Map | TimescaleDB / QuestDB time-series database |
| **Message Queue** | Direct WebSocket | Kafka / NATS / MQTT broker with store-and-forward |
| **Retention** | Session-only | 5+ years historical with automated retention policies |
| **Partitioning** | Single process | District/zone-based sharding |
| **Audit Trail** | None | Full event sourcing for regulatory compliance |
| **Access Control** | Open | RBAC with mTLS + per-device certificates |
| **Availability** | Single server | Clustered with automatic failover |
| **API Protection** | None | Rate limiting + abuse detection |

### 6.4 Cybersecurity Architecture

Production deployments implement defence-in-depth:

- **Mutual TLS (mTLS)** between every pole node and the backend
- **Unique per-device X.509 certificates** provisioned during installation
- **Signed OTA firmware** with rollback capability
- **Encryption at rest** for all stored telemetry data
- **Intrusion detection** with anomalous telemetry pattern recognition
- **Hardware tamper alerts** via accelerometer + enclosure switches
- **Immutable audit logging** with cryptographic chain
- **Automated key rotation** (90-day certificate lifecycle)

---

## 7. Layer 4 — AI & Analytics

### 7.1 Anomaly Detection Engine

Real-time classification across 6 dimensions:
- **Voltage deviation** from 230V nominal (5%/8%/10% thresholds)
- **Current overload** detection
- **Temperature anomalies** with rapid-rise detection
- **Power factor degradation** (for industrial nodes)
- **Voltage stability** analysis (standard deviation over history)
- **Multi-fault correlation** for cascading failure detection

### 7.2 Predictive Maintenance

An ML-like scoring system that computes for each pole:
- **Health Score** (0–100%) — weighted composite
- **Risk Level** — LOW / MODERATE / HIGH / CRITICAL
- **Estimated Days to Failure** — based on degradation trajectory
- **Specific Risk Factors** — e.g., "Persistent high-temperature operation detected"
- **Actionable Recommendation** — e.g., "Schedule insulation inspection within 2 weeks"

> This flags high-risk poles **before failure occurs** — converting reactive maintenance into predictive maintenance.

### 7.3 AT&C Loss Detection

For each feeder, the system compares:
- **Input power** (feeder meter) vs. **sum of pole-level loads** (from GridSense nodes)

| Loss % | Classification |
|--------|---------------|
| < 7% | Normal (technical losses) |
| 10–15% | Anomalous — investigate |
| > 15% | **Theft suspected** — dispatch field investigation |

### 7.4 Grid Copilot (AI Diagnostics)

Simulates a local Small Language Model interpreting raw telemetry. Provides natural-language diagnostics:

> *"Warning: APFC Panel Phase Angle critical (0.847). Multiple capacitor banks have failed to engage. Reactive load is uncompensated. Estimated TNEB penalty if unaddressed: ₹12,450."*

> *"Critical Thermal Runaway: Transformer operating at 87°C. Risk of insulation failure is imminent."*

### 7.5 Natural Language Querying (NL2SQL)

Engineers can ask plain-English questions via the AI Query Bar:

- *"Show me all overheating transformers"*
- *"Which poles have low power factor?"*
- *"List all faulted nodes in Chennai"*

The system parses the intent and returns filtered grid data instantly.

### 7.6 Automated Dispatch

One-click generation of structured work orders from any fault event:

```
Work Order: WO-485729
Priority:    CRITICAL
Node:        POLE-CHN-003 | FDR-CHN-01 | CHENNAI
Root Cause:  Thermal Runaway / Core Overheating
Required:    Thermal Camera, Transformer Insulation Oil Tester,
             Standard Lineman Toolkit, Voltage Detector (HV)
Est. Time:   4 hours
Status:      DRAFTED — Awaiting Engineering Approval
```

### 7.8 Advanced Predictive Intelligence (Production Upgrade)

The prototype scoring system upgrades to statistical failure modeling:

| Capability | Method |
|-----------|--------|
| **Failure probability** | Bayesian inference with Weibull survival curves |
| **Load forecasting** | ARIMA short-term + LSTM deep learning (24–48h ahead) |
| **Thermal analytics** | dT/dt (rate of change) detection for runaway events |
| **Baseline learning** | Feeder-level baseline profiles for seasonal adaptation |
| **Theft detection** | Spatial clustering algorithms for loss anomaly zones |
| **Degradation tracking** | Linear regression on rolling health score windows |
| **Confidence scoring** | All predictions carry confidence intervals |

### 7.9 Economic & ROI Engine

Financial modeling integrated directly into the platform:

- **Per-pole cost modeling**: Installation + maintenance + energy cost per node
- **AT&C savings calculator**: Projects ₹ recovered from theft reduction
- **Failure cost projection**: ₹ saved per prevented transformer burnout
- **Dispatch cost modeling**: Crew hours × rate × frequency optimization
- **Payback period calculator**: District-level ROI timeline
- **Financial dashboards**: CFO-ready views with quarterly aggregation
- **Scenario comparison**: Before/after deployment impact modeling

> *Boards approve numbers, not dashboards. Every feature maps to ₹ saved or ₹ recovered.*

### 7.10 Grid Optimization

- **Feeder load balancing**: Recommendations for load redistribution
- **Renewable integration**: Solar/wind variability forecasting
- **Battery placement**: Optimal storage location discovery
- **Demand response simulation**: Peak reduction scenario modeling
- **48-hour peak stress forecasting**: Pre-staging of backup resources

---

## 8. Layer 5 — Dashboard

A three-tier interactive dashboard with real-time WebSocket updates:

### 8.1 Level 1 — State Overview

- **Interactive map** of Tamil Nadu with 38 districts as color-coded health markers
- **5 KPI cards**: Total Poles, Active Poles, Active Faults, Overheat Alerts, Total Load (kW)
- **Live Fault Feed**: Real-time scrolling event stream with severity badges
- **District Health Rankings**: Auto-sorted table — worst health first, with risk badges

### 8.2 Level 2 — District Drill-Down

- **Feeder card grid**: Each feeder shows pole count, load, avg health, AT&C loss, critical poles
- **Load distribution charts**: Time-series visualization
- **Full poles table**: Every pole in the district with drill-down navigation

### 8.3 Level 3 — Pole Inspector

- **Live gauges**: Voltage, Current, Temperature, Power, Health Score
- **24-hour trend charts**: Historical voltage/current and temperature/health trajectories
- **Event log**: All fault events for this specific pole
- **Maintenance panel**: AI-generated risk assessment, ETA to failure, recommended actions
- **Relay state & Signal quality** indicators

### 8.4 Analytics Views

- **Fault Events**: Full-screen historical fault log with AI Auto-Dispatch
- **Predictive Maintenance**: Risk-ranked card grid with health bars and ETA
- **AT&C Loss Analysis**: Feeder-level table with theft detection flags
- **Industrial APFC**: Power factor monitoring with penalty calculations

### 8.5 AI Interface

- **Grid Copilot**: Floating chat panel that streams AI diagnostics for faulted poles
- **AI Query Bar**: Natural language search across the entire grid

### 8.6 Hardware Prototype Mode

- **Web Serial Bridge**: Connect a physical ESP32 to the browser via USB
- **Zero-configuration**: Browser acts as the gateway — no MQTT, no Python scripts
- **Full cloud pipeline**: Data flows through the same backend and dashboard as production
- **Ideal for demos**: Hardware-in-the-loop testing with just a laptop and USB cable

---

## 9. Key Innovations

| Innovation | Why It Matters |
|-----------|----------------|
| **Pole-level granularity** | First system to monitor every individual pole, not just feeders |
| **Edge-based protection** | Relay trips automatically — no cloud dependency for safety |
| **Hybrid communication** | WiFi + LoRa ensures coverage in both urban and rural areas |
| **Predictive, not reactive** | Health scoring predicts failures before they happen |
| **AT&C loss forensics** | Data-driven theft detection from power balance analysis |
| **AI-augmented operations** | Natural language diagnostics and automated work orders |
| **Web Serial bridge** | Browser-to-hardware testing eliminates complex dev toolchains |
| **B2B industrial monitoring** | APFC + power factor penalty tracking for industrial customers |

---

## 10. Impact

### 10.1 Direct Benefits

| Area | Impact |
|------|--------|
| **Outage Duration** | Precise fault localization → minutes instead of hours to restore |
| **Transformer Failures** | Early overheat detection → preventive action before burnout |
| **AT&C Losses** | Data-driven theft identification → revenue recovery |
| **Maintenance Costs** | Predictive scheduling → fewer emergency dispatches |
| **Night-time Delays** | System identifies exact pole + fault type → crews respond precisely the next morning |

### 10.2 Financial Impact

- **1% reduction in AT&C losses** across Tamil Nadu → **hundreds of crores saved annually**
- Reduced transformer replacements (₹3–8 lakhs per unit × thousands of failures)
- Reduced emergency dispatch costs
- Improved billing accuracy for industrial customers (APFC penalties)
- System cost amortizes within **2–3 years**

### 10.3 Strategic Value

- Real-time district-level load data enables **pre-activation of backup generation** before evening peak
- **Battery storage deployment planning** based on actual consumption patterns
- **Evidence-based policy decisions** using granular consumption data
- Foundation for future **smart city integration** and **demand response systems**

---

## 11. Scalability Roadmap

| Phase | Scale | Scope | Timeline |
|-------|-------|-------|----------|
| **Phase 1** | 1,000 poles | Pilot in one district (Chennai) | Q1 — Months 1–3 |
| **Phase 2** | 10,000 poles | Regional rollout across 5 districts | Q2 — Months 4–6 |
| **Phase 3** | 100,000+ poles | Full state-wide deployment | Q3–Q4 — Months 7–12 |
| **Phase 4** | — | AI-driven grid optimization + demand response | Year 2 |
| **Phase 5** | — | Multi-state expansion (Karnataka, Kerala, AP, Telangana) | Year 3+ |

### 11.2 Production Upgrade Phases

| Phase | Duration | Focus Areas |
|-------|----------|-------------|
| **Phase 1: Foundation** | Months 1–3 | Communication reliability, TimescaleDB backend, mTLS security, observability stack |
| **Phase 2: Intelligence** | Months 4–6 | Predictive analytics upgrade, economic ROI engine, grid optimization algorithms |
| **Phase 3: Enterprise** | Months 7–9 | Regulatory compliance mapping, audit trail, RBAC, deployment SOPs |
| **Phase 4: Scale** | Months 10–12 | 10K+ pole simulation, chaos testing, disaster recovery, executive dashboards |

---

## 12. What Makes This Different

This is **not** just a smart meter or data logger.

It is **edge-based protection + real-time telemetry + AI-driven predictive intelligence** integrated into one cohesive system.

| Traditional Grid Monitoring | TN-GridSense |
|---------------------------|-------------|
| Feeder-level only | **Pole-level** granularity |
| Manual fault reporting | **Automatic** fault detection + relay trip |
| Periodic audits for losses | **Real-time** AT&C loss tracking |
| Reactive maintenance | **Predictive** maintenance with ETA |
| No AI assistance | **Grid Copilot** + NL2SQL + Auto-Dispatch |
| Complex hardware testing | **Web Serial** browser-to-ESP32 bridge |
| Utility-only | **B2B industrial** APFC monitoring |

---

## 13. Long-Term Vision

- **Smart city integration** — street lighting control, EV charging coordination
- **Transformer asset lifecycle management** — cradle-to-grave tracking
- **Demand response systems** — dynamic load pricing based on real-time capacity
- **State-level energy intelligence network** — unified grid optimization platform
- **TinyML on edge** — run predictive models directly on the ESP32 for zero-latency decisions
- **Multi-state federation** — expand beyond Tamil Nadu to Karnataka, Kerala, AP, Telangana, and pan-India
- **Regulatory compliance** — CEA/IEGC standard mapping, automated audit exports
- **Digital twin** — complete virtual representation of the physical grid for simulation and planning

---

## 14. Regulatory & Deployment Readiness

| Domain | Deliverable |
|--------|------------|
| **Indian Standards Compliance** | CEA/IEGC threshold mapping for all alerting rules |
| **Documentation Package** | IS 732, IEEE 1547 compliance matrices |
| **Installation SOPs** | Step-by-step pole mounting, sensor calibration, commissioning |
| **Operational Lifecycle** | Temperature alerts → Work Order → Resolution → Audit trail |
| **Data Governance** | Retention policies, access controls, anonymization rules |
| **Audit Export** | One-click regulatory report generation in PDF/CSV |

---

> *TN-GridSense is realistic, technically grounded, and scalable. It does not claim to generate power — it optimizes and protects distribution. That is exactly where utilities struggle today.*

> *Phase 1 bug fixes completed. Zero TypeScript errors. Zero runtime crashes. Clean production build. All 8 dashboard pages verified operational.*

---

*TN-GridSense | March 2026 | v2.0*

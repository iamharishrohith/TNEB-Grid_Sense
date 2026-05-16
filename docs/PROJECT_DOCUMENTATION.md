# TN-GridSense — Full Project Documentation

**Distributed Smart Pole Telemetry & Predictive Fault Management System**
A state-scale IoT platform for monitoring Tamil Nadu's electrical distribution grid at pole-level granularity.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Project Structure](#4-project-structure)
5. [Firmware (Edge Layer)](#5-firmware-edge-layer)
6. [Backend](#6-backend)
7. [Frontend (Next.js Dashboard)](#7-frontend-nextjs-dashboard)
8. [Legacy Dashboard (Static HTML)](#8-legacy-dashboard-static-html)
9. [API Reference](#9-api-reference)
10. [Data Models & Type Definitions](#10-data-models--type-definitions)
11. [AI & Analytics Features](#11-ai--analytics-features)
12. [Real-Time Communication](#12-real-time-communication)
13. [Hardware Specification](#13-hardware-specification)
14. [Getting Started](#14-getting-started)
15. [Existing Documentation](#15-existing-documentation)

---

## 1. Project Overview

TN-GridSense is a full-stack IoT system designed for **Tamil Nadu Electricity Board (TNEB)** to enable pole-level real-time monitoring, fault detection, predictive maintenance, and AT&C loss analysis across the entire state distribution grid.

### Core Problem Addressed
- No pole-level granularity in grid monitoring — utilities only monitor at feeder level
- Reactive maintenance causes extended outages
- AT&C (Aggregate Technical & Commercial) losses from theft and technical inefficiency are invisible until audited
- Evening peak deficits of up to 5,000 MW in Tamil Nadu

### What Each Pole Becomes
| Function | Capability |
|----------|-----------|
| **Real-time sensor** | Voltage, current, temperature monitoring |
| **Local protection unit** | Automatic relay trip on fault detection |
| **Telemetry device** | Continuous data transmission to cloud |
| **Predictive maintenance source** | Health scoring and failure prediction |

---

## 2. Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  EDGE LAYER (Smart Pole)                                         │
│  ESP32 + ADS1115 + ACS712 + INA219 + MAX6675 + LoRa + Relay    │
│  → Reads voltage, current, temperature                          │
│  → Detects faults, trips relay                                  │
│  → Sends telemetry via WiFi + LoRa                              │
└─────────────────────┬────────────────────────────────────────────┘
                      │ HTTP POST / LoRa
┌─────────────────────▼────────────────────────────────────────────┐
│  BACKEND (Bun + Elysia)                                          │
│  → Telemetry ingestion API        → Anomaly detection engine     │
│  → In-memory time-series store    → Predictive maintenance       │
│  → AT&C loss estimation           → AI Grid Copilot              │
│  → WebSocket real-time broadcast  → NL2SQL query parser          │
└─────────────────────┬────────────────────────────────────────────┘
                      │ REST API + WebSocket
┌─────────────────────▼────────────────────────────────────────────┐
│  FRONTEND (Next.js 16 + React 19)                                │
│  → State Overview (TN map + KPIs)  → District drill-down         │
│  → Pole Inspector (live metrics)   → Fault Events log            │
│  → Predictive Maintenance view     → AT&C Loss analysis          │
│  → Industrial APFC panel           → Web Serial Prototype bridge │
│  → Grid Copilot AI chat            → Natural Language query bar  │
└──────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **ESP32 nodes** read sensors (voltage, current, temperature) every 1 second
2. **Telemetry packets** are assembled and sent via HTTP POST every 5 seconds
3. **Backend** ingests packets, updates in-memory store, runs analytics
4. **WebSocket** broadcasts updates to all connected dashboard clients
5. **Frontend** renders live KPIs, maps, charts, and event feeds in real-time

---

## 3. Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Firmware** | Arduino C++ (ESP32) | Sensor reading, fault detection, telemetry assembly |
| **Backend Runtime** | [Bun](https://bun.sh/) v1.0+ | High-performance JavaScript runtime |
| **Backend Framework** | [Elysia](https://elysiajs.com/) v1.2 | REST API + WebSocket server |
| **Frontend Framework** | [Next.js](https://nextjs.org/) 16.1 | React-based SSR/SSG web framework |
| **Frontend State** | [Zustand](https://zustand.docs.pmnd.rs/) v5 | Lightweight global state management |
| **Mapping** | [Leaflet](https://leafletjs.com/) + react-leaflet | Interactive Tamil Nadu district map |
| **Charts** | [Chart.js](https://www.chartjs.org/) + react-chartjs-2 | Time-series visualization |
| **Icons** | [Lucide React](https://lucide.dev/) | SVG icon library |
| **Fonts** | Inter, JetBrains Mono, Rajdhani | Google Fonts via Next.js |
| **CSS** | Vanilla CSS with design tokens | Full custom design system |
| **Legacy Dashboard** | HTML + CSS + JS + Chart.js | Static SPA (original version) |

---

## 4. Project Structure

```
TNEB-GridSense/
├── README.md                          # Project overview
│
├── firmware/                          # ESP32 Arduino firmware
│   └── pole_node/
│       ├── config.h                   # Pin assignments, thresholds, calibration
│       └── pole_node.ino             # Main firmware (838 lines)
│
├── backend/                           # Bun + Elysia backend
│   ├── package.json                   # Dependencies: elysia, @elysiajs/cors, @elysiajs/static
│   ├── data/                          # Data directory
│   └── src/
│       ├── index.ts                   # Server entry — REST API + WebSocket (267 lines)
│       ├── store.ts                   # In-memory data store + aggregation (438 lines)
│       ├── analytics.ts              # Anomaly detection + predictive maintenance (231 lines)
│       ├── ai.ts                      # Grid Copilot + NL2SQL + Work Order generator (121 lines)
│       ├── simulator.ts              # 50-pole data simulator across 38 districts (286 lines)
│       └── types.ts                   # TypeScript type definitions (123 lines)
│
├── frontend/                          # Next.js 16 dashboard
│   ├── package.json                   # Dependencies: next, react, zustand, leaflet, chart.js, lucide-react
│   ├── public/                        # Static assets (SVGs)
│   └── src/
│       ├── app/
│       │   ├── layout.tsx            # Root layout — Sidebar + GridCopilot + SocketProvider
│       │   ├── page.tsx              # State Overview — map, KPIs, event feed, district table
│       │   ├── globals.css           # Full design system + page styles (36KB)
│       │   ├── district/[id]/page.tsx # District drill-down — feeders, charts, poles table
│       │   ├── pole/[id]/page.tsx    # Pole Inspector — live gauges, trend charts, events
│       │   ├── events/page.tsx       # Fault Events — full-screen event log
│       │   ├── maintenance/page.tsx  # Predictive Maintenance — risk-ranked card grid
│       │   ├── atc-loss/page.tsx     # AT&C Loss — feeder-level analysis table
│       │   ├── apfc/page.tsx         # Industrial APFC — power factor panel (B2B)
│       │   └── prototype/page.tsx    # Web Serial prototype — hardware bridge
│       ├── components/
│       │   ├── Sidebar.tsx           # Navigation sidebar with connection indicator
│       │   ├── TopBar.tsx            # Breadcrumbs, AI query bar, state selector, clock
│       │   ├── TNMap.tsx             # Leaflet map of Tamil Nadu's 38 districts
│       │   ├── KPIGrid.tsx           # System-wide KPI cards
│       │   ├── DistrictTable.tsx     # Auto-sorted district health ranking table
│       │   ├── EventFeed.tsx         # Live fault event feed with dispatch capability
│       │   ├── GridCopilot.tsx       # AI diagnostic overlay panel
│       │   ├── AIQueryBar.tsx        # Natural language query input bar
│       │   └── SocketProvider.tsx    # WebSocket connection manager with auto-reconnect
│       ├── lib/
│       │   └── api.ts               # Centralized API_BASE and WS_URL configuration
│       └── store/
│           └── gridStore.ts          # Zustand store — stats, poles, alerts, connectionStatus
│
├── dashboard/                         # Legacy static HTML dashboard
│   ├── index.html                     # Main HTML shell (326 lines)
│   ├── css/
│   │   ├── design-system.css         # Design tokens + components
│   │   └── dashboard.css             # Page-specific styles
│   └── js/
│       ├── app.js                    # Main controller (routing, WebSocket)
│       ├── charts.js                 # Chart.js wrapper
│       ├── state-view.js            # Level 1 — State overview
│       ├── district-view.js         # Level 2 — District drill-down
│       └── pole-view.js             # Level 3 — Pole inspector
│
└── docs/
    ├── PROPOSAL.md                    # Technical proposal document
    ├── ARCHITECTURE.md               # System architecture diagrams
    └── WEB_SERIAL_PROTOTYPE.md       # Hardware bridge documentation
```

---

## 5. Firmware (Edge Layer)

### File: [config.h](file:///d:/TNEB-GridSense/firmware/pole_node/config.h)

All tunable parameters for each pole deployment. Key sections:

| Section | Parameters |
|---------|-----------|
| **Pole Identity** | `POLE_ID`, `FEEDER_ID`, `DISTRICT_ID` |
| **WiFi** | SSID, password |
| **Backend** | URL, API endpoint, auth token |
| **Pin Assignments** | I2C (SDA=21, SCL=22), SPI (LoRa), GPIO (Relay=27, Thermocouple) |
| **Sensor Calibration** | Voltage scale (113.14), ACS712 sensitivity (0.066 V/A), sample counts |
| **Fault Thresholds** | Voltage: 230V ±10%, Current: 25A overload / 28A critical, Temperature: 65°C warn / 80°C overheat / 95°C critical |
| **Timing** | Telemetry: 5s, Sensor read: 1s, Display: 2s, NTP sync: 1hr |
| **Health Scoring** | Weights: Temp=0.35, Voltage=0.25, Current=0.20, Events=0.20 |
| **LoRa** | 433 MHz, 125 kHz bandwidth, SF7, 17 dBm TX power |
| **OTA** | Hostname and password for over-the-air updates |

### File: [pole_node.ino](file:///d:/TNEB-GridSense/firmware/pole_node/pole_node.ino) (838 lines)

Complete firmware with the following function groups:

#### Initialization Functions
| Function | Purpose |
|----------|---------|
| `setup()` | Master init — calls all sub-initializers |
| `initADS1115()` | Initialize 16-bit ADC for voltage/current |
| `initINA219()` | Initialize DC bus monitor |
| `initOLED()` | Initialize 0.96" OLED display |
| `initLoRa()` | Initialize SX1278 LoRa radio at 433 MHz |
| `initWiFi()` | Connect to WiFi with retry logic |
| `initNTP()` | Synchronize time via NTP (IST) |
| `initOTA()` | Setup ArduinoOTA update server |

#### Sensor Reading Functions
| Function | Purpose |
|----------|---------|
| `readAllSensors()` | Orchestrator — reads all sensor channels |
| `readACVoltage()` | RMS voltage measurement via ADS1115 (200 samples) |
| `readACCurrent()` | RMS current via ACS712 + ADS1115 (200 samples) |
| `readTemperature()` | Transformer temp via MAX6675 thermocouple |
| `readDCBus()` | DC voltage/current via INA219 |

#### Fault Detection & Protection
| Function | Purpose |
|----------|---------|
| `evaluateFaults()` | Multi-threshold fault classification (voltage, current, temperature) |
| `tripRelay(reason)` | Open relay to disconnect load on critical fault |
| `resetRelay()` | Re-engage relay after fault clears |
| `setRelay(on)` | Low-level relay GPIO control |

#### Health & Telemetry
| Function | Purpose |
|----------|---------|
| `computeHealthScore()` | Weighted composite (temp=35%, voltage=25%, current=20%, events=20%) |
| `assembleTelemetryPacket()` | Build structured telemetry packet |
| `packetToJSON(pkt)` | Serialize to JSON |
| `sendTelemetry()` | Send via HTTP + LoRa |
| `sendHTTP(json)` | HTTP POST to backend |
| `sendLoRa(json)` | LoRa broadcast |

#### Data Integrity
| Function | Purpose |
|----------|---------|
| `bufferPacket(pkt)` | Store unsent packets locally (100 max) |
| `flushBuffer()` | Retry sending buffered packets |
| `syncNTP()` | Re-synchronize time hourly |
| `reconnectWiFi()` | Auto-reconnect on WiFi loss |

#### Display
| Function | Purpose |
|----------|---------|
| `updateDisplay()` | Render voltage, current, temp, status, health on OLED |

### Data Structures

```cpp
struct SensorData {
    float acVoltage;    // AC mains voltage (V)
    float acCurrent;    // AC line current (A)
    float temperature;  // Transformer temperature (°C)
    float dcVoltage;    // DC bus voltage (V)
    float dcCurrent;    // DC bus current (mA)
    float power;        // AC active power estimate (W)
    float healthScore;  // 0.0 – 100.0
    bool  relayState;   // true = ON (line connected)
    FaultStatus status;
    int   loraRSSI;     // Last LoRa signal strength
    int   wifiRSSI;     // WiFi signal strength
};

enum FaultStatus {
    STATUS_NORMAL, STATUS_VOLT_HIGH_WARN, STATUS_VOLT_HIGH_FAULT,
    STATUS_VOLT_LOW_WARN, STATUS_VOLT_LOW_FAULT, STATUS_OVERLOAD,
    STATUS_OVERLOAD_CRITICAL, STATUS_OVERHEAT, STATUS_OVERHEAT_CRITICAL,
    STATUS_MULTI_FAULT
};
```

---

## 6. Backend

### Runtime & Framework
- **Runtime**: Bun (high-performance JavaScript runtime)
- **Framework**: Elysia v1.2 with CORS and static file plugins
- **Port**: 3000 (configurable)

### Source Files

#### [index.ts](file:///d:/TNEB-GridSense/backend/src/index.ts) — Server Entry (267 lines)
The main Elysia server defining all REST endpoints and WebSocket handling.

**Key Responsibilities:**
- CORS-enabled REST API with 16 endpoints
- WebSocket pub/sub on `/ws` with topic-based messaging (`tn/telemetry`, `tn/alerts`)
- Telemetry ingestion with automatic fault event creation and WebSocket broadcast
- Static file serving for the legacy dashboard

#### [store.ts](file:///d:/TNEB-GridSense/backend/src/store.ts) — Data Store (438 lines)
In-memory data store with aggregation capabilities.

**Key Functions:**

| Function | Purpose |
|----------|---------|
| `ingestTelemetry(packet)` | Process incoming telemetry → update pole state, push to history ring buffer |
| `createFaultEvent(packet)` | Detect fault conditions → generate timestamped event |
| `getSeverity(status)` | Classify fault severity: WARNING / FAULT / CRITICAL |
| `healthToRisk(health)` | Map health score → risk level: LOW / MODERATE / HIGH / CRITICAL |
| `getPole(id)` | Retrieve single pole with full history |
| `getAllPoles()` | List all known poles |
| `getRecentEvents(limit)` | Get last N fault events (default 50) |
| `getFeederSummary(id)` | Aggregate poles into feeder-level metrics |
| `getAllFeeders()` | Compute all feeder summaries |
| `computeFeederSummary(...)` | Calculate feeder load, health, voltage, AT&C loss, critical poles |
| `getDistrictSummary(id)` | Aggregate feeders into district-level metrics |
| `getAllDistricts()` | Compute all district summaries |
| `computeDistrictSummary(...)` | Calculate district stats including risk classification |
| `getSystemStats()` | System-wide KPIs (total poles, faults, load, avg health, etc.) |
| `addWSSubscriber(ws)` | Register WebSocket client |
| `removeWSSubscriber(ws)` | Unregister WebSocket client |
| `broadcastUpdate(data)` | Push update to all connected clients |

**Data Storage:**
- `poles`: `Map<string, PoleData>` — keyed by pole ID
- `events`: `FaultEvent[]` — fault event log
- Each pole stores a rolling history ring buffer of telemetry packets

#### [analytics.ts](file:///d:/TNEB-GridSense/backend/src/analytics.ts) — Analytics Engine (231 lines)

Three analytical capabilities:

**1. Anomaly Detection** (`detectAnomalies`)
- Voltage deviation from 230V nominal (>5% = INFO, >8% = WARNING, >10% = CRITICAL)
- Current overload (>25A WARNING, >28A CRITICAL)
- Temperature anomalies (>65°C WARNING, >80°C CRITICAL)
- Rapid temperature rise detection
- Power factor degradation (if APFC data present)
- Standard deviation analysis on voltage history

**2. Predictive Maintenance** (`predictMaintenance`)
- Weighted health scoring from: temperature trends, overload events, voltage stability, overall health
- Risk classification: LOW (>80), MODERATE (60-80), HIGH (40-60), CRITICAL (<40)
- Estimated days to failure calculation
- Specific factor analysis (e.g., "Persistent high-temperature operation detected")
- Actionable maintenance recommendations per pole

**3. AT&C Loss Estimation** (`estimateATCLoss`)
- Compares feeder input power (sum + 10% margin) vs measured pole loads
- Calculates loss percentage per feeder
- Flags anomalous feeders (>10% loss) and possible theft (>15% loss)

#### [ai.ts](file:///d:/TNEB-GridSense/backend/src/ai.ts) — AI Module (121 lines)

Simulates AI/SLM capabilities:

| Function | Purpose |
|----------|---------|
| `generateDiagnostics(pole)` | Grid Copilot — generates natural-language diagnostics for a pole (APFC penalties, thermal runaway, overload, health degradation) |
| `queryGridAgent(prompt)` | NL2SQL — parses natural language queries to filter grid data (power factor, temperature, load, faults) |
| `generateWorkOrder(poleId)` | Automated Dispatch — creates structured work orders with priority, required tools, estimated hours, root cause hypothesis |

#### [simulator.ts](file:///d:/TNEB-GridSense/backend/src/simulator.ts) — Data Simulator (286 lines)

Generates realistic telemetry for demo/testing:

- Configures all **38 Tamil Nadu districts** grouped into 4 zones (North, East, West, South)
- Each district has 2-4 feeders, each feeder has 2-5 poles
- Generates ~50+ simulated poles with:
  - Time-of-day load profiles (peak multipliers at different hours)
  - Random fault injection (overvoltage, undervoltage, overload, overheat)
  - Degradation simulation (aging transformers)
  - APFC telemetry for industrial nodes (power factor, capacitor steps)
  - Predictive degradation ratios and TTF estimates
- Sends batches to backend via HTTP POST at configurable intervals

#### [types.ts](file:///d:/TNEB-GridSense/backend/src/types.ts) — Type Definitions (123 lines)

See [Section 10](#10-data-models--type-definitions) for full type details.

---

## 7. Frontend (Next.js Dashboard)

### Architecture
- **Framework**: Next.js 16.1 with App Router
- **UI**: React 19 with client-side rendering (`'use client'` directives)
- **State**: Zustand store for global state (stats, poles, alerts, connection status)
- **Real-time**: WebSocket via `SocketProvider` component with auto-reconnect
- **Styling**: Custom CSS design system (36KB `globals.css`)

### Layout ([layout.tsx](file:///d:/TNEB-GridSense/frontend/src/app/layout.tsx))
```
┌──────────────────────────────────────────────┐
│  SocketProvider (WebSocket connection)         │
│  ┌──────┐ ┌─────────────────────────────────┐ │
│  │Sidebar│ │ main-content                    │ │
│  │      │ │   {children} ← page routes      │ │
│  │      │ │                                  │ │
│  └──────┘ └─────────────────────────────────┘ │
│  GridCopilot (floating AI panel)              │
└──────────────────────────────────────────────┘
```

### Pages

#### 1. State Overview — `/` ([page.tsx](file:///d:/TNEB-GridSense/frontend/src/app/page.tsx))
The main dashboard landing page:
- **KPI Grid**: Total Poles, Active Poles, Active Faults, Overheat Alerts, Total Load
- **Tamil Nadu Map**: Interactive Leaflet map with 38 districts as color-coded circle markers (health-based: green/amber/red). Click to drill-down.
- **Live Fault Feed**: Real-time scrolling event stream with severity badges and dispatch capability
- **District Health Rankings**: Auto-sorted table (worst health first) with Risk Level badges

#### 2. District View — `/district/[id]` ([page.tsx](file:///d:/TNEB-GridSense/frontend/src/app/district/[id]/page.tsx))
Detailed district drill-down:
- Feeder-level card grid showing load, health, AT&C loss, critical pole count
- Load distribution chart (Chart.js line)
- Health circle visualization
- Full poles table with clickable drill-down to Pole Inspector

#### 3. Pole Inspector — `/pole/[id]` ([page.tsx](file:///d:/TNEB-GridSense/frontend/src/app/pole/[id]/page.tsx))
Individual pole deep-dive:
- Live gauges: Voltage, Current, Temperature, Health Score, Power
- Status badge and relay state indicator
- 24-hour trend charts (voltage/current history, temperature/health history)
- Event log specific to this pole
- Maintenance recommendation with risk factors and estimated TTF

#### 4. Fault Events — `/events` ([page.tsx](file:///d:/TNEB-GridSense/frontend/src/app/events/page.tsx))
Full-screen fault event viewer with:
- System Fault Log header with live stream badge
- Scrollable EventFeed component with timestamp, pole ID, severity, details
- Auto-Dispatch button for generating AI work orders

#### 5. Predictive Maintenance — `/maintenance` ([page.tsx](file:///d:/TNEB-GridSense/frontend/src/app/maintenance/page.tsx))
AI-powered maintenance intelligence:
- Risk-ranked card grid (top 30 poles)
- Each card shows: Pole ID, ETA to failure, risk badge, recommendation text, health bar
- Click to navigate to pole inspector

#### 6. AT&C Loss Analysis — `/atc-loss` ([page.tsx](file:///d:/TNEB-GridSense/frontend/src/app/atc-loss/page.tsx))
Feeder-level power tracking:
- Table columns: Feeder ID, Input Power, Billed Load, Loss Delta, Loss %, Status Analysis
- Color-coded loss percentage (green/amber/red)
- Status tags: NORMAL, ANOMALOUS, ⚠ THEFT SUSPECTED

#### 7. Industrial APFC — `/apfc` ([page.tsx](file:///d:/TNEB-GridSense/frontend/src/app/apfc/page.tsx))
B2B industrial power factor monitoring:
- Power factor gauges and penalty calculations
- Capacitor bank step visualization (8 banks)
- TNEB penalty estimation (₹/kVAr based on PF deviation from 0.90 threshold)
- Real-time reactive power monitoring

#### 8. Hardware Prototype — `/prototype` ([page.tsx](file:///d:/TNEB-GridSense/frontend/src/app/prototype/page.tsx))
Web Serial bridge for hardware testing:
- Auto-detect and connect to ESP32 via USB
- Real-time serial data parsing and visualization
- Live voltage, current, temperature display
- Raw serial monitor log
- Automatic injection into backend pipeline

### Components

| Component | File | Purpose |
|-----------|------|---------|
| **Sidebar** | [Sidebar.tsx](file:///d:/TNEB-GridSense/frontend/src/components/Sidebar.tsx) | Navigation with sections (Monitoring, Analytics, B2B Industrial), connection status indicator with pulse animation |
| **TopBar** | [TopBar.tsx](file:///d:/TNEB-GridSense/frontend/src/components/TopBar.tsx) | Page title, breadcrumbs, AI query bar, state selector dropdown, IST live clock |
| **TNMap** | [TNMap.tsx](file:///d:/TNEB-GridSense/frontend/src/components/TNMap.tsx) | Leaflet map centered on TN (10.85, 78.48) with 38 district coordinates, health-colored circle markers, click-to-drill-down popups |
| **KPIGrid** | [KPIGrid.tsx](file:///d:/TNEB-GridSense/frontend/src/components/KPIGrid.tsx) | 5 KPI cards with icons from Lucide React, animated entrance |
| **DistrictTable** | [DistrictTable.tsx](file:///d:/TNEB-GridSense/frontend/src/components/DistrictTable.tsx) | Auto-refreshing table (5s polling), sorted by worst health first |
| **EventFeed** | [EventFeed.tsx](file:///d:/TNEB-GridSense/frontend/src/components/EventFeed.tsx) | Real-time fault event feed with severity badges, timestamps, and one-click AI Auto-Dispatch (work order generation) |
| **GridCopilot** | [GridCopilot.tsx](file:///d:/TNEB-GridSense/frontend/src/components/GridCopilot.tsx) | Floating AI diagnostic panel — streams diagnostics for faulted poles, color-coded by severity, auto-fetches on alert |
| **AIQueryBar** | [AIQueryBar.tsx](file:///d:/TNEB-GridSense/frontend/src/components/AIQueryBar.tsx) | Natural language search bar — asks queries like "show overheating transformers", returns filtered grid data |
| **SocketProvider** | [SocketProvider.tsx](file:///d:/TNEB-GridSense/frontend/src/components/SocketProvider.tsx) | WebSocket connection with exponential backoff reconnect (up to 10 retries), parses init/stats/telemetry/alert messages |

### State Management ([gridStore.ts](file:///d:/TNEB-GridSense/frontend/src/store/gridStore.ts))

Zustand store with:
- `stats: BoxStats | null` — system-wide KPIs
- `poles: Record<string, PoleData>` — individual pole data cache
- `alerts: AlertData[]` — last 100 alerts (FIFO)
- `connectionStatus` — 'connecting' | 'connected' | 'disconnected'

### API Configuration ([api.ts](file:///d:/TNEB-GridSense/frontend/src/lib/api.ts))
- `API_BASE`: `http://{hostname}:3000` (auto-detects host)
- `WS_URL`: `ws://{hostname}:3000/ws`

---

## 8. Legacy Dashboard (Static HTML)

A standalone SPA at [dashboard/index.html](file:///d:/TNEB-GridSense/dashboard/index.html) using plain HTML + CSS + JavaScript + Chart.js.

Features the same views as the Next.js dashboard but implemented as a single-page application with view panel toggling:
- State View, District View, Pole View, Events View, Maintenance View, AT&C Loss View
- WebSocket connection with status indicator
- Design system with CSS custom properties

---

## 9. API Reference

### Base URL: `http://localhost:3000`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Server health check — returns version, uptime, timestamp |
| `POST` | `/api/telemetry` | Ingest telemetry packet from pole/simulator |
| `GET` | `/api/stats` | System-wide statistics |
| `GET` | `/api/poles` | All poles summary list |
| `GET` | `/api/poles/:poleId` | Single pole full detail + anomaly analysis + maintenance prediction |
| `GET` | `/api/districts` | All district summaries |
| `GET` | `/api/districts/:districtId` | Single district summary |
| `GET` | `/api/feeders` | All feeder summaries |
| `GET` | `/api/feeders/:feederId` | Single feeder summary |
| `GET` | `/api/events` | Recent fault events (default limit: 50) |
| `GET` | `/api/analytics/anomalies` | All detected anomalies across all poles |
| `GET` | `/api/analytics/maintenance` | Predictive maintenance for all poles |
| `GET` | `/api/analytics/atc-loss` | AT&C loss report per feeder |
| `GET` | `/api/ai/diagnostics/:poleId` | AI-generated diagnostics for a specific pole |
| `POST` | `/api/ai/query` | Natural language query — body: `{ "prompt": "..." }` |
| `GET` | `/api/ai/dispatch/:poleId` | Generate work order for a pole |

### WebSocket: `ws://localhost:3000/ws`

**Message Types (Server → Client):**
| Type | Payload | When |
|------|---------|------|
| `init` | `SystemStats` | On connection |
| `stats` | `SystemStats` | Periodically |
| `telemetry` | `{ poleId, voltage, current, temperature, ... }` | Each telemetry ingestion |
| `alert` | `{ poleId, districtId, feederId, status, ... }` | On fault detection |

**Topics:** `tn/telemetry`, `tn/alerts`

---

## 10. Data Models & Type Definitions

### TelemetryPacket
```typescript
interface TelemetryPacket {
    poleId: string;         // e.g., "POLE-001"
    feederId: string;       // e.g., "FDR-CHN-01"
    districtId: string;     // e.g., "CHENNAI"
    timestamp: string;      // ISO 8601
    voltage: number;        // AC mains voltage (V)
    current: number;        // AC line current (A)
    temperature: number;    // Transformer temp (°C)
    dcVoltage?: number;     // DC bus voltage (V)
    dcCurrent?: number;     // DC bus current (mA)
    power: number;          // Active power (W)
    healthScore: number;    // 0–100
    relayState: boolean;    // true = line connected
    status: PoleStatus;
    signal: number;         // RSSI
    uptime?: number;        // seconds

    // B2B Industrial APFC Extensions
    powerFactor?: number;       // 0.0–1.0
    activePower?: number;       // kW
    reactivePower?: number;     // kVAr
    capacitorSteps?: boolean[]; // 8 bank states

    // AI Extensions
    degradationRatio?: number;  // 0.0 (new) to 1.0 (critical)
    predictedTTF?: number;      // Days until critical failure
}
```

### PoleStatus
```typescript
type PoleStatus =
    | "NORMAL"
    | "VOLT_HIGH_WARN" | "OVERVOLTAGE"
    | "VOLT_LOW_WARN" | "UNDERVOLTAGE"
    | "OVERLOAD" | "OVERLOAD_CRIT"
    | "OVERHEAT" | "OVERHEAT_CRIT"
    | "MULTI_FAULT"
    | "OFFLINE";
```

### PoleData (Server-side enriched)
```typescript
interface PoleData {
    poleId: string;
    feederId: string;
    districtId: string;
    lastSeen: string;
    voltage: number;
    current: number;
    temperature: number;
    power: number;
    healthScore: number;
    relayState: boolean;
    status: PoleStatus;
    signal: number;
    uptime: number;
    riskLevel: RiskLevel;        // Computed
    history: TelemetryPacket[];  // Rolling buffer
    events: FaultEvent[];        // Per-pole event log
}
```

### Other Types
```typescript
type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

interface FaultEvent {
    id: string; poleId: string; feederId: string; districtId: string;
    timestamp: string; type: string;
    severity: "WARNING" | "FAULT" | "CRITICAL";
    value: number; message: string; resolved: boolean;
}

interface FeederSummary {
    feederId: string; districtId: string;
    poleCount: number; activePoles: number; faultPoles: number;
    totalLoad: number; avgVoltage: number; avgTemperature: number;
    avgHealthScore: number; atcLoss: number; criticalPoles: string[];
}

interface DistrictSummary {
    districtId: string; poleCount: number; activePoles: number;
    offlinePoles: number; faultCount: number; overheatCount: number;
    overloadCount: number; totalLoad: number; avgVoltage: number;
    avgHealthScore: number; feeders: FeederSummary[]; riskLevel: RiskLevel;
}

interface SystemStats {
    totalPoles: number; activePoles: number; offlinePoles: number;
    totalFaults: number; totalOverheats: number; totalOverloads: number;
    totalLoad: number; avgHealthScore: number; avgVoltage: number;
    districts: number; feeders: number; lastUpdate: string;
}
```

---

## 11. AI & Analytics Features

### Grid Copilot (`generateDiagnostics`)
Simulates a local SLM (Small Language Model) interpreting raw telemetry. Generates natural-language diagnostics:
- **APFC Analysis**: Detects low power factor, calculates TNEB penalties in ₹
- **Thermal Analysis**: Warns on sustained high temperature, flags insulation failure risk
- **Load Analysis**: Detects overload conditions, recommends grid shedding
- **Degradation Detection**: Identifies declining health despite nominal parameters

### Natural Language Query (`queryGridAgent`)
Accepts plain-English queries and filters grid data:
- `"show poles with power factor below 0.90"` → Filters APFC violations
- `"which transformers are overheating"` → Filters temperature >65°C
- `"show overloaded nodes"` → Filters OVERLOAD status
- `"list all faulted poles"` → Filters non-NORMAL status

### Automated Dispatch (`generateWorkOrder`)
Generates structured work orders:
- **Priority levels**: Routine, HIGH, CRITICAL, URGENT FINANCIAL
- **Root cause hypothesis**: Thermal runaway, voltage instability, APFC relay failure
- **Required tools**: Thermal camera, power analyzer, APFC contactor spares, etc.
- **Time estimates**: 2–4 hours based on fault type
- **Work order ID**: Auto-generated with timestamp

### Anomaly Detection (`detectAnomalies`)
Real-time anomaly classification across 6 dimensions:
1. Voltage deviation (from 230V nominal)
2. Current overload
3. Temperature anomalies
4. Rapid temperature rise
5. Power factor degradation
6. Voltage stability (standard deviation analysis)

### Predictive Maintenance (`predictMaintenance`)
ML-like scoring system:
- Composite risk score from temperature trend, overload frequency, voltage stability, health trajectory
- Time-to-failure estimation based on deviation from ideal parameters
- Risk classification with specific factor analysis
- Human-readable maintenance recommendations

---

## 12. Real-Time Communication

### WebSocket Flow
```
Browser                        Backend
  │                              │
  │── ws://host:3000/ws ────────►│
  │                              │ subscribe to topics
  │◄── {type:"init", data:stats} │
  │                              │
  │   [ESP32 sends telemetry]    │
  │                              │── ingest → store → analytics
  │◄── {type:"telemetry", data}──│
  │◄── {type:"alert", data} ────│ (if fault detected)
  │                              │
  │   [Reconnect on close]       │
  │── exponential backoff ──────►│
```

### Auto-Reconnect Strategy (Frontend)
- Up to 10 retry attempts
- Exponential backoff: `min(2000ms × retryCount, 15000ms)`
- Connection status reflected in Sidebar indicator (green pulse = connected)

---

## 13. Hardware Specification

### Per-Pole Bill of Materials

| Component | Model | Purpose | Interface |
|-----------|-------|---------|-----------|
| **Microcontroller** | ESP32 Dev Board | Main controller | — |
| **ADC** | ADS1115 (16-bit) | High-precision analog measurement | I2C (0x48) |
| **Voltage Sensor** | AC Voltage Divider | Mains voltage sensing (230V) | ADS1115 Ch0 |
| **Current Sensor** | ACS712 (30A) | AC line current sensing | ADS1115 Ch1 |
| **DC Monitor** | INA219 | DC bus voltage/current | I2C (0x40) |
| **Temperature** | MAX6675 + K-type probe | Transformer temperature | SPI (bit-bang) |
| **Radio** | LoRa SX1278 (433 MHz) | Long-range wireless | SPI |
| **Display** | OLED 0.96" (SSD1306) | Local readout | I2C (0x3C) |
| **Protection** | 5V Relay Module | Fault protection (auto-trip) | GPIO 27 |

### Communication Modes
| Environment | Technology | Range |
|-------------|-----------|-------|
| Urban | WiFi / HTTP POST | LAN/Internet |
| Rural | LoRa 433 MHz (SF7, 125 kHz) | Up to 10+ km |

---

## 14. Getting Started

### Prerequisites
- [Bun](https://bun.sh/) v1.0+
- [Node.js](https://nodejs.org/) (for Next.js frontend)
- Modern web browser (Chrome/Edge recommended for Web Serial)

### 1. Start Backend
```bash
cd backend
bun install
bun run dev
```
Server starts at `http://localhost:3000`

### 2. Start Simulator (for demo data)
```bash
cd backend
bun run simulate
```
Generates telemetry for ~50+ poles across 38 districts.

### 3. Start Frontend
```bash
cd frontend
npm install
npm run dev
```
Next.js dev server at `http://localhost:3001` (or assigned port).

### 4. View Legacy Dashboard
Open `http://localhost:3000` in your browser (served by Elysia static plugin from `dashboard/`).

### 5. Hardware Prototype (Optional)
1. Flash `firmware/pole_node/pole_node.ino` to ESP32
2. Connect ESP32 via USB
3. Navigate to `/prototype` in the Next.js dashboard
4. Click "Connect" to establish Web Serial bridge

---

## 15. Existing Documentation

| Document | Path | Description |
|----------|------|-------------|
| Project README | [README.md](file:///d:/TNEB-GridSense/README.md) | Quick start guide, architecture overview, API table, hardware list |
| Technical Proposal | [PROPOSAL.md](file:///d:/TNEB-GridSense/docs/PROPOSAL.md) | Full problem statement, vision, system architecture, impact analysis, scalability plan, economic justification |
| Architecture | [ARCHITECTURE.md](file:///d:/TNEB-GridSense/docs/ARCHITECTURE.md) | Data flow diagrams, edge node architecture, backend pipeline, API route map |
| Web Serial Bridge | [WEB_SERIAL_PROTOTYPE.md](file:///d:/TNEB-GridSense/docs/WEB_SERIAL_PROTOTYPE.md) | Hardware prototype bridge documentation, USB-to-cloud data flow |

---

*Generated from full codebase analysis of TNEB-GridSense. Last updated: March 2026.*

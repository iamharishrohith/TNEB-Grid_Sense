# TN-GridSense — System Architecture

## High-Level Data Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Smart Pole  │     │  Smart Pole  │     │  Smart Pole  │
│  (ESP32)     │     │  (ESP32)     │     │  (ESP32)     │
│  POLE-001    │     │  POLE-002    │     │  POLE-050    │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │ WiFi/HTTP          │ WiFi/HTTP          │ LoRa
       │                    │                    │
       │                    │              ┌─────▼─────┐
       │                    │              │ LoRa      │
       │                    │              │ Gateway   │
       │                    │              └─────┬─────┘
       │                    │                    │ HTTP
       └────────┬───────────┴────────────────────┘
                │
        ┌───────▼───────┐
        │  Bun + Elysia │
        │  Backend      │
        │               │
        │  ┌──────────┐ │
        │  │Telemetry │ │  POST /api/telemetry
        │  │Ingestion │ │
        │  └────┬─────┘ │
        │       │       │
        │  ┌────▼─────┐ │
        │  │In-Memory │ │  Time-series store
        │  │Store     │ │  History ring buffers
        │  └────┬─────┘ │
        │       │       │
        │  ┌────▼─────┐ │
        │  │Analytics │ │  Anomaly detection
        │  │Engine    │ │  Health scoring
        │  │          │ │  AT&C loss
        │  └────┬─────┘ │
        │       │       │
        │  ┌────▼─────┐ │
        │  │WebSocket │ │  Real-time push
        │  │Broadcast │ │
        │  └──────────┘ │
        └───────┬───────┘
                │ WS + REST
        ┌───────▼───────┐
        │  Dashboard    │
        │  (Browser)    │
        │               │
        │  Level 1: TN  │  State overview
        │  Level 2: Dst │  District drill-down
        │  Level 3: Pole│  Individual pole
        └───────────────┘
```

## Edge Node (Smart Pole) Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      ESP32 Dev Board                         │
│                                                              │
│  ┌─────────┐  I2C   ┌──────────┐                           │
│  │ ADS1115 │◄──────►│ INA219   │                           │
│  │ 16-bit  │        │ DC Bus   │                           │
│  └────┬────┘        └──────────┘                           │
│       │                                                     │
│  ┌────┴────┐  ┌──────────┐                                 │
│  │Voltage  │  │ACS712    │       ┌─────────┐               │
│  │Divider  │  │Current   │       │MAX6675  │               │
│  │(A0)     │  │Sensor    │       │Thermo   │               │
│  │         │  │(A1)      │       │(SPI)    │               │
│  └─────────┘  └──────────┘       └─────────┘               │
│                                                              │
│  ┌───────────┐  ┌────────────┐  ┌───────────┐              │
│  │LoRa      │  │OLED 0.96"  │  │5V Relay   │              │
│  │SX1278    │  │Display     │  │Module     │              │
│  │(SPI)     │  │(I2C)       │  │(GPIO27)   │              │
│  └───────────┘  └────────────┘  └───────────┘              │
│                                                              │
│  ┌───────────────────────────────────────────────────┐      │
│  │              Firmware Logic                        │      │
│  │  • Sensor reading (RMS calculation)               │      │
│  │  • Fault detection (V/I/T thresholds)             │      │
│  │  • Health score computation                       │      │
│  │  • Relay control (auto-trip/reset)                │      │
│  │  • JSON telemetry assembly                        │      │
│  │  • HTTP POST to backend                           │      │
│  │  • LoRa broadcast                                 │      │
│  │  • Local data buffering                           │      │
│  │  • NTP time sync                                  │      │
│  │  • OTA update support                             │      │
│  └───────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## Backend Processing Pipeline

```
Incoming Telemetry
       │
       ▼
  ┌──────────┐
  │Validate  │  Check packet structure
  │& Parse   │  Authenticate token
  └────┬─────┘
       │
       ▼
  ┌──────────┐
  │Ingest    │  Update pole live values
  │to Store  │  Push to history ring buffer
  └────┬─────┘
       │
       ├──────────────┐
       ▼              ▼
  ┌──────────┐  ┌──────────┐
  │Fault     │  │Aggregate │  Feeder summaries
  │Event     │  │Data      │  District summaries
  │Detection │  │          │  System stats
  └────┬─────┘  └──────────┘
       │
       ▼
  ┌──────────┐
  │Analytics │
  │Engine    │
  │          │
  │ • Anomaly detection
  │ • Health scoring
  │ • Risk classification
  │ • AT&C loss estimation
  │ • Predictive maintenance
  └────┬─────┘
       │
       ▼
  ┌──────────┐
  │WebSocket │  Push to all connected dashboards
  │Broadcast │
  └──────────┘
```

## API Route Map

```
/api
├── /health              GET    Server health check
├── /telemetry           POST   Ingest telemetry packet
├── /stats               GET    System-wide statistics
├── /poles               GET    All poles (summary)
│   └── /:poleId         GET    Single pole (full detail + analytics)
├── /districts           GET    All district summaries
│   └── /:districtId     GET    Single district
├── /feeders             GET    All feeder summaries
│   └── /:feederId       GET    Single feeder
├── /events              GET    Recent fault events (?limit=N)
└── /analytics
    ├── /anomalies       GET    All detected anomalies
    ├── /maintenance     GET    Predictive maintenance recommendations
    └── /atc-loss        GET    AT&C loss per feeder

/ws                      WS     Real-time telemetry updates
```

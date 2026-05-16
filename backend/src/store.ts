// ═══════════════════════════════════════════════════════════════════
//  TN-GridSense Backend — Data Store
//  In-memory time-series store with JSON persistence
// ═══════════════════════════════════════════════════════════════════

import type {
    TelemetryPacket,
    PoleData,
    FaultEvent,
    FeederSummary,
    DistrictSummary,
    SystemStats,
    PoleStatus,
    RiskLevel,
} from "./types";

const HISTORY_MAX = 50; // Max history entries per pole (reduced from 500 to prevent OOM)
const OFFLINE_TIMEOUT = 30_000; // 30 seconds without data = offline
const DATA_FILE = "./data/store.json";

import { insertTelemetryRecord, insertEventRecord } from "./db";
import { computeThermalRate } from "./analytics";
import { createAlert } from "./alertEngine";

// ─── In-Memory Store ───────────────────────────────────────

const poles: Map<string, PoleData> = new Map();
const events: FaultEvent[] = [];
let eventCounter = 0;

// ─── Telemetry Ingestion ───────────────────────────────────

export function ingestTelemetry(packet: TelemetryPacket): PoleData {
    let pole = poles.get(packet.poleId);

    if (!pole) {
        pole = {
            poleId: packet.poleId,
            feederId: packet.feederId,
            districtId: packet.districtId,
            lastSeen: packet.timestamp,
            voltage: 0,
            current: 0,
            temperature: 0,
            power: 0,
            healthScore: 100,
            relayState: true,
            status: "NORMAL",
            signal: 0,
            uptime: 0,
            riskLevel: "LOW",
            history: [],
            events: [],
            // Phase 2
            thermalRate: 0,
            thermalTrend: "STABLE",
            degradationSlope: 0,
            predictionConfidence: 0,
        };
        poles.set(packet.poleId, pole);
    }

    // Update live values
    pole.lastSeen = packet.timestamp;
    pole.voltage = packet.voltage;
    pole.current = packet.current;
    pole.temperature = packet.temperature;
    pole.power = packet.power;
    pole.healthScore = packet.healthScore;
    pole.relayState = packet.relayState;
    pole.status = packet.status;
    pole.signal = packet.signal;
    pole.uptime = packet.uptime ?? 0;

    // Risk level from health score
    pole.riskLevel = healthToRisk(packet.healthScore);

    // Phase 2: Compute thermal rate-of-change
    try {
        const thermal = computeThermalRate(packet.poleId);
        pole.thermalRate = thermal.rate;
        pole.thermalTrend = thermal.trend;
    } catch { /* first few readings may not have enough data */ }

    // Push to history ring buffer (Hot Cache)
    pole.history.push(packet);
    if (pole.history.length > HISTORY_MAX) {
        pole.history.shift();
    }

    // Persist to SQLite (Warm/Cold Store)
    insertTelemetryRecord(packet);

    // Detect and log fault events
    if (packet.status !== "NORMAL") {
        const event = createFaultEvent(packet);
        if (event) {
            events.push(event);
            pole.events.push(event);
            if (pole.events.length > 100) pole.events.shift();

            // Persist Event to SQLite
            insertEventRecord(event);

            // Phase 4: Create alert with escalation tracking
            createAlert(event);
        }
    }

    return pole;
}

// ─── Fault Event Creation ──────────────────────────────────

function createFaultEvent(packet: TelemetryPacket): FaultEvent | null {
    // Deduplicate: don't create event if same type within last 30 seconds
    const recent = events.filter(
        (e) =>
            e.poleId === packet.poleId &&
            e.type === packet.status &&
            Date.now() - new Date(e.timestamp).getTime() < 30_000
    );
    if (recent.length > 0) return null;

    eventCounter++;
    const severity = getSeverity(packet.status);

    let value = 0;
    let message = "";

    switch (packet.status) {
        case "OVERVOLTAGE":
        case "VOLT_HIGH_WARN":
            value = packet.voltage;
            message = `Voltage at ${packet.voltage.toFixed(1)}V (nominal: 230V)`;
            break;
        case "UNDERVOLTAGE":
        case "VOLT_LOW_WARN":
            value = packet.voltage;
            message = `Voltage dropped to ${packet.voltage.toFixed(1)}V`;
            break;
        case "OVERLOAD":
        case "OVERLOAD_CRIT":
            value = packet.current;
            message = `Current at ${packet.current.toFixed(1)}A — overload detected`;
            break;
        case "OVERHEAT":
        case "OVERHEAT_CRIT":
            value = packet.temperature;
            message = `Temperature at ${packet.temperature.toFixed(1)}°C`;
            break;
        case "MULTI_FAULT":
            message = `Multiple faults detected`;
            break;
        default:
            return null;
    }

    return {
        id: `EVT-${Date.now()}-${String(eventCounter).padStart(4, "0")}`,
        poleId: packet.poleId,
        feederId: packet.feederId,
        districtId: packet.districtId,
        timestamp: packet.timestamp || new Date().toISOString(),
        type: packet.status,
        severity,
        value,
        message,
        resolved: false,
    };
}

function getSeverity(
    status: PoleStatus
): "WARNING" | "FAULT" | "CRITICAL" {
    switch (status) {
        case "VOLT_HIGH_WARN":
        case "VOLT_LOW_WARN":
            return "WARNING";
        case "OVERVOLTAGE":
        case "UNDERVOLTAGE":
        case "OVERLOAD":
        case "OVERHEAT":
            return "FAULT";
        case "OVERLOAD_CRIT":
        case "OVERHEAT_CRIT":
        case "MULTI_FAULT":
            return "CRITICAL";
        default:
            return "WARNING";
    }
}

function healthToRisk(health: number): RiskLevel {
    if (health >= 80) return "LOW";
    if (health >= 60) return "MODERATE";
    if (health >= 35) return "HIGH";
    return "CRITICAL";
}

// ─── Queries ───────────────────────────────────────────────

export function getPole(poleId: string): PoleData | undefined {
    const pole = poles.get(poleId);
    if (pole) {
        // Check if offline
        const age = Date.now() - new Date(pole.lastSeen).getTime();
        if (age > OFFLINE_TIMEOUT) {
            pole.status = "OFFLINE";
        }
    }
    return pole;
}

export function getAllPoles(): PoleData[] {
    const now = Date.now();
    return Array.from(poles.values()).map((p) => {
        const age = now - new Date(p.lastSeen).getTime();
        if (age > OFFLINE_TIMEOUT) p.status = "OFFLINE";
        // Return without full history for list view
        return { ...p, history: [], events: [] };
    });
}

export function getRecentEvents(limit: number = 50): FaultEvent[] {
    return events.slice(-limit).reverse();
}

// ─── Aggregation: Feeders ──────────────────────────────────

export function getFeederSummary(feederId: string): FeederSummary | null {
    const feederPoles = Array.from(poles.values()).filter(
        (p) => p.feederId === feederId
    );
    if (feederPoles.length === 0) return null;

    return computeFeederSummary(feederId, feederPoles);
}

export function getAllFeeders(): FeederSummary[] {
    const feederMap: Map<string, PoleData[]> = new Map();

    for (const pole of poles.values()) {
        const arr = feederMap.get(pole.feederId) || [];
        arr.push(pole);
        feederMap.set(pole.feederId, arr);
    }

    return Array.from(feederMap.entries()).map(([feederId, feederPoles]) =>
        computeFeederSummary(feederId, feederPoles)
    );
}

function computeFeederSummary(
    feederId: string,
    feederPoles: PoleData[]
): FeederSummary {
    const now = Date.now();
    const active = feederPoles.filter(
        (p) => now - new Date(p.lastSeen).getTime() < OFFLINE_TIMEOUT
    );
    const faults = feederPoles.filter(
        (p) => p.status !== "NORMAL" && p.status !== "OFFLINE"
    );

    const totalLoad =
        feederPoles.reduce((sum, p) => sum + p.power, 0) / 1000; // kW
    const avgVoltage =
        active.length > 0
            ? active.reduce((s, p) => s + p.voltage, 0) / active.length
            : 0;
    const avgTemp =
        active.length > 0
            ? active.reduce((s, p) => s + p.temperature, 0) / active.length
            : 0;
    const avgHealth =
        feederPoles.reduce((s, p) => s + p.healthScore, 0) / feederPoles.length;

    // AT&C loss estimation (simulated feeder input vs pole sum)
    const expectedLoad = totalLoad * 1.08; // 8% nominal loss
    const atcLoss = ((expectedLoad - totalLoad) / expectedLoad) * 100;

    const critical = feederPoles
        .filter((p) => p.riskLevel === "CRITICAL" || p.riskLevel === "HIGH")
        .map((p) => p.poleId);

    return {
        feederId,
        districtId: feederPoles[0]?.districtId || "",
        poleCount: feederPoles.length,
        activePoles: active.length,
        faultPoles: faults.length,
        totalLoad: Math.round(totalLoad * 100) / 100,
        avgVoltage: Math.round(avgVoltage * 10) / 10,
        avgTemperature: Math.round(avgTemp * 10) / 10,
        avgHealthScore: Math.round(avgHealth * 10) / 10,
        atcLoss: Math.round(atcLoss * 10) / 10,
        criticalPoles: critical,
    };
}

// ─── Aggregation: Districts ────────────────────────────────

export function getDistrictSummary(
    districtId: string
): DistrictSummary | null {
    const districtPoles = Array.from(poles.values()).filter(
        (p) => p.districtId === districtId
    );
    if (districtPoles.length === 0) return null;

    return computeDistrictSummary(districtId, districtPoles);
}

export function getAllDistricts(): DistrictSummary[] {
    const districtMap: Map<string, PoleData[]> = new Map();

    for (const pole of poles.values()) {
        const arr = districtMap.get(pole.districtId) || [];
        arr.push(pole);
        districtMap.set(pole.districtId, arr);
    }

    return Array.from(districtMap.entries()).map(([districtId, districtPoles]) =>
        computeDistrictSummary(districtId, districtPoles)
    );
}

function computeDistrictSummary(
    districtId: string,
    districtPoles: PoleData[]
): DistrictSummary {
    const now = Date.now();
    const active = districtPoles.filter(
        (p) => now - new Date(p.lastSeen).getTime() < OFFLINE_TIMEOUT
    );
    const offline = districtPoles.length - active.length;
    const faults = districtPoles.filter(
        (p) =>
            p.status !== "NORMAL" && p.status !== "OFFLINE"
    );
    const overheats = districtPoles.filter(
        (p) =>
            p.status === "OVERHEAT" || p.status === "OVERHEAT_CRIT"
    );
    const overloads = districtPoles.filter(
        (p) =>
            p.status === "OVERLOAD" || p.status === "OVERLOAD_CRIT"
    );

    const totalLoad =
        districtPoles.reduce((sum, p) => sum + p.power, 0) / 1000;
    const avgVoltage =
        active.length > 0
            ? active.reduce((s, p) => s + p.voltage, 0) / active.length
            : 0;
    const avgHealth =
        districtPoles.reduce((s, p) => s + p.healthScore, 0) /
        districtPoles.length;

    // Compute feeders for this district
    const feederMap: Map<string, PoleData[]> = new Map();
    for (const pole of districtPoles) {
        const arr = feederMap.get(pole.feederId) || [];
        arr.push(pole);
        feederMap.set(pole.feederId, arr);
    }
    const feeders = Array.from(feederMap.entries()).map(([fid, fps]) =>
        computeFeederSummary(fid, fps)
    );

    // District risk
    let riskLevel: RiskLevel = "LOW";
    if (avgHealth < 35) riskLevel = "CRITICAL";
    else if (avgHealth < 60) riskLevel = "HIGH";
    else if (avgHealth < 80) riskLevel = "MODERATE";

    return {
        districtId,
        poleCount: districtPoles.length,
        activePoles: active.length,
        offlinePoles: offline,
        faultCount: faults.length,
        overheatCount: overheats.length,
        overloadCount: overloads.length,
        totalLoad: Math.round(totalLoad * 100) / 100,
        avgVoltage: Math.round(avgVoltage * 10) / 10,
        avgHealthScore: Math.round(avgHealth * 10) / 10,
        feeders,
        riskLevel,
    };
}

// ─── System Stats ──────────────────────────────────────────

export function getSystemStats(): SystemStats {
    const now = Date.now();
    const allPoles = Array.from(poles.values());
    const active = allPoles.filter(
        (p) => now - new Date(p.lastSeen).getTime() < OFFLINE_TIMEOUT
    );
    const faults = allPoles.filter(
        (p) => p.status !== "NORMAL" && p.status !== "OFFLINE"
    );
    const overheats = allPoles.filter(
        (p) => p.status === "OVERHEAT" || p.status === "OVERHEAT_CRIT"
    );
    const overloads = allPoles.filter(
        (p) => p.status === "OVERLOAD" || p.status === "OVERLOAD_CRIT"
    );

    const totalLoad = allPoles.reduce((s, p) => s + p.power, 0) / 1000;
    const avgHealth =
        allPoles.length > 0
            ? allPoles.reduce((s, p) => s + p.healthScore, 0) / allPoles.length
            : 0;
    const avgVoltage =
        active.length > 0
            ? active.reduce((s, p) => s + p.voltage, 0) / active.length
            : 0;

    const districts = new Set(allPoles.map((p) => p.districtId));
    const feeders = new Set(allPoles.map((p) => p.feederId));

    return {
        totalPoles: allPoles.length,
        activePoles: active.length,
        offlinePoles: allPoles.length - active.length,
        totalFaults: faults.length,
        totalOverheats: overheats.length,
        totalOverloads: overloads.length,
        totalLoad: Math.round(totalLoad * 100) / 100,
        avgHealthScore: Math.round(avgHealth * 10) / 10,
        avgVoltage: Math.round(avgVoltage * 10) / 10,
        districts: districts.size,
        feeders: feeders.size,
        lastUpdate: new Date().toISOString(),
    };
}

// ─── WebSocket Subscribers ─────────────────────────────────

const wsSubscribers: Set<any> = new Set();

export function addWSSubscriber(ws: any) {
    wsSubscribers.add(ws);
}

export function removeWSSubscriber(ws: any) {
    wsSubscribers.delete(ws);
}

export function broadcastUpdate(data: any) {
    const msg = JSON.stringify(data);
    for (const ws of wsSubscribers) {
        try {
            ws.send(msg);
        } catch {
            wsSubscribers.delete(ws);
        }
    }
}

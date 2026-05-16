// ═══════════════════════════════════════════════════════════════════
//  TN-GridSense Backend — SQLite Persistence (Phase 1)
//  Native bun:sqlite replacement for in-memory arrays
// ═══════════════════════════════════════════════════════════════════

import { Database } from "bun:sqlite";
import type { TelemetryPacket, FaultEvent } from "./types";

const db = new Database("gridsense.sqlite");

// Enable Write-Ahead Logging for better concurrent performance
db.exec("PRAGMA journal_mode = WAL;");

// Initialize Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS telemetry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    poleId TEXT NOT NULL,
    feederId TEXT NOT NULL,
    districtId TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    voltage REAL,
    current REAL,
    temperature REAL,
    power REAL,
    healthScore REAL,
    relayState INTEGER,
    status TEXT,
    signal INTEGER,
    uptime INTEGER,
    powerFactor REAL,
    activePower REAL,
    reactivePower REAL,
    degradationRatio REAL,
    predictedTTF INTEGER
  );

  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    poleId TEXT NOT NULL,
    feederId TEXT NOT NULL,
    districtId TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    type TEXT NOT NULL,
    severity TEXT NOT NULL,
    value REAL,
    message TEXT NOT NULL,
    resolved INTEGER DEFAULT 0
  );

  -- Indices for faster querying
  CREATE INDEX IF NOT EXISTS idx_telemetry_poleId_timestamp ON telemetry(poleId, timestamp DESC);
  CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);
  CREATE INDEX IF NOT EXISTS idx_events_poleId ON events(poleId);
`);

console.log("✔ SQLite Database Initialized (gridsense.sqlite)");

// Prepared Statements
const insertTelemetryStmt = db.prepare(`
  INSERT INTO telemetry (
    poleId, feederId, districtId, timestamp, voltage, current, temperature, power, 
    healthScore, relayState, status, signal, uptime, powerFactor, activePower, 
    reactivePower, degradationRatio, predictedTTF
  ) VALUES (
    $poleId, $feederId, $districtId, $timestamp, $voltage, $current, $temperature, $power,
    $healthScore, $relayState, $status, $signal, $uptime, $powerFactor, $activePower,
    $reactivePower, $degradationRatio, $predictedTTF
  )
`);

const insertEventStmt = db.prepare(`
  INSERT OR IGNORE INTO events (
    id, poleId, feederId, districtId, timestamp, type, severity, value, message, resolved
  ) VALUES (
    $id, $poleId, $feederId, $districtId, $timestamp, $type, $severity, $value, $message, $resolved
  )
`);

export function insertTelemetryRecord(packet: TelemetryPacket) {
  try {
    insertTelemetryStmt.run({
      $poleId: packet.poleId,
      $feederId: packet.feederId,
      $districtId: packet.districtId,
      $timestamp: packet.timestamp,
      $voltage: packet.voltage,
      $current: packet.current,
      $temperature: packet.temperature,
      $power: packet.power,
      $healthScore: packet.healthScore,
      $relayState: packet.relayState ? 1 : 0,
      $status: packet.status,
      $signal: packet.signal,
      $uptime: packet.uptime ?? 0,
      $powerFactor: packet.powerFactor ?? 1.0,
      $activePower: packet.activePower ?? packet.power,
      $reactivePower: packet.reactivePower ?? 0,
      $degradationRatio: packet.degradationRatio ?? 0,
      $predictedTTF: packet.predictedTTF ?? null
    });
  } catch (e) {
    console.error("SQLite Insert Error (Telemetry):", e);
  }
}

export function insertEventRecord(event: FaultEvent) {
  try {
    insertEventStmt.run({
      $id: event.id,
      $poleId: event.poleId,
      $feederId: event.feederId,
      $districtId: event.districtId,
      $timestamp: event.timestamp,
      $type: event.type,
      $severity: event.severity,
      $value: event.value,
      $message: event.message,
      $resolved: event.resolved ? 1 : 0
    });
  } catch (e) {
    console.error("SQLite Insert Error (Event):", e);
  }
}

// Queries
export function getPoleTelemetryHistory(poleId: string, limit: number = 200): any[] {
  return db.query(`
        SELECT * FROM telemetry 
        WHERE poleId = ? 
        ORDER BY timestamp DESC 
        LIMIT ?
    `).all(poleId, limit).reverse(); // Return chronological
}

export function getRecentDatabaseEvents(limit: number = 50): FaultEvent[] {
  const rawEvents = db.query(`
        SELECT * FROM events 
        ORDER BY timestamp DESC 
        LIMIT ?
    `).all(limit);

  // Map SQLite types (1/0) back to boolean
  return rawEvents.map((e: any) => ({
    ...e,
    resolved: e.resolved === 1
  }));
}

// ─── Phase 2: Analytics Queries ────────────────────────────────

/**
 * Get temperature readings for a pole within last N minutes (for dT/dt).
 */
export function getTemperatureHistory(
  poleId: string,
  minutesBack: number = 10
): { timestamp: string; temperature: number }[] {
  const cutoff = new Date(Date.now() - minutesBack * 60 * 1000).toISOString();
  return db.query(`
        SELECT timestamp, temperature FROM telemetry
        WHERE poleId = ? AND timestamp > ?
        ORDER BY timestamp ASC
    `).all(poleId, cutoff) as { timestamp: string; temperature: number }[];
}

/**
 * Get health score readings for a pole over last N days (for degradation).
 */
export function getHealthScoreHistory(
  poleId: string,
  daysBack: number = 30
): { timestamp: string; healthScore: number }[] {
  const cutoff = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();
  return db.query(`
        SELECT timestamp, healthScore FROM telemetry
        WHERE poleId = ? AND timestamp > ?
        ORDER BY timestamp ASC
    `).all(poleId, cutoff) as { timestamp: string; healthScore: number }[];
}

/**
 * Get total telemetry row count (for health check).
 */
export function getTelemetryCount(): number {
  const row = db.query("SELECT COUNT(*) as count FROM telemetry").get() as any;
  return row?.count ?? 0;
}

/**
 * Get total event row count (for health check).
 */
export function getEventCount(): number {
  const row = db.query("SELECT COUNT(*) as count FROM events").get() as any;
  return row?.count ?? 0;
}

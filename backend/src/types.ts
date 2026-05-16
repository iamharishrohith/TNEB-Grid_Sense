// ═══════════════════════════════════════════════════════════════════
//  TN-GridSense Backend — Type Definitions
// ═══════════════════════════════════════════════════════════════════

export interface TelemetryPacket {
  poleId: string;
  feederId: string;
  districtId: string;
  timestamp: string;
  voltage: number;
  current: number;
  temperature: number;
  dcVoltage?: number;
  dcCurrent?: number;
  power: number;
  healthScore: number;
  relayState: boolean;
  status: PoleStatus;
  signal: number;
  uptime?: number;

  // B2B Industrial APFC Telemetry Extensions
  powerFactor?: number;      // 0.0 to 1.0
  activePower?: number;      // kW
  reactivePower?: number;    // kVAr
  capacitorSteps?: boolean[];// length 8: [true, false, ...]

  // Phase 5 AI Extensions
  degradationRatio?: number; // 0.0 (New) to 1.0 (Critical Failure)
  predictedTTF?: number;     // Days until critical failure
}

export type PoleStatus =
  | "NORMAL"
  | "VOLT_HIGH_WARN"
  | "OVERVOLTAGE"
  | "VOLT_LOW_WARN"
  | "UNDERVOLTAGE"
  | "OVERLOAD"
  | "OVERLOAD_CRIT"
  | "OVERHEAT"
  | "OVERHEAT_CRIT"
  | "MULTI_FAULT"
  | "OFFLINE";

export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

export type ThermalTrend = "STABLE" | "RISING" | "RUNAWAY";

export interface PoleData {
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
  riskLevel: RiskLevel;
  history: TelemetryPacket[];
  events: FaultEvent[];

  // Phase 2: Predictive Intelligence
  thermalRate: number;           // °C/min rate-of-change
  thermalTrend: ThermalTrend;    // STABLE | RISING | RUNAWAY
  degradationSlope: number;      // health score change per day
  predictionConfidence: number;  // 0-100%
}

export interface FaultEvent {
  id: string;
  poleId: string;
  feederId: string;
  districtId: string;
  timestamp: string;
  type: string;
  severity: "WARNING" | "FAULT" | "CRITICAL";
  value: number;
  message: string;
  resolved: boolean;
}

export interface FeederSummary {
  feederId: string;
  districtId: string;
  poleCount: number;
  activePoles: number;
  faultPoles: number;
  totalLoad: number;        // kW
  avgVoltage: number;
  avgTemperature: number;
  avgHealthScore: number;
  atcLoss: number;          // percentage
  criticalPoles: string[];
}

export interface DistrictSummary {
  districtId: string;
  poleCount: number;
  activePoles: number;
  offlinePoles: number;
  faultCount: number;
  overheatCount: number;
  overloadCount: number;
  totalLoad: number;
  avgVoltage: number;
  avgHealthScore: number;
  feeders: FeederSummary[];
  riskLevel: RiskLevel;
}

export interface SystemStats {
  totalPoles: number;
  activePoles: number;
  offlinePoles: number;
  totalFaults: number;
  totalOverheats: number;
  totalOverloads: number;
  totalLoad: number;
  avgHealthScore: number;
  avgVoltage: number;
  districts: number;
  feeders: number;
  lastUpdate: string;
  // Phase 2: Deep Health
  dbTelemetryRows?: number;
  dbEventRows?: number;
  memoryUsageMB?: number;
  wsSubscribers?: number;
}

// ─── Phase 2: RBAC ─────────────────────────────────────────

export type UserRole = "VIEWER" | "OPERATOR" | "ENGINEER" | "ADMIN";

export interface AuthPayload {
  username: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export interface AuditEntry {
  id?: number;
  timestamp: string;
  action: string;
  actor: string;
  target: string;
  details: string;
}

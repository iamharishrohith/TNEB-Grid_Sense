// ═══════════════════════════════════════════════════════════════════
//  TN-GridSense Backend — Alert Escalation Engine (Phase 4)
//  3-tier escalation, active alert tracking, acknowledgement
// ═══════════════════════════════════════════════════════════════════

import type { FaultEvent } from "./types";
import { log } from "./metrics";

// ─── Types ───────────────────────────────────────────────────

type AlertSeverity = "INFO" | "WARNING" | "CRITICAL" | "EMERGENCY";
type AlertState = "OPEN" | "ACKNOWLEDGED" | "ESCALATED_L2" | "ESCALATED_L3" | "RESOLVED";
type EscalationTier = "L1" | "L2" | "L3";

export interface ActiveAlert {
    id: string;
    poleId: string;
    feederId: string;
    districtId: string;
    type: string;
    severity: AlertSeverity;
    message: string;
    state: AlertState;
    currentTier: EscalationTier;
    createdAt: string;
    lastEscalatedAt: string;
    acknowledgedBy: string | null;
    acknowledgedAt: string | null;
    resolvedAt: string | null;
    escalationHistory: EscalationEvent[];
    timeToEscalate: number | null; // seconds until next escalation
}

interface EscalationEvent {
    tier: EscalationTier;
    timestamp: string;
    action: string;
}

interface EscalationRule {
    faultType: string;
    initialTier: EscalationTier;
    l1TimeoutSec: number; // Seconds before escalating L1 → L2
    l2TimeoutSec: number; // Seconds before escalating L2 → L3
}

// ─── Escalation Rules ────────────────────────────────────────

const ESCALATION_RULES: EscalationRule[] = [
    { faultType: "OVERHEAT_CRIT", initialTier: "L2", l1TimeoutSec: 0, l2TimeoutSec: 900 },
    { faultType: "OVERLOAD_CRIT", initialTier: "L2", l1TimeoutSec: 0, l2TimeoutSec: 900 },
    { faultType: "MULTI_FAULT", initialTier: "L2", l1TimeoutSec: 0, l2TimeoutSec: 600 },
    { faultType: "OVERHEAT", initialTier: "L1", l1TimeoutSec: 300, l2TimeoutSec: 900 },
    { faultType: "OVERLOAD", initialTier: "L1", l1TimeoutSec: 300, l2TimeoutSec: 900 },
    { faultType: "OVERVOLTAGE", initialTier: "L1", l1TimeoutSec: 600, l2TimeoutSec: 1800 },
    { faultType: "UNDERVOLTAGE", initialTier: "L1", l1TimeoutSec: 600, l2TimeoutSec: 1800 },
    { faultType: "VOLT_HIGH_WARN", initialTier: "L1", l1TimeoutSec: 900, l2TimeoutSec: 3600 },
    { faultType: "VOLT_LOW_WARN", initialTier: "L1", l1TimeoutSec: 900, l2TimeoutSec: 3600 },
];

const DEFAULT_RULE: EscalationRule = {
    faultType: "DEFAULT", initialTier: "L1", l1TimeoutSec: 600, l2TimeoutSec: 1800,
};

// ─── In-Memory Alert Registry ────────────────────────────────

const activeAlerts: Map<string, ActiveAlert> = new Map();
let alertIdCounter = 0;

// ─── Create Alert from Fault Event ───────────────────────────

export function createAlert(event: FaultEvent): ActiveAlert {
    // Deduplicate: skip if same pole+type already has active alert
    for (const alert of activeAlerts.values()) {
        if (alert.poleId === event.poleId && alert.type === event.type && alert.state !== "RESOLVED") {
            return alert;
        }
    }

    alertIdCounter++;
    const rule = ESCALATION_RULES.find(r => r.faultType === event.type) || DEFAULT_RULE;

    const severity = mapSeverity(event.severity);
    const now = new Date().toISOString();

    const alert: ActiveAlert = {
        id: `ALT-${Date.now()}-${String(alertIdCounter).padStart(4, "0")}`,
        poleId: event.poleId,
        feederId: event.feederId,
        districtId: event.districtId,
        type: event.type,
        severity,
        message: event.message,
        state: rule.initialTier === "L1" ? "OPEN" : "ESCALATED_L2",
        currentTier: rule.initialTier,
        createdAt: now,
        lastEscalatedAt: now,
        acknowledgedBy: null,
        acknowledgedAt: null,
        resolvedAt: null,
        escalationHistory: [{
            tier: rule.initialTier,
            timestamp: now,
            action: rule.initialTier === "L1"
                ? "Auto-monitoring initiated. Waiting for resolution."
                : `Direct escalation to ${rule.initialTier} — critical fault type.`,
        }],
        timeToEscalate: rule.initialTier === "L1" ? rule.l1TimeoutSec : rule.l2TimeoutSec,
    };

    activeAlerts.set(alert.id, alert);
    log("WARN", "alertEngine", `Alert created: ${alert.type} on ${alert.poleId}`, { alertId: alert.id, tier: alert.currentTier });

    return alert;
}

// ─── Acknowledge Alert ───────────────────────────────────────

export function acknowledgeAlert(alertId: string, actor: string): ActiveAlert | null {
    const alert = activeAlerts.get(alertId);
    if (!alert || alert.state === "RESOLVED") return null;

    alert.state = "ACKNOWLEDGED";
    alert.acknowledgedBy = actor;
    alert.acknowledgedAt = new Date().toISOString();
    alert.timeToEscalate = null; // Stop escalation timer

    log("INFO", "alertEngine", `Alert ${alertId} acknowledged by ${actor}`);
    return alert;
}

// ─── Resolve Alert ───────────────────────────────────────────

export function resolveAlert(alertId: string): ActiveAlert | null {
    const alert = activeAlerts.get(alertId);
    if (!alert) return null;

    alert.state = "RESOLVED";
    alert.resolvedAt = new Date().toISOString();
    alert.timeToEscalate = null;

    log("INFO", "alertEngine", `Alert ${alertId} resolved`);
    return alert;
}

// ─── Escalation Check (call periodically) ────────────────────

export function checkEscalations(): void {
    const now = Date.now();

    for (const alert of activeAlerts.values()) {
        if (alert.state === "RESOLVED" || alert.state === "ACKNOWLEDGED") continue;

        const rule = ESCALATION_RULES.find(r => r.faultType === alert.type) || DEFAULT_RULE;
        const elapsed = (now - new Date(alert.lastEscalatedAt).getTime()) / 1000;

        if (alert.currentTier === "L1" && elapsed >= rule.l1TimeoutSec) {
            alert.currentTier = "L2";
            alert.state = "ESCALATED_L2";
            alert.lastEscalatedAt = new Date().toISOString();
            alert.timeToEscalate = rule.l2TimeoutSec;
            alert.escalationHistory.push({
                tier: "L2",
                timestamp: alert.lastEscalatedAt,
                action: `Escalated to L2 — unresolved after ${rule.l1TimeoutSec}s. On-call engineer notified.`,
            });
            log("WARN", "alertEngine", `Alert ${alert.id} escalated to L2`, { poleId: alert.poleId });
            continue;
        }

        if (alert.currentTier === "L2" && elapsed >= rule.l2TimeoutSec) {
            alert.currentTier = "L3";
            alert.state = "ESCALATED_L3";
            alert.lastEscalatedAt = new Date().toISOString();
            alert.timeToEscalate = null;
            alert.escalationHistory.push({
                tier: "L3",
                timestamp: alert.lastEscalatedAt,
                action: `Escalated to L3 — management notified. ${Math.round(elapsed / 60)} min unresolved.`,
            });
            log("ERROR", "alertEngine", `Alert ${alert.id} escalated to L3 — management level`, { poleId: alert.poleId });
        }
    }
}

// ─── Get Active Alerts ───────────────────────────────────────

export function getActiveAlerts(): ActiveAlert[] {
    return Array.from(activeAlerts.values())
        .filter(a => a.state !== "RESOLVED")
        .sort((a, b) => {
            // Critical first, then by creation time
            const sevOrder = { EMERGENCY: 0, CRITICAL: 1, WARNING: 2, INFO: 3 };
            const aDiff = sevOrder[a.severity] - sevOrder[b.severity];
            if (aDiff !== 0) return aDiff;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
}

export function getAlertHistory(limit: number = 50): ActiveAlert[] {
    return Array.from(activeAlerts.values())
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);
}

export function getAlertStats(): Record<string, any> {
    const all = Array.from(activeAlerts.values());
    const active = all.filter(a => a.state !== "RESOLVED");
    return {
        totalCreated: all.length,
        active: active.length,
        resolved: all.length - active.length,
        byTier: {
            L1: active.filter(a => a.currentTier === "L1").length,
            L2: active.filter(a => a.currentTier === "L2").length,
            L3: active.filter(a => a.currentTier === "L3").length,
        },
        bySeverity: {
            EMERGENCY: active.filter(a => a.severity === "EMERGENCY").length,
            CRITICAL: active.filter(a => a.severity === "CRITICAL").length,
            WARNING: active.filter(a => a.severity === "WARNING").length,
            INFO: active.filter(a => a.severity === "INFO").length,
        },
        avgResolutionTimeSec: getAvgResolutionTime(all),
    };
}

function getAvgResolutionTime(alerts: ActiveAlert[]): number | null {
    const resolved = alerts.filter(a => a.resolvedAt);
    if (resolved.length === 0) return null;
    const total = resolved.reduce((s, a) => {
        return s + (new Date(a.resolvedAt!).getTime() - new Date(a.createdAt).getTime()) / 1000;
    }, 0);
    return Math.round(total / resolved.length);
}

function mapSeverity(eventSeverity: string): AlertSeverity {
    switch (eventSeverity) {
        case "CRITICAL": return "CRITICAL";
        case "HIGH": return "CRITICAL";
        case "MEDIUM": return "WARNING";
        case "LOW": return "INFO";
        default: return "WARNING";
    }
}

// ─── Auto-escalation timer ───────────────────────────────────
setInterval(checkEscalations, 30_000); // Check every 30 seconds

console.log("✔ Alert Escalation Engine Initialized");

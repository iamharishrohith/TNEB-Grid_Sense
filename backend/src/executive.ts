// ═══════════════════════════════════════════════════════════════════
//  TN-GridSense Backend — Executive Dashboard (Phase 4)
//  Board-ready single-screen summary with traffic-light indicators
// ═══════════════════════════════════════════════════════════════════

import { getAllPoles, getPole, getSystemStats } from "./store";
import { getActiveAlerts, getAlertStats } from "./alertEngine";
import { calculateSavings } from "./economics";
import { getTelemetryCount, getEventCount } from "./db";

// ─── Types ───────────────────────────────────────────────────

export interface ExecutiveSummary {
    generatedAt: string;
    stateHealth: {
        score: number;         // 0-100
        indicator: "GREEN" | "AMBER" | "RED";
        label: string;
    };
    fleetOverview: {
        totalPoles: number;
        activePoles: number;
        offlinePoles: number;
        criticalPoles: number;
        uptimePercent: number;
    };
    todayMetrics: {
        telemetryPackets: number;
        faultEvents: number;
        activeAlerts: number;
        alertsByTier: { L1: number; L2: number; L3: number };
    };
    financialSnapshot: {
        estimatedMonthlySavingsLakhs: number;
        projectedAnnualSavingsCr: number;
        roiStatus: string;
    };
    districtIndicators: DistrictIndicator[];
    systemUptime: {
        seconds: number;
        formatted: string;
    };
}

interface DistrictIndicator {
    districtId: string;
    indicator: "GREEN" | "AMBER" | "RED";
    avgHealth: number;
    poles: number;
    activeFaults: number;
}

// ─── Executive Summary Generator ─────────────────────────────

export function generateExecutiveSummary(): ExecutiveSummary {
    const stats = getSystemStats();
    const allPoles = getAllPoles();
    const alerts = getAlertStats();
    const activeAlertList = getActiveAlerts();

    // State-level health score (weighted average)
    let totalHealth = 0;
    let criticalCount = 0;
    let offlineCount = 0;

    for (const poleSummary of allPoles) {
        const pole = getPole(poleSummary.poleId);
        if (!pole) continue;

        totalHealth += pole.healthScore;

        const lastSeenAgo = (Date.now() - new Date(pole.lastSeen).getTime()) / 1000;
        if (lastSeenAgo > 60) offlineCount++;
        else if (pole.healthScore < 30) criticalCount++;
    }

    const avgHealth = allPoles.length > 0 ? Math.round(totalHealth / allPoles.length) : 0;
    const activePoles = allPoles.length - offlineCount;
    const uptimePercent = allPoles.length > 0
        ? Math.round((activePoles / allPoles.length) * 1000) / 10
        : 0;

    // State indicator
    let indicator: "GREEN" | "AMBER" | "RED";
    let label: string;
    if (avgHealth >= 75 && criticalCount === 0) {
        indicator = "GREEN";
        label = "Grid Operating Normally";
    } else if (avgHealth >= 50 || criticalCount < 5) {
        indicator = "AMBER";
        label = `${criticalCount} Critical Poles — Monitoring`;
    } else {
        indicator = "RED";
        label = `${criticalCount} Critical Poles — Immediate Attention Required`;
    }

    // Financial snapshot
    const savings = calculateSavings(allPoles.length);
    const monthlySavings = (
        savings.scenarios.moderate.monthlyRecoveryCr * 100 +
        savings.transformerSavings.annualSavingsCr * 100 / 12 +
        savings.dispatchSavings.annualSavingsCr * 100 / 12
    );
    const annualSavings = (
        savings.scenarios.moderate.annualRecoveryCr +
        savings.transformerSavings.annualSavingsCr +
        savings.dispatchSavings.annualSavingsCr
    );

    // Per-district indicators
    const districtMap = new Map<string, { health: number[]; faults: number; poles: number }>();
    for (const poleSummary of allPoles) {
        const pole = getPole(poleSummary.poleId);
        if (!pole) continue;

        let d = districtMap.get(pole.districtId);
        if (!d) {
            d = { health: [], faults: 0, poles: 0 };
            districtMap.set(pole.districtId, d);
        }
        d.health.push(pole.healthScore);
        d.poles++;
        if (pole.status !== "NORMAL") d.faults++;
    }

    const districtIndicators: DistrictIndicator[] = Array.from(districtMap.entries())
        .map(([districtId, d]) => {
            const avg = d.health.reduce((s, v) => s + v, 0) / d.health.length;
            let ind: "GREEN" | "AMBER" | "RED";
            if (avg >= 75 && d.faults === 0) ind = "GREEN";
            else if (avg >= 50) ind = "AMBER";
            else ind = "RED";

            return {
                districtId,
                indicator: ind,
                avgHealth: Math.round(avg),
                poles: d.poles,
                activeFaults: d.faults,
            };
        })
        .sort((a, b) => a.avgHealth - b.avgHealth); // Worst first

    // System uptime
    const uptimeSec = process.uptime();
    const hours = Math.floor(uptimeSec / 3600);
    const minutes = Math.floor((uptimeSec % 3600) / 60);

    return {
        generatedAt: new Date().toISOString(),
        stateHealth: {
            score: avgHealth,
            indicator,
            label,
        },
        fleetOverview: {
            totalPoles: allPoles.length,
            activePoles,
            offlinePoles: offlineCount,
            criticalPoles: criticalCount,
            uptimePercent,
        },
        todayMetrics: {
            telemetryPackets: getTelemetryCount(),
            faultEvents: getEventCount(),
            activeAlerts: alerts.active,
            alertsByTier: alerts.byTier,
        },
        financialSnapshot: {
            estimatedMonthlySavingsLakhs: Math.round(monthlySavings * 10) / 10,
            projectedAnnualSavingsCr: Math.round(annualSavings * 100) / 100,
            roiStatus: annualSavings > 1 ? "Positive — Exceeds deployment cost" : "Building — Early deployment phase",
        },
        districtIndicators,
        systemUptime: {
            seconds: Math.round(uptimeSec),
            formatted: `${hours}h ${minutes}m`,
        },
    };
}

console.log("✔ Executive Dashboard Module Initialized");

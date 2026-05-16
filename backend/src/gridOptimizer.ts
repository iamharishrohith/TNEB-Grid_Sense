// ═══════════════════════════════════════════════════════════════════
//  TN-GridSense Backend — Grid Optimization Engine (Phase 4)
//  Load balancing, peak forecasting, demand-response simulation
// ═══════════════════════════════════════════════════════════════════

import type { PoleData, FeederSummary } from "./types";
import { getAllPoles, getAllFeeders, getPole, getDistrictSummary } from "./store";

// ─── Types ───────────────────────────────────────────────────

export interface LoadBalanceRecommendation {
    districtId: string;
    feeders: FeederLoadInfo[];
    recommendations: TransferRecommendation[];
    imbalanceScore: number;  // 0 (balanced) to 100 (severe imbalance)
}

interface FeederLoadInfo {
    feederId: string;
    currentLoad: number;      // kW
    estimatedCapacity: number; // kW
    utilizationPercent: number;
    poleCount: number;
    status: "UNDERLOADED" | "NORMAL" | "HEAVY" | "OVERLOADED";
}

interface TransferRecommendation {
    action: string;
    from: string;
    to: string;
    loadToTransfer: number; // kW
    expectedImprovement: string;
    priority: "LOW" | "MEDIUM" | "HIGH";
}

export interface PeakForecast {
    districtId: string;
    generatedAt: string;
    forecast: HourlyPrediction[];
    peakHour: number;
    peakLoad: number;
    capacityWarnings: string[];
}

interface HourlyPrediction {
    hour: number;        // 0-23
    label: string;       // "6 AM", "7 PM"
    predictedLoad: number; // kW
    confidence: number;    // 0-100%
    overCapacity: boolean;
}

export interface DemandResponseScenario {
    scenario: string;
    district: string;
    currentLoad: number;
    reduction: number;
    newLoad: number;
    deficitReduction: number;
    savingsEstimate: number; // ₹ per hour
}

// ─── Load Profiles (hourly multipliers based on Indian grid patterns) ───

const HOURLY_LOAD_PROFILE = [
    0.45, 0.40, 0.38, 0.35, 0.37, 0.42, // 00-05: Night low
    0.55, 0.70, 0.85, 0.90, 0.92, 0.88, // 06-11: Morning ramp
    0.82, 0.78, 0.80, 0.85, 0.90, 0.95, // 12-17: Afternoon
    1.00, 0.98, 0.92, 0.85, 0.72, 0.55, // 18-23: Evening peak + decline
];

const FEEDER_CAPACITY_KW = 500; // Estimated per-feeder capacity

// ─── Feeder Load Balancing ───────────────────────────────────

export function generateLoadBalanceRecommendations(districtId: string): LoadBalanceRecommendation {
    const allPoles = getAllPoles();
    const districtPoles = allPoles.filter(p => p.districtId === districtId);
    const feeders = getAllFeeders().filter(f => f.districtId === districtId);

    // Calculate per-feeder metrics
    const feederInfos: FeederLoadInfo[] = feeders.map(f => {
        const fPoles = districtPoles.filter(p => p.feederId === f.feederId);
        const currentLoad = fPoles.reduce((s, p) => {
            const fullPole = getPole(p.poleId);
            return s + (fullPole?.power || 0);
        }, 0) / 1000; // Convert to kW

        const utilization = (currentLoad / FEEDER_CAPACITY_KW) * 100;
        let status: FeederLoadInfo["status"];
        if (utilization > 90) status = "OVERLOADED";
        else if (utilization > 70) status = "HEAVY";
        else if (utilization < 30) status = "UNDERLOADED";
        else status = "NORMAL";

        return {
            feederId: f.feederId,
            currentLoad: Math.round(currentLoad * 10) / 10,
            estimatedCapacity: FEEDER_CAPACITY_KW,
            utilizationPercent: Math.round(utilization * 10) / 10,
            poleCount: fPoles.length,
            status,
        };
    });

    // Calculate imbalance score
    const utilizations = feederInfos.map(f => f.utilizationPercent);
    const avgUtil = utilizations.reduce((s, v) => s + v, 0) / (utilizations.length || 1);
    const maxDev = Math.max(...utilizations.map(u => Math.abs(u - avgUtil)));
    const imbalanceScore = Math.min(100, Math.round(maxDev * 2));

    // Generate transfer recommendations
    const recommendations: TransferRecommendation[] = [];
    const overloaded = feederInfos.filter(f => f.status === "OVERLOADED" || f.status === "HEAVY");
    const underloaded = feederInfos.filter(f => f.status === "UNDERLOADED");

    for (const heavy of overloaded) {
        for (const light of underloaded) {
            const excessLoad = heavy.currentLoad - (FEEDER_CAPACITY_KW * 0.6);
            const availableCapacity = (FEEDER_CAPACITY_KW * 0.6) - light.currentLoad;
            const transferAmount = Math.min(excessLoad, availableCapacity);

            if (transferAmount > 10) {
                recommendations.push({
                    action: `Transfer ${Math.round(transferAmount)} kW load from ${heavy.feederId} to ${light.feederId}`,
                    from: heavy.feederId,
                    to: light.feederId,
                    loadToTransfer: Math.round(transferAmount),
                    expectedImprovement: `${heavy.feederId} drops from ${heavy.utilizationPercent}% to ${Math.round((heavy.currentLoad - transferAmount) / FEEDER_CAPACITY_KW * 100)}%`,
                    priority: heavy.status === "OVERLOADED" ? "HIGH" : "MEDIUM",
                });
            }
        }
    }

    return {
        districtId,
        feeders: feederInfos,
        recommendations,
        imbalanceScore,
    };
}

// ─── Peak Stress Forecasting ─────────────────────────────────

export function generatePeakForecast(districtId: string): PeakForecast {
    const allPoles = getAllPoles();
    const districtPoles = allPoles.filter(p => p.districtId === districtId);

    // Current base load
    const currentLoad = districtPoles.reduce((s, p) => {
        const fullPole = getPole(p.poleId);
        return s + (fullPole?.power || 0);
    }, 0) / 1000; // kW

    const currentHour = new Date().getHours();
    const currentMultiplier = HOURLY_LOAD_PROFILE[currentHour] || 0.7;
    const baseLoad = currentLoad / currentMultiplier; // Normalize to get base

    const districtCapacity = districtPoles.length * FEEDER_CAPACITY_KW / 25; // Estimated capacity

    const forecast: HourlyPrediction[] = [];
    let peakLoad = 0;
    let peakHour = 0;
    const warnings: string[] = [];

    for (let h = 0; h < 24; h++) {
        const multiplier = HOURLY_LOAD_PROFILE[h];
        // Add some realistic variance (±5%)
        const variance = 0.95 + Math.random() * 0.1;
        const predicted = baseLoad * multiplier * variance;

        // Day-of-week adjustment (weekdays slightly higher)
        const day = new Date().getDay();
        const dayFactor = (day >= 1 && day <= 5) ? 1.05 : 0.92;
        const finalPrediction = predicted * dayFactor;

        const overCapacity = finalPrediction > districtCapacity * 0.85;

        if (finalPrediction > peakLoad) {
            peakLoad = finalPrediction;
            peakHour = h;
        }

        if (overCapacity) {
            const label = formatHour(h);
            warnings.push(`${label}: Predicted ${Math.round(finalPrediction)} kW exceeds 85% capacity threshold`);
        }

        forecast.push({
            hour: h,
            label: formatHour(h),
            predictedLoad: Math.round(finalPrediction * 10) / 10,
            confidence: Math.min(95, 70 + Math.round(districtPoles.length / 10)),
            overCapacity,
        });
    }

    return {
        districtId,
        generatedAt: new Date().toISOString(),
        forecast,
        peakHour,
        peakLoad: Math.round(peakLoad * 10) / 10,
        capacityWarnings: warnings,
    };
}

// ─── Demand-Response Simulation ──────────────────────────────

export function simulateDemandResponse(
    districtId: string,
    reductionPercent: number = 10,
    startHour: number = 18,
    endHour: number = 21
): DemandResponseScenario[] {
    const allPoles = getAllPoles();
    const districtPoles = allPoles.filter(p => p.districtId === districtId);

    const currentLoad = districtPoles.reduce((s, p) => {
        const fullPole = getPole(p.poleId);
        return s + (fullPole?.power || 0);
    }, 0) / 1000;

    const scenarios: DemandResponseScenario[] = [];
    const costPerKwh = 8; // ₹8/kWh average tariff

    for (let h = startHour; h <= endHour; h++) {
        const multiplier = HOURLY_LOAD_PROFILE[h] || 0.8;
        const hourlyLoad = currentLoad * multiplier / HOURLY_LOAD_PROFILE[new Date().getHours()];
        const reduction = hourlyLoad * (reductionPercent / 100);

        scenarios.push({
            scenario: `${formatHour(h)}: ${reductionPercent}% load reduction`,
            district: districtId,
            currentLoad: Math.round(hourlyLoad * 10) / 10,
            reduction: Math.round(reduction * 10) / 10,
            newLoad: Math.round((hourlyLoad - reduction) * 10) / 10,
            deficitReduction: Math.round(reduction * 10) / 10,
            savingsEstimate: Math.round(reduction * costPerKwh),
        });
    }

    return scenarios;
}

function formatHour(h: number): string {
    if (h === 0) return "12 AM";
    if (h === 12) return "12 PM";
    return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

console.log("✔ Grid Optimization Engine Initialized");

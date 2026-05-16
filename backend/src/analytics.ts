// ═══════════════════════════════════════════════════════════════════
//  TN-GridSense Backend — Analytics Engine
//  Anomaly detection, health scoring, AT&C loss, predictive maintenance
// ═══════════════════════════════════════════════════════════════════

import type { PoleData, RiskLevel, TelemetryPacket, ThermalTrend } from "./types";
import { getTemperatureHistory, getHealthScoreHistory } from "./db";

// ─── Anomaly Detection ─────────────────────────────────────

export interface AnomalyResult {
    poleId: string;
    type: string;
    severity: "INFO" | "WARNING" | "CRITICAL";
    description: string;
    value: number;
    threshold: number;
}

export function detectAnomalies(pole: PoleData): AnomalyResult[] {
    const anomalies: AnomalyResult[] = [];

    // Voltage deviation
    const voltDev = Math.abs(pole.voltage - 230) / 230;
    if (voltDev > 0.10) {
        anomalies.push({
            poleId: pole.poleId,
            type: "VOLTAGE_DEVIATION",
            severity: "CRITICAL",
            description: `Voltage ${pole.voltage.toFixed(1)}V deviates ${(voltDev * 100).toFixed(1)}% from nominal 230V`,
            value: pole.voltage,
            threshold: 230,
        });
    } else if (voltDev > 0.06) {
        anomalies.push({
            poleId: pole.poleId,
            type: "VOLTAGE_DRIFT",
            severity: "WARNING",
            description: `Voltage drifting: ${pole.voltage.toFixed(1)}V`,
            value: pole.voltage,
            threshold: 230,
        });
    }

    // Current spike detection (compare to recent average)
    if (pole.history.length > 10) {
        const recentAvg =
            pole.history.slice(-10).reduce((s, h) => s + h.current, 0) / 10;
        if (pole.current > recentAvg * 1.5 && pole.current > 5) {
            anomalies.push({
                poleId: pole.poleId,
                type: "CURRENT_SPIKE",
                severity: "WARNING",
                description: `Current spike: ${pole.current.toFixed(1)}A vs avg ${recentAvg.toFixed(1)}A`,
                value: pole.current,
                threshold: recentAvg,
            });
        }
    }

    // Thermal runaway detection (temperature rising consistently)
    if (pole.history.length >= 6) {
        const temps = pole.history.slice(-6).map((h) => h.temperature);
        const rising = temps.every(
            (t, i) => i === 0 || t >= temps[i - 1]
        );
        if (rising && temps[temps.length - 1] > 55) {
            anomalies.push({
                poleId: pole.poleId,
                type: "THERMAL_RUNAWAY",
                severity: "CRITICAL",
                description: `Temperature rising consistently: ${temps.map((t) => t.toFixed(0)).join("→")}°C`,
                value: temps[temps.length - 1],
                threshold: 55,
            });
        }
    }

    return anomalies;
}

// ─── Predictive Maintenance ────────────────────────────────

export interface MaintenanceRecommendation {
    poleId: string;
    riskLevel: RiskLevel;
    healthScore: number;
    estimatedDaysToFailure: number | null;
    recommendation: string;
    factors: string[];
    confidence: number; // Phase 2: 0-100%
}

export function predictMaintenance(
    pole: PoleData
): MaintenanceRecommendation {
    const factors: string[] = [];
    let riskScore = 0;

    // Temperature factor
    if (pole.temperature >= 80) {
        riskScore += 40;
        factors.push(`Critical temperature: ${pole.temperature.toFixed(1)}°C`);
    } else if (pole.temperature >= 65) {
        riskScore += 25;
        factors.push(`Elevated temperature: ${pole.temperature.toFixed(1)}°C`);
    } else if (pole.temperature >= 50) {
        riskScore += 10;
        factors.push(`Warm temperature: ${pole.temperature.toFixed(1)}°C`);
    }

    // Overload history
    const recentOverloads = pole.events.filter(
        (e) =>
            (e.type === "OVERLOAD" || e.type === "OVERLOAD_CRIT") &&
            Date.now() - new Date(e.timestamp).getTime() < 3600_000 // last hour
    ).length;
    if (recentOverloads >= 5) {
        riskScore += 30;
        factors.push(
            `${recentOverloads} overload events in last hour`
        );
    } else if (recentOverloads >= 2) {
        riskScore += 15;
        factors.push(
            `${recentOverloads} overload events in last hour`
        );
    }

    // Voltage instability
    if (pole.history.length >= 10) {
        const voltages = pole.history.slice(-10).map((h) => h.voltage);
        const voltStd = standardDeviation(voltages);
        if (voltStd > 10) {
            riskScore += 20;
            factors.push(
                `Voltage instability: σ=${voltStd.toFixed(1)}V`
            );
        }
    }

    // Health score trend
    if (pole.healthScore < 40) {
        riskScore += 25;
        factors.push(`Low health score: ${pole.healthScore.toFixed(0)}%`);
    }

    // Risk level
    let riskLevel: RiskLevel;
    if (riskScore >= 60) riskLevel = "CRITICAL";
    else if (riskScore >= 40) riskLevel = "HIGH";
    else if (riskScore >= 20) riskLevel = "MODERATE";
    else riskLevel = "LOW";

    // Estimated days to failure (rough)
    let estimatedDays: number | null = null;
    if (riskScore >= 60) estimatedDays = Math.max(1, Math.round((100 - riskScore) / 5));
    else if (riskScore >= 40) estimatedDays = Math.round((100 - riskScore) / 3);
    else if (riskScore >= 20) estimatedDays = Math.round((100 - riskScore) / 2);

    // Recommendation
    let recommendation: string;
    if (riskLevel === "CRITICAL") {
        recommendation = "IMMEDIATE INSPECTION REQUIRED — Schedule maintenance within 24 hours";
    } else if (riskLevel === "HIGH") {
        recommendation = "Schedule preventive maintenance within 1 week";
    } else if (riskLevel === "MODERATE") {
        recommendation = "Monitor closely — include in next scheduled maintenance cycle";
    } else {
        recommendation = "Operating normally — no action needed";
    }

    // Phase 2: Compute confidence from data completeness
    const confidence = computeConfidence(pole);

    return {
        poleId: pole.poleId,
        riskLevel,
        healthScore: pole.healthScore,
        estimatedDaysToFailure: estimatedDays,
        recommendation,
        factors,
        confidence,
    };
}

// ─── AT&C Loss Estimation ──────────────────────────────────

export interface ATCLossReport {
    feederId: string;
    inputPower: number;    // kW (estimated feeder input)
    measuredLoad: number;  // kW (sum of poles)
    loss: number;          // kW
    lossPercentage: number;
    anomalous: boolean;
    possibleTheft: boolean;
}

export function estimateATCLoss(
    feederId: string,
    poles: PoleData[]
): ATCLossReport {
    const measuredLoad = poles.reduce((s, p) => s + p.power, 0) / 1000; // kW

    // Simulate feeder input (in real system, this comes from feeder meter)
    // We add a realistic technical loss of 6-8% on top
    const technicalLoss = 0.07; // 7% baseline technical loss
    const inputPower = measuredLoad / (1 - technicalLoss);

    const loss = inputPower - measuredLoad;
    const lossPercentage = (loss / inputPower) * 100;

    // Flag anomalous if loss > 12% (beyond normal technical + commercial)
    const anomalous = lossPercentage > 12;
    const possibleTheft = lossPercentage > 15;

    return {
        feederId,
        inputPower: Math.round(inputPower * 100) / 100,
        measuredLoad: Math.round(measuredLoad * 100) / 100,
        loss: Math.round(loss * 100) / 100,
        lossPercentage: Math.round(lossPercentage * 10) / 10,
        anomalous,
        possibleTheft,
    };
}

// ─── Utility ───────────────────────────────────────────────

function standardDeviation(arr: number[]): number {
    const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
    const squaredDiffs = arr.map((v) => (v - mean) ** 2);
    return Math.sqrt(
        squaredDiffs.reduce((s, v) => s + v, 0) / arr.length
    );
}

// ═══════════════════════════════════════════════════════════════════
//  Phase 2: Predictive Intelligence Functions
// ═══════════════════════════════════════════════════════════════════

// ─── dT/dt Thermal Rate-of-Change ──────────────────────────

export interface ThermalRateResult {
    rate: number;          // °C/min
    trend: ThermalTrend;   // STABLE | RISING | RUNAWAY
    samples: number;       // data points used
}

/**
 * Compute temperature rate-of-change over the last 10 minutes.
 * A pole at 55°C rising at 2°C/min is MORE dangerous than one stable at 70°C.
 */
export function computeThermalRate(poleId: string): ThermalRateResult {
    const tempHistory = getTemperatureHistory(poleId, 10);

    if (tempHistory.length < 2) {
        return { rate: 0, trend: "STABLE", samples: tempHistory.length };
    }

    // Calculate rate using first and last readings
    const first = tempHistory[0];
    const last = tempHistory[tempHistory.length - 1];
    const timeDiffMin =
        (new Date(last.timestamp).getTime() - new Date(first.timestamp).getTime()) / 60000;

    if (timeDiffMin < 0.1) {
        return { rate: 0, trend: "STABLE", samples: tempHistory.length };
    }

    const rate = (last.temperature - first.temperature) / timeDiffMin;

    // Classify trend
    let trend: ThermalTrend;
    if (rate > 1.5) trend = "RUNAWAY";       // > 1.5°C/min = thermal runaway
    else if (rate > 0.5) trend = "RISING";   // 0.5-1.5°C/min = concerning
    else trend = "STABLE";                   // < 0.5°C/min = normal

    return {
        rate: Math.round(rate * 100) / 100,
        trend,
        samples: tempHistory.length,
    };
}

// ─── Degradation Tracking (Linear Regression) ──────────────

export interface DegradationResult {
    slope: number;             // health score change per day (negative = degrading)
    daysToThreshold: number | null;  // estimated days until health < 30%
    isAccelerating: boolean;   // true if recent slope is steeper than overall
    dataPoints: number;
}

/**
 * Track health score degradation using linear regression.
 * Projects when health will cross the CRITICAL threshold (30%).
 */
export function trackDegradation(poleId: string): DegradationResult {
    const history = getHealthScoreHistory(poleId, 30);

    if (history.length < 5) {
        return { slope: 0, daysToThreshold: null, isAccelerating: false, dataPoints: history.length };
    }

    // Convert to (dayIndex, healthScore) pairs
    const firstTime = new Date(history[0].timestamp).getTime();
    const points = history.map(h => ({
        x: (new Date(h.timestamp).getTime() - firstTime) / (24 * 60 * 60 * 1000), // days
        y: h.healthScore,
    }));

    // Linear regression: y = mx + b
    const n = points.length;
    const sumX = points.reduce((s, p) => s + p.x, 0);
    const sumY = points.reduce((s, p) => s + p.y, 0);
    const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
    const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);

    const denom = n * sumX2 - sumX * sumX;
    if (Math.abs(denom) < 0.0001) {
        return { slope: 0, daysToThreshold: null, isAccelerating: false, dataPoints: n };
    }

    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;

    // Project days to threshold (health < 30%)
    const threshold = 30;
    const currentHealth = points[points.length - 1].y;
    let daysToThreshold: number | null = null;

    if (slope < -0.01) {
        // Health is declining
        const currentDay = points[points.length - 1].x;
        const thresholdDay = (threshold - intercept) / slope;
        daysToThreshold = Math.max(0, Math.round(thresholdDay - currentDay));
    }

    // Check if degradation is accelerating (compare last 25% vs overall slope)
    let isAccelerating = false;
    if (points.length >= 20) {
        const recentPoints = points.slice(-Math.floor(n * 0.25));
        const rn = recentPoints.length;
        const rSumX = recentPoints.reduce((s, p) => s + p.x, 0);
        const rSumY = recentPoints.reduce((s, p) => s + p.y, 0);
        const rSumXY = recentPoints.reduce((s, p) => s + p.x * p.y, 0);
        const rSumX2 = recentPoints.reduce((s, p) => s + p.x * p.x, 0);
        const rDenom = rn * rSumX2 - rSumX * rSumX;
        if (Math.abs(rDenom) > 0.0001) {
            const recentSlope = (rn * rSumXY - rSumX * rSumY) / rDenom;
            isAccelerating = recentSlope < slope * 1.5; // recent decline is 50% steeper
        }
    }

    return {
        slope: Math.round(slope * 1000) / 1000,
        daysToThreshold,
        isAccelerating,
        dataPoints: n,
    };
}

// ─── Prediction Confidence Scoring ─────────────────────────

/**
 * Compute confidence score (0-100%) for a prediction.
 * Based on: data completeness, history length, and reading consistency.
 */
export function computeConfidence(pole: PoleData): number {
    let confidence = 0;

    // History depth (more data = higher confidence), max 30 pts
    const historyBonus = Math.min(30, pole.history.length * 1.5);
    confidence += historyBonus;

    // Data completeness (are key readings present?), max 25 pts
    if (pole.voltage > 0) confidence += 5;
    if (pole.current >= 0) confidence += 5;
    if (pole.temperature > 0) confidence += 5;
    if (pole.healthScore > 0) confidence += 5;
    if (pole.signal > 0) confidence += 5;

    // Recency (how fresh is the data?), max 20 pts
    const ageMs = Date.now() - new Date(pole.lastSeen).getTime();
    if (ageMs < 10_000) confidence += 20;        // < 10 seconds
    else if (ageMs < 30_000) confidence += 15;   // < 30 seconds
    else if (ageMs < 60_000) confidence += 10;   // < 1 minute
    else if (ageMs < 300_000) confidence += 5;   // < 5 minutes

    // Reading stability (low std dev = stable readings = higher confidence), max 15 pts
    if (pole.history.length >= 5) {
        const recentVolts = pole.history.slice(-5).map(h => h.voltage);
        const voltageStd = standardDeviation(recentVolts);
        if (voltageStd < 3) confidence += 15;
        else if (voltageStd < 8) confidence += 10;
        else if (voltageStd < 15) confidence += 5;
    }

    // Event context (recent events provide signal), max 10 pts
    const recentEvents = pole.events.filter(
        e => Date.now() - new Date(e.timestamp).getTime() < 3600_000
    ).length;
    if (recentEvents > 0) confidence += Math.min(10, recentEvents * 2);

    return Math.min(100, Math.round(confidence));
}

// ─── Feeder-Level Anomaly Baselining (Phase 3) ─────────────

export interface FeederBaseline {
    feederId: string;
    baseline: {
        avgLoad: number;        // kW average
        stdLoad: number;        // kW standard deviation
        avgVoltage: number;
        stdVoltage: number;
        avgTemperature: number;
        stdTemperature: number;
    };
    current: {
        load: number;
        voltage: number;
        temperature: number;
    };
    zScores: {
        load: number;
        voltage: number;
        temperature: number;
    };
    anomalies: string[];
    isAnomalous: boolean;
}

/**
 * Compute per-feeder baseline using current pole data and detect Z-score anomalies.
 * Adaptive thresholds: a residential feeder's "anomaly" is an industrial feeder's "normal".
 */
export function computeFeederBaseline(
    feederId: string,
    feederPoles: PoleData[]
): FeederBaseline {
    if (feederPoles.length === 0) {
        return {
            feederId,
            baseline: { avgLoad: 0, stdLoad: 0, avgVoltage: 0, stdVoltage: 0, avgTemperature: 0, stdTemperature: 0 },
            current: { load: 0, voltage: 0, temperature: 0 },
            zScores: { load: 0, voltage: 0, temperature: 0 },
            anomalies: [],
            isAnomalous: false,
        };
    }

    // Collect all historical readings for baseline
    const allLoads: number[] = [];
    const allVoltages: number[] = [];
    const allTemps: number[] = [];

    for (const pole of feederPoles) {
        for (const h of pole.history) {
            allLoads.push(h.power);
            allVoltages.push(h.voltage);
            allTemps.push(h.temperature);
        }
    }

    // Compute baseline statistics
    const avgLoad = mean(allLoads);
    const stdLoad = allLoads.length > 1 ? standardDeviation(allLoads) : 1;
    const avgVoltage = mean(allVoltages);
    const stdVoltage = allVoltages.length > 1 ? standardDeviation(allVoltages) : 1;
    const avgTemperature = mean(allTemps);
    const stdTemperature = allTemps.length > 1 ? standardDeviation(allTemps) : 1;

    // Current values (aggregate of current pole readings)
    const currentLoad = feederPoles.reduce((s, p) => s + p.power, 0);
    const currentVoltage = mean(feederPoles.map(p => p.voltage));
    const currentTemp = mean(feederPoles.map(p => p.temperature));

    // Z-scores (how many standard deviations from baseline)
    const zLoad = stdLoad > 0.01 ? (currentLoad - avgLoad * feederPoles.length) / (stdLoad * Math.sqrt(feederPoles.length)) : 0;
    const zVoltage = stdVoltage > 0.01 ? (currentVoltage - avgVoltage) / stdVoltage : 0;
    const zTemp = stdTemperature > 0.01 ? (currentTemp - avgTemperature) / stdTemperature : 0;

    // Detect anomalies (|Z| > 2.5 = anomalous, > 3.0 = critical)
    const anomalies: string[] = [];
    if (Math.abs(zLoad) > 3.0) anomalies.push(`CRITICAL: Load Z-score ${zLoad.toFixed(2)} — extreme deviation`);
    else if (Math.abs(zLoad) > 2.5) anomalies.push(`WARNING: Load Z-score ${zLoad.toFixed(2)} — unusual load pattern`);

    if (Math.abs(zVoltage) > 3.0) anomalies.push(`CRITICAL: Voltage Z-score ${zVoltage.toFixed(2)} — extreme deviation`);
    else if (Math.abs(zVoltage) > 2.5) anomalies.push(`WARNING: Voltage Z-score ${zVoltage.toFixed(2)} — voltage instability`);

    if (zTemp > 2.5) anomalies.push(`WARNING: Temperature Z-score ${zTemp.toFixed(2)} — feeder running hot`);

    return {
        feederId,
        baseline: {
            avgLoad: round2(avgLoad),
            stdLoad: round2(stdLoad),
            avgVoltage: round2(avgVoltage),
            stdVoltage: round2(stdVoltage),
            avgTemperature: round2(avgTemperature),
            stdTemperature: round2(stdTemperature),
        },
        current: {
            load: round2(currentLoad),
            voltage: round2(currentVoltage),
            temperature: round2(currentTemp),
        },
        zScores: {
            load: round2(zLoad),
            voltage: round2(zVoltage),
            temperature: round2(zTemp),
        },
        anomalies,
        isAnomalous: anomalies.length > 0,
    };
}

function mean(arr: number[]): number {
    return arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
}

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}

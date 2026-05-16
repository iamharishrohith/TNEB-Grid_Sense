// ═══════════════════════════════════════════════════════════════════
//  TN-GridSense Backend — Pole Data Simulator
//  Generates realistic telemetry for poles across all 38 TN districts
// ═══════════════════════════════════════════════════════════════════

import type { TelemetryPacket, PoleStatus } from "./types";

// ─── All 38 Tamil Nadu Districts with Feeders ───────────────

interface DistrictConfig {
    id: string;
    hq: string;
    zone: string;
    feeders: string[];
    polesPerFeeder: [number, number]; // min, max
}

const DISTRICTS: DistrictConfig[] = [
    { id: "ARIYALUR", hq: "Ariyalur", zone: "EAST", feeders: ["FDR-ARY-01"], polesPerFeeder: [2, 3] },
    { id: "CHENGALPATTU", hq: "Chengalpattu", zone: "NORTH", feeders: ["FDR-CGP-01", "FDR-CGP-02"], polesPerFeeder: [2, 3] },
    { id: "CHENNAI", hq: "Chennai", zone: "NORTH", feeders: ["FDR-CHN-01", "FDR-CHN-02", "FDR-CHN-03"], polesPerFeeder: [2, 3] },
    { id: "COIMBATORE", hq: "Coimbatore", zone: "WEST", feeders: ["FDR-CBE-01", "FDR-CBE-02"], polesPerFeeder: [2, 3] },
    { id: "CUDDALORE", hq: "Cuddalore", zone: "EAST", feeders: ["FDR-CDL-01"], polesPerFeeder: [2, 3] },
    { id: "DHARMAPURI", hq: "Dharmapuri", zone: "WEST", feeders: ["FDR-DPI-01"], polesPerFeeder: [2, 3] },
    { id: "DINDIGUL", hq: "Dindigul", zone: "SOUTH", feeders: ["FDR-DGL-01"], polesPerFeeder: [2, 3] },
    { id: "ERODE", hq: "Erode", zone: "WEST", feeders: ["FDR-ERD-01", "FDR-ERD-02"], polesPerFeeder: [2, 3] },
    { id: "KALLAKURICHI", hq: "Kallakurichi", zone: "EAST", feeders: ["FDR-KKC-01"], polesPerFeeder: [2, 3] },
    { id: "KANCHEEPURAM", hq: "Kancheepuram", zone: "NORTH", feeders: ["FDR-KPM-01"], polesPerFeeder: [2, 3] },
    { id: "KANNIYAKUMARI", hq: "Nagercoil", zone: "SOUTH", feeders: ["FDR-KKM-01"], polesPerFeeder: [2, 3] },
    { id: "KARUR", hq: "Karur", zone: "WEST", feeders: ["FDR-KRR-01"], polesPerFeeder: [2, 3] },
    { id: "KRISHNAGIRI", hq: "Krishnagiri", zone: "WEST", feeders: ["FDR-KGI-01"], polesPerFeeder: [2, 3] },
    { id: "MADURAI", hq: "Madurai", zone: "SOUTH", feeders: ["FDR-MDU-01", "FDR-MDU-02"], polesPerFeeder: [2, 3] },
    { id: "MAYILADUTHURAI", hq: "Mayiladuthurai", zone: "EAST", feeders: ["FDR-MYL-01"], polesPerFeeder: [2, 3] },
    { id: "NAGAPATTINAM", hq: "Nagapattinam", zone: "EAST", feeders: ["FDR-NGP-01"], polesPerFeeder: [2, 3] },
    { id: "NAMAKKAL", hq: "Namakkal", zone: "WEST", feeders: ["FDR-NMK-01"], polesPerFeeder: [2, 3] },
    { id: "PERAMBALUR", hq: "Perambalur", zone: "EAST", feeders: ["FDR-PMB-01"], polesPerFeeder: [2, 3] },
    { id: "PUDUKKOTTAI", hq: "Pudukkottai", zone: "SOUTH", feeders: ["FDR-PDK-01"], polesPerFeeder: [2, 3] },
    { id: "RAMANATHAPURAM", hq: "Ramanathapuram", zone: "SOUTH", feeders: ["FDR-RMD-01"], polesPerFeeder: [2, 3] },
    { id: "RANIPET", hq: "Ranipet", zone: "NORTH", feeders: ["FDR-RPT-01"], polesPerFeeder: [2, 3] },
    { id: "SALEM", hq: "Salem", zone: "WEST", feeders: ["FDR-SLM-01", "FDR-SLM-02"], polesPerFeeder: [2, 3] },
    { id: "SIVAGANGA", hq: "Sivaganga", zone: "SOUTH", feeders: ["FDR-SVG-01"], polesPerFeeder: [2, 3] },
    { id: "TENKASI", hq: "Tenkasi", zone: "SOUTH", feeders: ["FDR-TKS-01"], polesPerFeeder: [2, 3] },
    { id: "THANJAVUR", hq: "Thanjavur", zone: "EAST", feeders: ["FDR-TNJ-01", "FDR-TNJ-02"], polesPerFeeder: [2, 3] },
    { id: "THENI", hq: "Theni", zone: "SOUTH", feeders: ["FDR-THN-01"], polesPerFeeder: [2, 3] },
    { id: "TIRUPATHUR", hq: "Tirupathur", zone: "NORTH", feeders: ["FDR-TPR-01"], polesPerFeeder: [2, 3] },
    { id: "TIRUPPUR", hq: "Tiruppur", zone: "WEST", feeders: ["FDR-TPP-01", "FDR-TPP-02"], polesPerFeeder: [2, 3] },
    { id: "TIRUVALLUR", hq: "Tiruvallur", zone: "NORTH", feeders: ["FDR-TVL-01"], polesPerFeeder: [2, 3] },
    { id: "TIRUVANNAMALAI", hq: "Tiruvannamalai", zone: "NORTH", feeders: ["FDR-TVM-01"], polesPerFeeder: [2, 3] },
    { id: "TIRUVARUR", hq: "Tiruvarur", zone: "EAST", feeders: ["FDR-TVR-01"], polesPerFeeder: [2, 3] },
    { id: "THOOTHUKUDI", hq: "Thoothukudi", zone: "SOUTH", feeders: ["FDR-TUT-01"], polesPerFeeder: [2, 3] },
    { id: "TIRUCHIRAPPALLI", hq: "Tiruchirappalli", zone: "EAST", feeders: ["FDR-TRC-01", "FDR-TRC-02"], polesPerFeeder: [2, 3] },
    { id: "TIRUNELVELI", hq: "Tirunelveli", zone: "SOUTH", feeders: ["FDR-TNV-01"], polesPerFeeder: [2, 3] },
    { id: "THE NILGIRIS", hq: "Udagamandalam", zone: "WEST", feeders: ["FDR-NLG-01"], polesPerFeeder: [2, 3] },
    { id: "VELLORE", hq: "Vellore", zone: "NORTH", feeders: ["FDR-VLR-01"], polesPerFeeder: [2, 3] },
    { id: "VILUPPURAM", hq: "Viluppuram", zone: "EAST", feeders: ["FDR-VPM-01"], polesPerFeeder: [2, 3] },
    { id: "VIRUDHUNAGAR", hq: "Virudhunagar", zone: "SOUTH", feeders: ["FDR-VDN-01"], polesPerFeeder: [2, 3] },
];

// ─── Pole Generation ───────────────────────────────────────

interface SimPole {
    poleId: string;
    feederId: string;
    districtId: string;
    zone: string;
    baseVoltage: number;
    baseCurrent: number;
    baseTemp: number;
    faultProbability: number;
    degradationRatio: number;      // Progresses towards 1.0 over time
    degradationRate: number;       // How fast it degrades per tick
}

const SCALE_FACTOR = parseInt(process.env.SCALE || "10"); // Set SCALE=100 for 10K+ poles

function generatePoles(): SimPole[] {
    const poles: SimPole[] = [];
    let poleNum = 1;

    for (const district of DISTRICTS) {
        for (const feeder of district.feeders) {
            const [min, max] = district.polesPerFeeder;
            // Apply scale factor to pole count per feeder
            const count = (min + Math.floor(Math.random() * (max - min + 1))) * SCALE_FACTOR;
            for (let i = 0; i < count; i++) {
                poles.push({
                    poleId: `POLE-${String(poleNum).padStart(5, "0")}`,
                    feederId: feeder,
                    districtId: district.id,
                    zone: district.zone,
                    baseVoltage: 228 + Math.random() * 5,
                    baseCurrent: 3 + Math.random() * 12,
                    baseTemp: 35 + Math.random() * 15,
                    faultProbability: 0.02 + Math.random() * 0.05,
                    degradationRatio: Math.random() * 0.4, // Start between 0 and 40% degraded
                    degradationRate: 0.0001 + (Math.random() * 0.0005) // Simulation ticks
                });
                poleNum++;
            }
        }
    }

    return poles;
}

// ─── Time-of-Day Load Profile ──────────────────────────────

function getLoadMultiplier(): number {
    const hour = new Date().getHours();
    if (hour >= 18 && hour <= 22) return 1.4 + Math.random() * 0.3;
    if (hour >= 7 && hour <= 10) return 1.1 + Math.random() * 0.2;
    if (hour >= 12 && hour <= 17) return 1.0 + Math.random() * 0.15;
    if (hour >= 23 || hour <= 5) return 0.5 + Math.random() * 0.2;
    return 0.8 + Math.random() * 0.2;
}

// ─── Generate Telemetry ────────────────────────────────────

function generateTelemetry(pole: SimPole): TelemetryPacket {
    const loadMult = getLoadMultiplier();
    const now = new Date().toISOString();

    let voltage = pole.baseVoltage + (Math.random() - 0.5) * 6;
    let current = pole.baseCurrent * loadMult + (Math.random() - 0.5) * 2;
    let temperature = pole.baseTemp + current * 1.2 + (Math.random() - 0.5) * 3;

    // Advance Degradation simulation
    // A heavier load (higher loadMult) or inherently faulty pole degrades faster
    pole.degradationRatio += (pole.degradationRate * loadMult * (pole.faultProbability * 10));
    if (pole.degradationRatio > 1.0) pole.degradationRatio = 1.0;

    // Heat and Resistance naturally rise as the asset degrades
    const degradationHeatPenalty = pole.degradationRatio * 25; // Up to +25C purely from age/wear
    temperature += degradationHeatPenalty;

    let status: PoleStatus = "NORMAL";

    const roll = Math.random();
    if (roll < pole.faultProbability * 0.3) {
        voltage = 255 + Math.random() * 15;
        status = "OVERVOLTAGE";
    } else if (roll < pole.faultProbability * 0.5) {
        voltage = 190 + Math.random() * 15;
        status = "UNDERVOLTAGE";
    } else if (roll < pole.faultProbability * 0.7) {
        current = 26 + Math.random() * 5;
        temperature += 10;
        status = "OVERLOAD";
    } else if (roll < pole.faultProbability) {
        temperature = 82 + Math.random() * 15;
        status = "OVERHEAT";
    }

    // Force failure if critical degradation
    if (pole.degradationRatio > 0.95 && status === "NORMAL") {
        status = "OVERHEAT_CRIT";
        temperature = 105 + Math.random() * 10;
    }

    voltage = Math.max(0, Math.min(300, voltage));
    current = Math.max(0, Math.min(40, current));
    temperature = Math.max(20, Math.min(120, temperature));

    // Calculate TTF (Time to Failure) in Simulated Days
    // If degradationRatio = 1.0, TTF = 0
    let predictedTTF = 0;
    if (pole.degradationRatio < 1.0) {
        const remainingDegradation = 1.0 - pole.degradationRatio;
        // Mock math to return a human-readable days-to-failure metric
        predictedTTF = Math.round((remainingDegradation / (pole.degradationRate * 100)) * (7 + Math.random() * 3));
    }

    // Calculate Industrial APFC Params
    // Base PF is usually good (0.95-0.99), but drops randomly to trigger penalties
    let powerFactor = 0.95 + (Math.random() * 0.04);
    if (roll < pole.faultProbability * 1.5) {
        powerFactor = 0.85 + (Math.random() * 0.05); // Penalized PF
    }

    const apparentPower = (voltage * current) / 1000; // kVA
    const activePower = apparentPower * powerFactor; // kW
    // Calculate reactive power (kVAr) using Pythagoras theorem: S^2 = P^2 + Q^2 -> Q = sqrt(S^2 - P^2)
    const reactivePower = Math.sqrt(Math.pow(apparentPower, 2) - Math.pow(activePower, 2));

    // Simulate 8 Capacitor Bank Steps
    // If PF is low, more steps should *try* to be active. We'll simulate some failures by keeping them false when they should be true.
    const stepsNeeded = Math.floor((1 - powerFactor) * 40); // 0.99 needs 0, 0.85 needs 6
    const capacitorSteps = Array(8).fill(false).map((_, i) => {
        // Steps 1-3 are reliable, 4-8 have higher failure rates
        if (i < stepsNeeded) {
            return Math.random() > (i * 0.1);
        }
        return false;
    });

    // We keep 'power' as activePower for backward compatibility with the B2G dashboard
    const power = activePower;

    let health = 100;
    const voltDev = Math.abs(voltage - 230) / 230;
    health -= voltDev * 200;
    health -= (current / 30) * 30;
    if (temperature > 65) health -= (temperature - 65) * 2;
    if (status !== "NORMAL") health -= 15;
    health = Math.max(0, Math.min(100, health));

    return {
        poleId: pole.poleId,
        feederId: pole.feederId,
        districtId: pole.districtId,
        timestamp: now,
        voltage: Math.round(voltage * 100) / 100,
        current: Math.round(current * 100) / 100,
        temperature: Math.round(temperature * 100) / 100,
        power: Math.round(power * 100) / 100,
        healthScore: Math.round(health * 10) / 10,
        relayState: (status as PoleStatus) !== "OVERLOAD_CRIT" && (status as PoleStatus) !== "OVERHEAT_CRIT",
        status,
        signal: -40 - Math.floor(Math.random() * 40),
        uptime: Math.floor(Date.now() / 1000),

        // APFC Extensions
        powerFactor: Math.round(powerFactor * 1000) / 1000,
        activePower: Math.round(activePower * 100) / 100,
        reactivePower: Math.round(reactivePower * 100) / 100,
        capacitorSteps,

        // Predictive Assets AI
        degradationRatio: Math.round(pole.degradationRatio * 100) / 100,
        predictedTTF
    };
}

// ─── Simulator Runner ──────────────────────────────────────

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3000";
const INTERVAL = parseInt(process.env.SIM_INTERVAL || "5000");

const simPoles = generatePoles();

console.log("═══════════════════════════════════════════════════");
console.log("  TN-GridSense Pole Simulator");
console.log(`  Simulating ${simPoles.length} poles across ${DISTRICTS.length} districts`);
console.log(`  Backend: ${BACKEND_URL}`);
console.log(`  Interval: ${INTERVAL}ms`);
console.log("═══════════════════════════════════════════════════");
console.log();

// Print zone distribution
const zones: Record<string, number> = {};
for (const d of DISTRICTS) {
    zones[d.zone] = (zones[d.zone] || 0) + simPoles.filter(p => p.districtId === d.id).length;
}
for (const [zone, count] of Object.entries(zones)) {
    console.log(`  ${zone} Zone: ${count} poles`);
}
console.log(`  Total: ${simPoles.length} poles | ${DISTRICTS.length} districts`);
console.log();

async function sendBatch() {
    let sent = 0;
    let errors = 0;

    for (const pole of simPoles) {
        const packet = generateTelemetry(pole);

        try {
            const res = await fetch(`${BACKEND_URL}/api/telemetry`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": "tn-gridsense-edge-key-2026"
                },
                body: JSON.stringify(packet),
            });

            if (res.ok) sent++;
            else errors++;
        } catch {
            errors++;
        }
    }

    const ts = new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" });
    console.log(
        `[${ts}] Batch: ${sent}/${simPoles.length} sent, ${errors} errors, load×${getLoadMultiplier().toFixed(2)}`
    );
}

sendBatch();
setInterval(sendBatch, INTERVAL);

// ═══════════════════════════════════════════════════════════════════
//  TN-GridSense Backend — Local AI Simulator (Grid Copilot)
//  Simulates a Local SLM (Llama-3/Phi-3) interpreting raw telemetry
// ═══════════════════════════════════════════════════════════════════

import type { PoleData, TelemetryPacket } from "./types";
import { getAllPoles, getPole } from "./store";

// ─── Grid Copilot: Diagnostic Generator ──────────────────────────
export function generateDiagnostics(pole: PoleData): string {
    const alerts: string[] = [];

    // Evaluate APFC
    if (pole.powerFactor !== undefined && pole.powerFactor < 0.90) {
        const inactive = pole.capacitorSteps?.filter(s => !s).length || 0;
        const penalty = ((0.90 - pole.powerFactor) * 100) * 125 * (pole.power / 1000);
        alerts.push(`Warning: APFC Panel Phase Angle critical (${pole.powerFactor.toFixed(3)}). ${inactive > 4 ? `Multiple capacitor banks have failed to engage. ` : ''}Reactive load is uncompensated. Estimated TNEB penalty if unaddressed: ₹${penalty.toFixed(0)}.`);
    }

    // Evaluate Temperatures
    if (pole.temperature > 80) {
        alerts.push(`Critical Thermal Runaway: Transformer operating at ${pole.temperature}°C. Risk of insulation failure is imminent.`);
    } else if (pole.temperature > 65) {
        alerts.push(`Caution: Sustained operating temperature of ${pole.temperature}°C under ${pole.current}A load indicates early signs of coil degradation.`);
    }

    // Evaluate Load
    if (pole.status === 'OVERLOAD' || pole.status === 'OVERLOAD_CRIT') {
        alerts.push(`System Overload: Active Load (${pole.power}kW) exceeds nominal capacity. Grid shedding recommended to prevent cascaded failure.`);
    }

    // If nothing is explicitly wrong, but health is low
    if (alerts.length === 0 && pole.healthScore < 85) {
        alerts.push(`Notice: System health is degrading (${pole.healthScore}%) despite nominal parameters. Recommend preventative maintenance check on contactors.`);
    }

    return alerts.length > 0 ? alerts.join(" ") : "System operating within optimal parameters. No anomalies detected.";
}

// ─── NL2SQL: Natural Language Query Parser ───────────────────────
export function queryGridAgent(prompt: string): { summary: string, data: any[] } {
    const p = prompt.toLowerCase();
    const allPoles = getAllPoles().map(p => getPole(p.poleId)).filter(Boolean) as PoleData[];

    let filteredPoles = [...allPoles];
    let summaryStr = "";

    // Mock NLP Intent Matching
    if (p.includes("power factor") || p.includes("pf") || p.includes("penalty")) {
        filteredPoles = filteredPoles.filter(pole => (pole.powerFactor && pole.powerFactor < 0.90));
        summaryStr = `Found ${filteredPoles.length} industrial nodes operating below the 0.90 Power Factor threshold. These facilities are actively incurring TNEB penalties.`;
    }
    else if (p.includes("temperature") || p.includes("hot") || p.includes("overheat")) {
        filteredPoles = filteredPoles.filter(pole => pole.temperature > 65);
        summaryStr = `Identified ${filteredPoles.length} transformers currently operating above 65°C. Immediate action recommended to prevent insulation breakdown.`;
    }
    else if (p.includes("capacity") || p.includes("load") || p.includes("overload")) {
        filteredPoles = filteredPoles.filter(pole => pole.status.includes("OVERLOAD"));
        summaryStr = `Detected ${filteredPoles.length} nodes exceeding their designed load capacity.`;
    }
    else if (p.includes("fault") || p.includes("down") || p.includes("offline")) {
        filteredPoles = filteredPoles.filter(pole => pole.status !== 'NORMAL');
        summaryStr = `Showing ${filteredPoles.length} active grid faults requiring attention.`;
    }
    else {
        filteredPoles = filteredPoles.slice(0, 10); // Default to top 10
        summaryStr = "I couldn't identify a specific fault metric in your query. Here is a snapshot of 10 active grid nodes for review.";
    }

    return {
        summary: summaryStr,
        data: filteredPoles
    };
}

// ─── Automated Dispatch: Work Order Generator ────────────────────
export function generateWorkOrder(poleId: string): any {
    const pole = getPole(poleId);
    if (!pole) return { error: "Node not found" };

    const diagnostics = generateDiagnostics(pole);
    let tools = ["Standard Lineman Toolkit", "Voltage Detector (HV)"];
    let priority = "Routine";
    let estimatedHours = 2;
    let cause = "Investigate grid anomaly";

    if (pole.status.includes('OVERHEAT')) {
        tools.push("Thermal Camera", "Transformer Insulation Oil tester");
        priority = "CRITICAL";
        estimatedHours = 4;
        cause = "Thermal Runaway / Core Overheating";
    }
    if (pole.status.includes('VOLTAGE') || pole.status === 'MULTI_FAULT') {
        tools.push("Three-Phase Power Analyzer", "Replacement fuses/contactors");
        priority = "HIGH";
        estimatedHours = 3;
        cause = "Voltage Instability / Regulation Failure";
    }
    if (pole.powerFactor && pole.powerFactor < 0.90) {
        tools.push("APFC Contactor spares", "Capacitor Array testing block");
        priority = "URGENT FINANCIAL";
        estimatedHours = 2;
        cause = "APFC Relay Failure / Capacitor Degradation leading to penalties";
    }

    return {
        id: `WO-${Date.now().toString().slice(-6)}`,
        nodeId: pole.poleId,
        feeder: pole.feederId,
        district: pole.districtId,
        priority,
        generatedAt: new Date().toISOString(),
        aiDiagnostics: diagnostics,
        rootCauseHypothesis: cause,
        requiredTools: tools,
        estimatedTimeHours: estimatedHours,
        gpsCoordinates: { lat: "Simulated", lng: "Simulated" }, // Would be pulled from DB
        status: "DRAFTED - Awaiting Engineering Approval"
    };
}

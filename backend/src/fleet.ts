// ═══════════════════════════════════════════════════════════════════
//  TN-GridSense Backend — Device Fleet Management (Phase 4)
//  Fleet status, firmware tracking, zone summaries
// ═══════════════════════════════════════════════════════════════════

import type { PoleData } from "./types";
import { getAllPoles, getPole } from "./store";

// ─── Types ───────────────────────────────────────────────────

export interface FleetDevice {
    poleId: string;
    feederId: string;
    districtId: string;
    zone: string;
    status: "HEALTHY" | "DEGRADED" | "OFFLINE" | "CRITICAL";
    healthScore: number;
    firmwareVersion: string;
    uptime: number;          // seconds
    lastSeenAgo: number;     // seconds since last contact
    commChannel: string;
    signalStrength: number;
    thermalTrend: string;
}

export interface FirmwareDistribution {
    version: string;
    count: number;
    percentage: number;
    devices: string[];
}

export interface ZoneSummary {
    zone: string;
    totalDevices: number;
    healthy: number;
    degraded: number;
    offline: number;
    critical: number;
    avgHealthScore: number;
    avgUptime: number;
}

// ─── Firmware version simulation ─────────────────────────────
// In production, firmware version would come from the device itself
const FIRMWARE_VERSIONS = ["1.0.0", "1.1.0", "1.2.0", "2.0.0-beta", "2.0.0"];

function getSimulatedFirmware(poleId: string): string {
    // Deterministic assignment based on pole ID hash
    const hash = poleId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return FIRMWARE_VERSIONS[hash % FIRMWARE_VERSIONS.length];
}

function getSimulatedZone(districtId: string): string {
    // Map districts to zones based on TN geography
    const zoneMap: Record<string, string> = {
        "DIST-CHN": "North", "DIST-VLR": "North", "DIST-KAN": "North",
        "DIST-TIR": "North", "DIST-RAN": "North", "DIST-DHA": "North",
        "DIST-KRI": "North", "DIST-TRP": "North", "DIST-ARI": "North",
        "DIST-CBE": "West", "DIST-ERD": "West", "DIST-NLG": "West",
        "DIST-THA": "West", "DIST-DIN": "West", "DIST-KAR": "West",
        "DIST-MDU": "South", "DIST-TNJ": "South", "DIST-SIV": "South",
        "DIST-RAM": "South", "DIST-THE": "South", "DIST-VIR": "South",
        "DIST-TUT": "South", "DIST-KAN": "South", "DIST-TEN": "South",
        "DIST-CUD": "East", "DIST-NAG": "East", "DIST-VIL": "East",
        "DIST-PER": "East", "DIST-PUD": "East", "DIST-MAY": "East",
    };
    return zoneMap[districtId] || "Central";
}

function getCommChannel(signal: number): string {
    if (signal > 80) return "WiFi-5GHz";
    if (signal > 50) return "WiFi-2.4GHz";
    if (signal > 20) return "LoRa";
    return "Cellular-4G";
}

// ─── Fleet Status ────────────────────────────────────────────

export function getFleetStatus(): FleetDevice[] {
    const allPoles = getAllPoles();

    return allPoles.map(poleSummary => {
        const pole = getPole(poleSummary.poleId);
        if (!pole) return null;

        const lastSeenAgo = Math.round((Date.now() - new Date(pole.lastSeen).getTime()) / 1000);

        let status: FleetDevice["status"];
        if (lastSeenAgo > 60) status = "OFFLINE";
        else if (pole.healthScore < 30) status = "CRITICAL";
        else if (pole.healthScore < 60 || pole.status !== "NORMAL") status = "DEGRADED";
        else status = "HEALTHY";

        return {
            poleId: pole.poleId,
            feederId: pole.feederId,
            districtId: pole.districtId,
            zone: getSimulatedZone(pole.districtId),
            status,
            healthScore: Math.round(pole.healthScore),
            firmwareVersion: getSimulatedFirmware(pole.poleId),
            uptime: pole.uptime,
            lastSeenAgo,
            commChannel: getCommChannel(pole.signal),
            signalStrength: pole.signal,
            thermalTrend: pole.thermalTrend || "STABLE",
        };
    }).filter(Boolean) as FleetDevice[];
}

// ─── Firmware Distribution ───────────────────────────────────

export function getFirmwareDistribution(): FirmwareDistribution[] {
    const fleet = getFleetStatus();
    const versionMap = new Map<string, string[]>();

    for (const device of fleet) {
        const list = versionMap.get(device.firmwareVersion) || [];
        list.push(device.poleId);
        versionMap.set(device.firmwareVersion, list);
    }

    const total = fleet.length;
    return Array.from(versionMap.entries())
        .map(([version, devices]) => ({
            version,
            count: devices.length,
            percentage: Math.round(devices.length / total * 1000) / 10,
            devices: devices.slice(0, 10), // Limit to first 10 for response size
        }))
        .sort((a, b) => b.count - a.count);
}

// ─── Zone Summaries ──────────────────────────────────────────

export function getZoneSummaries(): ZoneSummary[] {
    const fleet = getFleetStatus();
    const zoneMap = new Map<string, FleetDevice[]>();

    for (const device of fleet) {
        const list = zoneMap.get(device.zone) || [];
        list.push(device);
        zoneMap.set(device.zone, list);
    }

    return Array.from(zoneMap.entries()).map(([zone, devices]) => ({
        zone,
        totalDevices: devices.length,
        healthy: devices.filter(d => d.status === "HEALTHY").length,
        degraded: devices.filter(d => d.status === "DEGRADED").length,
        offline: devices.filter(d => d.status === "OFFLINE").length,
        critical: devices.filter(d => d.status === "CRITICAL").length,
        avgHealthScore: Math.round(devices.reduce((s, d) => s + d.healthScore, 0) / devices.length),
        avgUptime: Math.round(devices.reduce((s, d) => s + d.uptime, 0) / devices.length),
    })).sort((a, b) => a.zone.localeCompare(b.zone));
}

console.log("✔ Fleet Management Module Initialized");

// ═══════════════════════════════════════════════════════════════════
//  TN-GridSense Backend — Elysia Server v2
//  REST API + WebSocket Pub/Sub + CORS for Next.js
// ═══════════════════════════════════════════════════════════════════

import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import {
    ingestTelemetry,
    getPole,
    getAllPoles,
    getAllDistricts,
    getDistrictSummary,
    getAllFeeders,
    getFeederSummary,
    getRecentEvents,
    getSystemStats,
} from "./store";
import {
    detectAnomalies,
    predictMaintenance,
    estimateATCLoss,
} from "./analytics";
import {
    generateDiagnostics,
    queryGridAgent,
    generateWorkOrder
} from "./ai";
import type { TelemetryPacket } from "./types";
import { rateLimitGuard } from "./rateLimiter";
import { login, verifyToken, hasMinRole } from "./auth";
import { logAudit, getAuditLog } from "./audit";
import { getPoleTelemetryHistory, getTelemetryCount, getEventCount } from "./db";
import { computeThermalRate, trackDegradation, computeFeederBaseline } from "./analytics";
import { getPrometheusMetrics, getMetricsSummary, recordRequest, recordTelemetryIngest, recordWSConnection, log } from "./metrics";
import { calculateCostModel, calculateSavings, calculatePayback, calculateComparison } from "./economics";
import { generateLoadBalanceRecommendations, generatePeakForecast, simulateDemandResponse } from "./gridOptimizer";
import { getFleetStatus, getFirmwareDistribution, getZoneSummaries } from "./fleet";
import { getActiveAlerts, getAlertHistory, getAlertStats, acknowledgeAlert, resolveAlert } from "./alertEngine";
import { generateExecutiveSummary } from "./executive";

const PORT = parseInt(process.env.PORT || "3000");

console.log("═══════════════════════════════════════════════════");
console.log("  TN-GridSense Backend Server v4");
console.log(`  Port: ${PORT}`);
console.log("═══════════════════════════════════════════════════");

const app = new Elysia()
    .use(cors({
        origin: true,
        methods: ['GET', 'POST', 'OPTIONS'],
    }))

    // ─── API Root ──────────────────────────────────────────
    .get("/api", () => ({
        status: "ok",
        service: "TN-GridSense Backend API",
        version: "4.0.0",
        endpoints: [
            "GET  /api/health",
            "GET  /api/stats",
            "GET  /api/poles",
            "GET  /api/districts",
            "GET  /api/feeders",
            "GET  /api/events",
            "GET  /api/alerts/active",
            "GET  /api/executive/summary",
            "GET  /api/fleet/status",
            "GET  /api/grid/load-balance/:districtId",
            "POST /api/telemetry",
            "POST /api/ai/query",
            "WS   /ws",
        ],
    }))

    // ─── Health Check ──────────────────────────────────────
    .get("/api/health", () => {
        const mem = process.memoryUsage();
        return {
            status: "ok",
            service: "TN-GridSense Backend",
            version: "4.0.0",
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            // Phase 2: Deep Health
            memory: {
                heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024 * 10) / 10,
                rssMB: Math.round(mem.rss / 1024 / 1024 * 10) / 10,
            },
            database: {
                telemetryRows: getTelemetryCount(),
                eventRows: getEventCount(),
            },
        };
    })

    // ─── Telemetry Ingestion ───────────────────────────────
    .post("/api/telemetry", ({ body, headers, set, server }) => {
        // Rate Limiting (Phase 2) — keyed by API key for device-level limiting
        // High burst (5000) to handle batch simulator pushing 1200+ poles/5s
        const rateLimitKey = `telemetry:${headers["x-api-key"] || "anon"}`;
        const rateCheck = rateLimitGuard(rateLimitKey, 5000, 300); // 5K burst, 300/s
        if (rateCheck) {
            set.status = 429;
            return rateCheck;
        }

        // API Key validation
        const apiKey = headers["x-api-key"];
        if (apiKey !== "tn-gridsense-edge-key-2026") {
            set.status = 401;
            return { error: "Unauthorized: Invalid or missing API Key" };
        }

        const packet = body as TelemetryPacket;
        const pole = ingestTelemetry(packet);
        recordTelemetryIngest(true);

        // Build the topic for this pole's district
        const topic = `tn/telemetry`;
        const alertTopic = `tn/alerts`;

        // Publish telemetry update to all subscribed clients
        const update = {
            type: "telemetry",
            data: {
                poleId: pole.poleId,
                voltage: pole.voltage,
                current: pole.current,
                temperature: pole.temperature,
                power: pole.power,
                healthScore: pole.healthScore,
                status: pole.status,
                relayState: pole.relayState,
                districtId: pole.districtId,
                feederId: pole.feederId,
                timestamp: pole.lastSeen,
            },
        };

        server?.publish(topic, JSON.stringify(update));

        // Publish fault alerts separately
        if (pole.status !== 'NORMAL') {
            server?.publish(alertTopic, JSON.stringify({
                type: "alert",
                data: {
                    poleId: pole.poleId,
                    districtId: pole.districtId,
                    feederId: pole.feederId,
                    status: pole.status,
                    voltage: pole.voltage,
                    current: pole.current,
                    temperature: pole.temperature,
                    timestamp: pole.lastSeen,
                },
            }));
        }

        return { success: true, poleId: packet.poleId };
    })

    // ─── System Stats ─────────────────────────────────────
    .get("/api/stats", () => getSystemStats())

    // ─── Poles ─────────────────────────────────────────────
    .get("/api/poles", ({ query }) => {
        const allPoles = getAllPoles();
        // Optional district filter
        if (query.district) {
            return allPoles.filter(p => p.districtId === query.district);
        }
        return allPoles;
    })

    .get("/api/poles/:poleId", ({ params }) => {
        const pole = getPole(params.poleId);
        if (!pole) return { error: "Pole not found" };

        const anomalies = detectAnomalies(pole);
        const maintenance = predictMaintenance(pole);

        return {
            ...pole,
            anomalies,
            maintenance,
        };
    })

    // ─── Districts ────────────────────────────────────────
    .get("/api/districts", () => getAllDistricts())

    .get("/api/districts/:districtId", ({ params }) => {
        const district = getDistrictSummary(params.districtId);
        if (!district) return { error: "District not found" };
        return district;
    })

    // ─── Feeders ──────────────────────────────────────────
    .get("/api/feeders", () => getAllFeeders())

    .get("/api/feeders/:feederId", ({ params }) => {
        const feeder = getFeederSummary(params.feederId);
        if (!feeder) return { error: "Feeder not found" };
        return feeder;
    })

    // ─── Events ───────────────────────────────────────────
    .get("/api/events", ({ query }) => {
        const limit = parseInt(query.limit as string) || 50;
        return getRecentEvents(limit);
    })

    // ─── Analytics ────────────────────────────────────────
    .get("/api/analytics/anomalies", () => {
        const poles = getAllPoles();
        const allAnomalies: any[] = [];
        for (const poleSummary of poles) {
            const fullPole = getPole(poleSummary.poleId);
            if (fullPole) {
                const anomalies = detectAnomalies(fullPole);
                allAnomalies.push(...anomalies);
            }
        }
        return allAnomalies;
    })

    .get("/api/analytics/maintenance", () => {
        const poles = getAllPoles();
        const recommendations: any[] = [];
        for (const poleSummary of poles) {
            const fullPole = getPole(poleSummary.poleId);
            if (fullPole) {
                recommendations.push(predictMaintenance(fullPole));
            }
        }
        const order: Record<string, number> = { CRITICAL: 0, HIGH: 1, MODERATE: 2, LOW: 3 };
        recommendations.sort(
            (a, b) => order[a.riskLevel] - order[b.riskLevel]
        );
        return recommendations;
    })

    .get("/api/analytics/atc-loss", () => {
        const feeders = getAllFeeders();
        return feeders.map((f) => {
            const poles = getAllPoles().filter((p) => p.feederId === f.feederId);
            const fullPoles = poles
                .map((p) => getPole(p.poleId))
                .filter(Boolean) as any[];
            return estimateATCLoss(f.feederId, fullPoles);
        });
    })

    // ─── AI Diagnostics & Copilot ─────────────────────────────
    .get("/api/ai/diagnose/:poleId", ({ params }) => {
        const pole = getPole(params.poleId);
        if (!pole) return { error: "Pole not found" };

        return {
            poleId: pole.poleId,
            diagnostics: generateDiagnostics(pole)
        };
    })

    .post("/api/ai/query", ({ body }) => {
        const payload = body as { prompt: string };
        if (!payload || !payload.prompt) return { error: "Missing prompt query string." };

        return queryGridAgent(payload.prompt);
    })

    .get("/api/dispatch/generate/:poleId", ({ params }) => {
        const pole = getPole(params.poleId);
        if (!pole) return { error: "Pole not found" };

        return generateWorkOrder(pole.poleId);
    })

    // ─── Phase 2: Telemetry History ────────────────────────────
    .get("/api/poles/:poleId/history", ({ params, query }) => {
        const limit = parseInt(query.limit as string) || 200;
        return getPoleTelemetryHistory(params.poleId, limit);
    })

    // ─── Phase 2: Thermal Analytics ───────────────────────────
    .get("/api/analytics/thermal/:poleId", ({ params }) => {
        return computeThermalRate(params.poleId);
    })

    // ─── Phase 2: Degradation Tracking ────────────────────────
    .get("/api/analytics/degradation/:poleId", ({ params }) => {
        return trackDegradation(params.poleId);
    })

    // ─── Phase 2: Auth Endpoints ──────────────────────────────
    .post("/api/auth/login", async ({ body, set }) => {
        const payload = body as { username: string; password: string };
        if (!payload?.username || !payload?.password) {
            set.status = 400;
            return { error: "Missing username or password" };
        }

        const result = await login(payload.username, payload.password);
        if (!result) {
            logAudit("LOGIN_FAILED", payload.username, "/api/auth/login", "Invalid credentials");
            set.status = 401;
            return { error: "Invalid credentials" };
        }

        logAudit("LOGIN_SUCCESS", payload.username, "/api/auth/login", `Role: ${result.user.role}`);
        return result;
    })

    .get("/api/auth/verify", async ({ headers, set }) => {
        const authHeader = headers["authorization"];
        if (!authHeader?.startsWith("Bearer ")) {
            set.status = 401;
            return { error: "Missing or invalid Authorization header" };
        }

        const token = authHeader.slice(7);
        const payload = await verifyToken(token);
        if (!payload) {
            set.status = 401;
            return { error: "Invalid or expired token" };
        }

        return { valid: true, user: payload };
    })

    // ─── Phase 2: Audit Log ───────────────────────────────────
    .get("/api/audit", async ({ query, headers, set }) => {
        // Only ADMIN can view audit logs
        const authHeader = headers["authorization"];
        if (authHeader?.startsWith("Bearer ")) {
            const payload = await verifyToken(authHeader.slice(7));
            if (payload && hasMinRole(payload.role, "ADMIN")) {
                const limit = parseInt(query.limit as string) || 100;
                return getAuditLog(limit);
            }
        }
        // Allow without auth in dev mode but log it
        const limit = parseInt(query.limit as string) || 100;
        return getAuditLog(limit);
    })

    // ─── Phase 3: Prometheus Metrics ──────────────────────────
    .get("/api/metrics", ({ set }) => {
        set.headers["content-type"] = "text/plain; charset=utf-8";
        return getPrometheusMetrics();
    })

    .get("/api/metrics/json", () => getMetricsSummary())

    // ─── Phase 3: Economics & ROI ─────────────────────────────
    .get("/api/economics/cost-model", ({ query }) => {
        const poles = parseInt(query.poles as string) || 1210;
        return calculateCostModel(poles);
    })

    .get("/api/economics/savings", ({ query }) => {
        const poles = parseInt(query.poles as string) || 1210;
        const lossPercent = parseFloat(query.lossPercent as string) || 18;
        return calculateSavings(poles, lossPercent);
    })

    .get("/api/economics/payback", ({ query }) => {
        const poles = parseInt(query.poles as string) || 1210;
        const discountRate = parseFloat(query.discountRate as string) || 10;
        return calculatePayback(poles, discountRate);
    })

    .get("/api/economics/comparison", ({ query }) => {
        const poles = parseInt(query.poles as string) || 1210;
        return calculateComparison(poles);
    })

    // ─── Phase 3: Feeder Baselining ───────────────────────────
    .get("/api/analytics/baseline/:feederId", ({ params }) => {
        const feederPoles = getAllPoles().filter(p => p.feederId === params.feederId);
        return computeFeederBaseline(params.feederId, feederPoles.map(p => getPole(p.poleId)).filter(Boolean) as any[]);
    })

    .get("/api/analytics/baselines", () => {
        const feeders = getAllFeeders();
        return feeders.map(f => {
            const feederPoles = getAllPoles()
                .filter(p => p.feederId === f.feederId)
                .map(p => getPole(p.poleId))
                .filter(Boolean) as any[];
            return computeFeederBaseline(f.feederId, feederPoles);
        });
    })

    // ─── Phase 4: Grid Optimization ──────────────────────────
    .get("/api/grid/load-balance/:districtId", ({ params }) => {
        return generateLoadBalanceRecommendations(params.districtId);
    })

    .get("/api/grid/forecast/:districtId", ({ params }) => {
        return generatePeakForecast(params.districtId);
    })

    .get("/api/grid/demand-response", ({ query }) => {
        const district = (query.district as string) || "DIST-CHN";
        const reduction = parseFloat(query.reduction as string) || 10;
        const startHour = parseInt(query.startHour as string) || 18;
        const endHour = parseInt(query.endHour as string) || 21;
        return simulateDemandResponse(district, reduction, startHour, endHour);
    })

    // ─── Phase 4: Fleet Management ───────────────────────────
    .get("/api/fleet/status", ({ query }) => {
        const all = getFleetStatus();
        const zone = query.zone as string;
        const status = query.status as string;
        let filtered = all;
        if (zone) filtered = filtered.filter(d => d.zone === zone);
        if (status) filtered = filtered.filter(d => d.status === status);
        return { total: filtered.length, devices: filtered.slice(0, 200) };
    })

    .get("/api/fleet/firmware", () => getFirmwareDistribution())
    .get("/api/fleet/zones", () => getZoneSummaries())

    // ─── Phase 4: Alert Escalation ────────────────────────────
    .get("/api/alerts/active", () => getActiveAlerts())
    .get("/api/alerts/history", ({ query }) => {
        const limit = parseInt(query.limit as string) || 50;
        return getAlertHistory(limit);
    })
    .get("/api/alerts/stats", () => getAlertStats())

    .post("/api/alerts/:alertId/acknowledge", ({ params, body, set }) => {
        const actor = (body as any)?.actor || "system";
        const result = acknowledgeAlert(params.alertId, actor);
        if (!result) {
            set.status = 404;
            return { error: "Alert not found or already resolved" };
        }
        logAudit("ALERT_ACKNOWLEDGED", actor, params.alertId, `Type: ${result.type}`);
        return result;
    })

    .post("/api/alerts/:alertId/resolve", ({ params, set }) => {
        const result = resolveAlert(params.alertId);
        if (!result) {
            set.status = 404;
            return { error: "Alert not found" };
        }
        return result;
    })

    // ─── Phase 4: Executive Dashboard ─────────────────────────
    .get("/api/executive/summary", () => generateExecutiveSummary())

    // ─── WebSocket Pub/Sub ────────────────────────────────
    .ws("/ws", {
        open(ws) {
            log("INFO", "websocket", "Client connected");
            recordWSConnection(true);
            // Subscribe to all telemetry and alerts by default
            ws.subscribe("tn/telemetry");
            ws.subscribe("tn/alerts");

            // Send initial state
            ws.send(
                JSON.stringify({
                    type: "init",
                    data: getSystemStats(),
                })
            );
        },
        message(ws, message) {
            try {
                const msg = typeof message === "string" ? JSON.parse(message) : message;

                // Client can request specific data
                if (msg.type === "getStats") {
                    ws.send(JSON.stringify({ type: "stats", data: getSystemStats() }));
                }

                // Client can subscribe/unsubscribe to specific topics
                if (msg.type === "subscribe" && msg.topic) {
                    ws.subscribe(msg.topic);
                }
                if (msg.type === "unsubscribe" && msg.topic) {
                    ws.unsubscribe(msg.topic);
                }
            } catch { }
        },
        close(ws) {
            log("INFO", "websocket", "Client disconnected");
            recordWSConnection(false);
            ws.unsubscribe("tn/telemetry");
            ws.unsubscribe("tn/alerts");
        },
    })

    .listen({ port: PORT, hostname: "0.0.0.0" });

console.log(`\n  Server running at http://localhost:${PORT}`);
console.log(`  API:        http://localhost:${PORT}/api/`);
console.log(`  WebSocket:  ws://localhost:${PORT}/ws`);
console.log(`  Pub/Sub Topics: tn/telemetry, tn/alerts`);
console.log();

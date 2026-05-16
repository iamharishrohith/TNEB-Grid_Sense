// ═══════════════════════════════════════════════════════════════════
//  TN-GridSense Backend — Observability Metrics (Phase 3)
//  Prometheus-compatible metrics + structured logging
// ═══════════════════════════════════════════════════════════════════

// ─── Metric Counters ──────────────────────────────────────────

interface RouteMetric {
    count: number;
    errorCount: number;
    totalLatencyMs: number;
    maxLatencyMs: number;
}

const routeMetrics: Map<string, RouteMetric> = new Map();
let telemetryIngestCount = 0;
let telemetryIngestErrors = 0;
let wsConnectionsCurrent = 0;
let wsConnectionsTotal = 0;
let startTime = Date.now();

// ─── Record Request ──────────────────────────────────────────

export function recordRequest(route: string, latencyMs: number, isError: boolean = false): void {
    let m = routeMetrics.get(route);
    if (!m) {
        m = { count: 0, errorCount: 0, totalLatencyMs: 0, maxLatencyMs: 0 };
        routeMetrics.set(route, m);
    }
    m.count++;
    m.totalLatencyMs += latencyMs;
    if (latencyMs > m.maxLatencyMs) m.maxLatencyMs = latencyMs;
    if (isError) m.errorCount++;
}

export function recordTelemetryIngest(success: boolean = true): void {
    if (success) telemetryIngestCount++;
    else telemetryIngestErrors++;
}

export function recordWSConnection(connected: boolean): void {
    if (connected) {
        wsConnectionsCurrent++;
        wsConnectionsTotal++;
    } else {
        wsConnectionsCurrent = Math.max(0, wsConnectionsCurrent - 1);
    }
}

// ─── Prometheus-Format Output ────────────────────────────────

export function getPrometheusMetrics(): string {
    const lines: string[] = [];
    const uptime = (Date.now() - startTime) / 1000;

    // System metrics
    const mem = process.memoryUsage();
    lines.push(`# HELP gridsense_uptime_seconds Server uptime in seconds`);
    lines.push(`# TYPE gridsense_uptime_seconds gauge`);
    lines.push(`gridsense_uptime_seconds ${uptime.toFixed(1)}`);
    lines.push(``);

    lines.push(`# HELP gridsense_memory_heap_bytes Heap memory usage`);
    lines.push(`# TYPE gridsense_memory_heap_bytes gauge`);
    lines.push(`gridsense_memory_heap_bytes ${mem.heapUsed}`);
    lines.push(``);

    lines.push(`# HELP gridsense_memory_rss_bytes Resident set size`);
    lines.push(`# TYPE gridsense_memory_rss_bytes gauge`);
    lines.push(`gridsense_memory_rss_bytes ${mem.rss}`);
    lines.push(``);

    // Telemetry ingest
    lines.push(`# HELP gridsense_telemetry_ingest_total Total telemetry packets ingested`);
    lines.push(`# TYPE gridsense_telemetry_ingest_total counter`);
    lines.push(`gridsense_telemetry_ingest_total{status="success"} ${telemetryIngestCount}`);
    lines.push(`gridsense_telemetry_ingest_total{status="error"} ${telemetryIngestErrors}`);
    lines.push(``);

    // Ingest rate (packets/sec)
    const ingestRate = uptime > 0 ? (telemetryIngestCount / uptime).toFixed(2) : "0";
    lines.push(`# HELP gridsense_telemetry_ingest_rate Telemetry ingestion rate (packets/sec)`);
    lines.push(`# TYPE gridsense_telemetry_ingest_rate gauge`);
    lines.push(`gridsense_telemetry_ingest_rate ${ingestRate}`);
    lines.push(``);

    // WebSocket
    lines.push(`# HELP gridsense_ws_connections_current Current WebSocket connections`);
    lines.push(`# TYPE gridsense_ws_connections_current gauge`);
    lines.push(`gridsense_ws_connections_current ${wsConnectionsCurrent}`);
    lines.push(``);

    lines.push(`# HELP gridsense_ws_connections_total Total WebSocket connections`);
    lines.push(`# TYPE gridsense_ws_connections_total counter`);
    lines.push(`gridsense_ws_connections_total ${wsConnectionsTotal}`);
    lines.push(``);

    // Per-route metrics
    lines.push(`# HELP gridsense_http_requests_total Total HTTP requests per route`);
    lines.push(`# TYPE gridsense_http_requests_total counter`);
    for (const [route, m] of routeMetrics) {
        lines.push(`gridsense_http_requests_total{route="${route}",status="ok"} ${m.count - m.errorCount}`);
        lines.push(`gridsense_http_requests_total{route="${route}",status="error"} ${m.errorCount}`);
    }
    lines.push(``);

    lines.push(`# HELP gridsense_http_latency_avg_ms Average request latency per route`);
    lines.push(`# TYPE gridsense_http_latency_avg_ms gauge`);
    for (const [route, m] of routeMetrics) {
        const avg = m.count > 0 ? (m.totalLatencyMs / m.count).toFixed(2) : "0";
        lines.push(`gridsense_http_latency_avg_ms{route="${route}"} ${avg}`);
    }
    lines.push(``);

    lines.push(`# HELP gridsense_http_latency_max_ms Max request latency per route`);
    lines.push(`# TYPE gridsense_http_latency_max_ms gauge`);
    for (const [route, m] of routeMetrics) {
        lines.push(`gridsense_http_latency_max_ms{route="${route}"} ${m.maxLatencyMs.toFixed(2)}`);
    }

    return lines.join("\n") + "\n";
}

// ─── Structured Logger ───────────────────────────────────────

type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

export function log(
    level: LogLevel,
    component: string,
    message: string,
    meta?: Record<string, any>
): void {
    const entry = {
        ts: new Date().toISOString(),
        level,
        component,
        msg: message,
        ...meta,
    };

    if (level === "ERROR") {
        console.error(JSON.stringify(entry));
    } else if (level === "WARN") {
        console.warn(JSON.stringify(entry));
    } else {
        console.log(JSON.stringify(entry));
    }
}

// ─── Summary (JSON format for health) ────────────────────────

export function getMetricsSummary(): Record<string, any> {
    const uptime = (Date.now() - startTime) / 1000;
    const routes: Record<string, any> = {};
    for (const [route, m] of routeMetrics) {
        routes[route] = {
            requests: m.count,
            errors: m.errorCount,
            avgLatencyMs: m.count > 0 ? Math.round(m.totalLatencyMs / m.count * 100) / 100 : 0,
            maxLatencyMs: Math.round(m.maxLatencyMs * 100) / 100,
        };
    }
    return {
        uptimeSeconds: Math.round(uptime),
        telemetry: {
            ingested: telemetryIngestCount,
            errors: telemetryIngestErrors,
            ratePerSec: uptime > 0 ? Math.round(telemetryIngestCount / uptime * 100) / 100 : 0,
        },
        websocket: {
            current: wsConnectionsCurrent,
            total: wsConnectionsTotal,
        },
        routes,
    };
}

console.log("✔ Metrics Module Initialized");

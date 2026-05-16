// ═══════════════════════════════════════════════════════════════════
//  TN-GridSense Backend — Audit Logging (Phase 2)
//  Append-only action log for regulatory compliance
// ═══════════════════════════════════════════════════════════════════

import { Database } from "bun:sqlite";
import type { AuditEntry } from "./types";

// Re-use the same database file
const db = new Database("gridsense.sqlite");

// Create audit_log table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    action TEXT NOT NULL,
    actor TEXT NOT NULL,
    target TEXT NOT NULL,
    details TEXT DEFAULT ''
  );
  CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp DESC);
  CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor);
`);

const insertAuditStmt = db.prepare(`
  INSERT INTO audit_log (timestamp, action, actor, target, details)
  VALUES ($timestamp, $action, $actor, $target, $details)
`);

/**
 * Log an audit event (append-only, immutable).
 */
export function logAudit(
    action: string,
    actor: string,
    target: string,
    details: string = ""
): void {
    try {
        insertAuditStmt.run({
            $timestamp: new Date().toISOString(),
            $action: action,
            $actor: actor,
            $target: target,
            $details: details,
        });
    } catch (e) {
        console.error("Audit Log Error:", e);
    }
}

/**
 * Retrieve recent audit entries.
 */
export function getAuditLog(limit: number = 100): AuditEntry[] {
    return db.query(`
        SELECT * FROM audit_log
        ORDER BY timestamp DESC
        LIMIT ?
    `).all(limit) as AuditEntry[];
}

/**
 * Get audit log count (for health checks).
 */
export function getAuditCount(): number {
    const row = db.query("SELECT COUNT(*) as count FROM audit_log").get() as any;
    return row?.count ?? 0;
}

console.log("✔ Audit Log Module Initialized");

// ═══════════════════════════════════════════════════════════════════
//  TN-GridSense Backend — JWT Authentication & RBAC (Phase 2)
//  Role hierarchy: VIEWER → OPERATOR → ENGINEER → ADMIN
// ═══════════════════════════════════════════════════════════════════

import type { UserRole, AuthPayload } from "./types";

// ─── JWT Secret (in production, use env var) ──────────────────
const JWT_SECRET = "tn-gridsense-jwt-secret-2026";
const TOKEN_EXPIRY_SECONDS = 8 * 60 * 60; // 8 hours

// ─── Demo User Store ──────────────────────────────────────────
interface UserRecord {
    password: string;
    role: UserRole;
    name: string;
}

const users: Record<string, UserRecord> = {
    admin: { password: "admin123", role: "ADMIN", name: "Administrator" },
    engineer: { password: "eng123", role: "ENGINEER", name: "Field Engineer" },
    operator: { password: "op123", role: "OPERATOR", name: "Control Room Operator" },
    viewer: { password: "view123", role: "VIEWER", name: "Dashboard Viewer" },
};

// ─── Role Hierarchy (higher index = more privileges) ─────────
const ROLE_HIERARCHY: UserRole[] = ["VIEWER", "OPERATOR", "ENGINEER", "ADMIN"];

function getRoleLevel(role: UserRole): number {
    return ROLE_HIERARCHY.indexOf(role);
}

// ─── Base64url encode/decode ─────────────────────────────────
function base64url(str: string): string {
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(str: string): string {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    return atob(str);
}

// ─── HMAC-SHA256 Signing ─────────────────────────────────────
async function hmacSign(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(JWT_SECRET),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
    const bytes = new Uint8Array(signature);
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return base64url(binary);
}

// ─── JWT Token Generation ────────────────────────────────────
export async function generateToken(username: string, role: UserRole): Promise<string> {
    const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const now = Math.floor(Date.now() / 1000);
    const payload: AuthPayload = {
        username,
        role,
        iat: now,
        exp: now + TOKEN_EXPIRY_SECONDS,
    };
    const payloadB64 = base64url(JSON.stringify(payload));
    const signature = await hmacSign(`${header}.${payloadB64}`);
    return `${header}.${payloadB64}.${signature}`;
}

// ─── JWT Token Verification ──────────────────────────────────
export async function verifyToken(token: string): Promise<AuthPayload | null> {
    try {
        const parts = token.split(".");
        if (parts.length !== 3) return null;

        const [header, payloadB64, signature] = parts;
        const expectedSig = await hmacSign(`${header}.${payloadB64}`);

        if (signature !== expectedSig) return null;

        const payload: AuthPayload = JSON.parse(base64urlDecode(payloadB64));

        // Check expiry
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp < now) return null;

        return payload;
    } catch {
        return null;
    }
}

// ─── Login ──────────────────────────────────────────────────
export async function login(
    username: string,
    password: string
): Promise<{ token: string; user: { username: string; role: UserRole; name: string } } | null> {
    const user = users[username];
    if (!user || user.password !== password) return null;

    const token = await generateToken(username, user.role);
    return {
        token,
        user: { username, role: user.role, name: user.name },
    };
}

// ─── Role Check ─────────────────────────────────────────────
export function hasMinRole(userRole: UserRole, requiredRole: UserRole): boolean {
    return getRoleLevel(userRole) >= getRoleLevel(requiredRole);
}

console.log("✔ Auth Module Initialized (JWT + RBAC)");

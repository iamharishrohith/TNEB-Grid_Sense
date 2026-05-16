'use client';

import { useEffect, useState, useRef } from 'react';
import { useGridStore } from '@/store/gridStore';
import { Bot, AlertTriangle, ShieldCheck, Zap, X } from 'lucide-react';
import { API_BASE } from '@/lib/api';

interface DiagnosticEntry {
    timestamp: string;
    poleId: string;
    message: string;
    severity: 'critical' | 'warning' | 'ok';
}

export default function GridCopilot() {
    const [isOpen, setIsOpen] = useState(false);
    const [diagnostics, setDiagnostics] = useState<DiagnosticEntry[]>([]);
    const feedRef = useRef<HTMLDivElement>(null);
    const polesMap = useGridStore(s => s.poles);

    // Poll the AI diagnostics endpoint periodically
    useEffect(() => {
        const interval = setInterval(async () => {
            const allPoles = Object.values(polesMap);
            // Pick the worst-health poles for diagnostic analysis
            const worstPoles = [...allPoles]
                .sort((a, b) => a.healthScore - b.healthScore)
                .slice(0, 5);

            for (const pole of worstPoles) {
                try {
                    const res = await fetch(`${API_BASE}/api/ai/diagnose/${pole.poleId}`);
                    const data = await res.json();
                    if (data.diagnostics && !data.diagnostics.includes('optimal parameters')) {
                        const severity = data.diagnostics.includes('Critical') || data.diagnostics.includes('Penalty')
                            ? 'critical'
                            : data.diagnostics.includes('Caution') || data.diagnostics.includes('Warning')
                                ? 'warning' : 'ok';

                        setDiagnostics(prev => {
                            // Prevent duplicate consecutive entries for same pole
                            if (prev.length > 0 && prev[0].poleId === pole.poleId) return prev;
                            const entry: DiagnosticEntry = {
                                timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
                                poleId: pole.poleId,
                                message: data.diagnostics,
                                severity
                            };
                            return [entry, ...prev].slice(0, 20); // Keep last 20
                        });
                    }
                } catch { /* Silently ignore fetch errors */ }
            }
        }, 8000);

        return () => clearInterval(interval);
    }, [polesMap]);

    // Auto-scroll feed
    useEffect(() => {
        if (feedRef.current) {
            feedRef.current.scrollTop = 0;
        }
    }, [diagnostics]);

    const severityIcon = (s: string) => {
        if (s === 'critical') return <AlertTriangle size={14} style={{ color: 'var(--accent-red)' }} />;
        if (s === 'warning') return <Zap size={14} style={{ color: 'var(--accent-amber)' }} />;
        return <ShieldCheck size={14} style={{ color: 'var(--accent-green)' }} />;
    };

    return (
        <>
            {/* Floating Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000,
                    width: '56px', height: '56px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 24px rgba(99, 102, 241, 0.4)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    animation: diagnostics.some(d => d.severity === 'critical') ? 'pulse-critical 2s infinite' : 'none'
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                title="Grid Copilot AI"
            >
                <Bot size={28} color="white" />
                {diagnostics.length > 0 && (
                    <span style={{
                        position: 'absolute', top: '-4px', right: '-4px',
                        background: 'var(--accent-red)', color: 'white',
                        fontSize: '11px', fontWeight: 'bold',
                        width: '20px', height: '20px', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--font-mono)'
                    }}>{diagnostics.length}</span>
                )}
            </button>

            {/* Copilot Panel */}
            {isOpen && (
                <div style={{
                    position: 'fixed', bottom: '90px', right: '24px', zIndex: 999,
                    width: '420px', maxHeight: '520px',
                    background: 'var(--bg-secondary)', border: '1px solid rgba(99, 102, 241, 0.3)',
                    borderRadius: '12px', overflow: 'hidden',
                    boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
                    display: 'flex', flexDirection: 'column',
                    animation: 'fadeSlideUp 0.25s ease-out'
                }}>
                    {/* Header */}
                    <div style={{
                        padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))',
                        borderBottom: '1px solid rgba(99,102,241,0.2)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Bot size={20} style={{ color: '#a78bfa' }} />
                            <span style={{ fontFamily: 'var(--font-tech)', fontSize: '1rem', letterSpacing: '0.08em', color: 'var(--text-bright)' }}>
                                GRID COPILOT
                            </span>
                            <span style={{
                                fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px',
                                background: 'rgba(139,92,246,0.2)', color: '#a78bfa',
                                fontFamily: 'var(--font-mono)', letterSpacing: '0.05em'
                            }}>AI</span>
                        </div>
                        <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                            <X size={18} />
                        </button>
                    </div>

                    {/* Feed */}
                    <div ref={feedRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', maxHeight: '400px' }}>
                        {diagnostics.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b', fontFamily: 'var(--font-tech)' }}>
                                <Bot size={40} style={{ marginBottom: '12px', opacity: 0.3 }} />
                                <p>Analyzing grid telemetry...</p>
                                <p style={{ fontSize: '0.75rem' }}>Diagnostics will appear here when anomalies are detected.</p>
                            </div>
                        ) : (
                            diagnostics.map((d, i) => (
                                <div key={i} style={{
                                    padding: '12px', marginBottom: '8px', borderRadius: '8px',
                                    background: d.severity === 'critical' ? 'rgba(255,0,85,0.08)' : 'rgba(255,255,255,0.02)',
                                    border: `1px solid ${d.severity === 'critical' ? 'rgba(255,0,85,0.2)' : 'rgba(255,255,255,0.05)'}`,
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                        {severityIcon(d.severity)}
                                        <span className="dt-mono" style={{ fontSize: '0.75rem', color: 'var(--accent-blue)' }}>{d.poleId}</span>
                                        <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: '#475569', fontFamily: 'var(--font-mono)' }}>{d.timestamp}</span>
                                    </div>
                                    <p style={{ fontSize: '0.82rem', color: 'var(--text-bright)', lineHeight: 1.5, margin: 0 }}>{d.message}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </>
    );
}

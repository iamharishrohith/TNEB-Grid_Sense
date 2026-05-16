'use client';

import { useEffect, useState } from 'react';
import { useGridStore } from '@/store/gridStore';
import { Send, X, FileText, MapPin, Wrench, Clock, AlertTriangle } from 'lucide-react';
import { API_BASE } from '@/lib/api';

export default function EventFeed() {
    const { alerts } = useGridStore();
    const [initialEvents, setInitialEvents] = useState<any[]>([]);
    const [workOrder, setWorkOrder] = useState<any>(null);
    const [loadingDispatch, setLoadingDispatch] = useState<string | null>(null);

    useEffect(() => {
        fetch(`${API_BASE}/api/events?limit=20`)
            .then(r => r.json())
            .then(setInitialEvents)
            .catch(console.error);
    }, []);

    const allEvents = [...alerts, ...initialEvents].reduce((acc, current) => {
        const x = acc.find((item: any) => item.poleId === current.poleId && item.timestamp === current.timestamp);
        if (!x) {
            return acc.concat([current]);
        } else {
            return acc;
        }
    }, []).sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const handleDispatch = async (poleId: string) => {
        setLoadingDispatch(poleId);
        try {
            const res = await fetch(`${API_BASE}/api/dispatch/generate/${poleId}`);
            const data = await res.json();
            setWorkOrder(data);
        } catch {
            setWorkOrder({ error: 'Failed to generate work order.' });
        }
        setLoadingDispatch(null);
    };

    if (allEvents.length === 0) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', color: '#64748b' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>📡</div>
                <div style={{ fontSize: '0.85rem' }}>Waiting for grid events...</div>
            </div>
        );
    }

    return (
        <>
            <div className="event-list">
                {allEvents.slice(0, 30).map((e: any, i: number) => {
                    const severity = e.severity || (e.status?.includes('CRIT') ? 'CRITICAL' : 'FAULT');
                    const isCritical = severity === 'CRITICAL';

                    return (
                        <div key={`${e.poleId}-${e.timestamp}-${i}`} className="event-item">
                            <div className={`event-dot ${isCritical ? 'critical' : 'fault'}`} />
                            <div className="event-content">
                                <div className="event-message">
                                    {e.message || `${e.status} detected on ${e.poleId}`}
                                </div>
                                <div className="event-meta">
                                    <span className="event-meta-id">{e.poleId}</span>
                                    <span>•</span>
                                    <span>{e.districtId}</span>
                                    <span>•</span>
                                    <span>{new Date(e.timestamp).toLocaleTimeString('en-IN', { hour12: false })}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => handleDispatch(e.poleId)}
                                disabled={loadingDispatch === e.poleId}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: '6px 12px', borderRadius: '6px',
                                    background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)',
                                    color: '#a78bfa', cursor: 'pointer', fontSize: '0.72rem',
                                    fontFamily: 'var(--font-tech)', letterSpacing: '0.05em',
                                    transition: 'all 0.15s', flexShrink: 0
                                }}
                                title="Generate AI Work Order"
                            >
                                <Send size={12} />
                                {loadingDispatch === e.poleId ? 'Drafting...' : 'Dispatch'}
                            </button>
                            <div className={`dt-badge ${severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH'}`}>
                                {severity}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Work Order Modal */}
            {workOrder && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 3000,
                    background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animation: 'fadeSlideUp 0.2s ease-out'
                }} onClick={e => { if (e.target === e.currentTarget) setWorkOrder(null); }}>
                    <div style={{
                        width: '560px', maxHeight: '80vh', overflowY: 'auto',
                        background: 'var(--bg-secondary)', borderRadius: '16px',
                        border: '1px solid rgba(99,102,241,0.3)',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                            background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.05))'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <FileText size={20} style={{ color: '#a78bfa' }} />
                                <span style={{ fontFamily: 'var(--font-tech)', fontSize: '1rem', letterSpacing: '0.08em', color: 'var(--text-bright)' }}>
                                    AI WORK ORDER
                                </span>
                                <span style={{
                                    fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px',
                                    background: workOrder.priority === 'CRITICAL' || workOrder.priority === 'URGENT FINANCIAL' ? 'rgba(255,0,85,0.2)' : 'rgba(251,191,36,0.2)',
                                    color: workOrder.priority === 'CRITICAL' || workOrder.priority === 'URGENT FINANCIAL' ? 'var(--accent-red)' : 'var(--accent-amber)',
                                    fontFamily: 'var(--font-mono)'
                                }}>{workOrder.priority}</span>
                            </div>
                            <button onClick={() => setWorkOrder(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                                <X size={18} />
                            </button>
                        </div>

                        {/* Body */}
                        <div style={{ padding: '24px' }}>
                            {/* Meta Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                                <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ fontSize: '0.65rem', color: '#475569', fontFamily: 'var(--font-tech)', letterSpacing: '0.1em', marginBottom: '4px' }}>WORK ORDER ID</div>
                                    <div className="dt-mono" style={{ color: 'var(--accent-blue)' }}>{workOrder.id}</div>
                                </div>
                                <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ fontSize: '0.65rem', color: '#475569', fontFamily: 'var(--font-tech)', letterSpacing: '0.1em', marginBottom: '4px' }}>TARGET NODE</div>
                                    <div className="dt-mono" style={{ color: 'var(--accent-cyan)' }}>{workOrder.nodeId}</div>
                                </div>
                                <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ fontSize: '0.65rem', color: '#475569', fontFamily: 'var(--font-tech)', letterSpacing: '0.1em', marginBottom: '4px' }}>DISTRICT / FEEDER</div>
                                    <div className="dt-mono" style={{ fontSize: '0.85rem' }}>{workOrder.district} / {workOrder.feeder}</div>
                                </div>
                                <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ fontSize: '0.65rem', color: '#475569', fontFamily: 'var(--font-tech)', letterSpacing: '0.1em', marginBottom: '4px' }}>
                                        <Clock size={10} style={{ display: 'inline', marginRight: '4px' }} />EST. REPAIR TIME
                                    </div>
                                    <div className="dt-mono" style={{ color: 'var(--accent-amber)' }}>{workOrder.estimatedTimeHours} Hours</div>
                                </div>
                            </div>

                            {/* Root Cause */}
                            <div style={{
                                padding: '14px', borderRadius: '8px', marginBottom: '16px',
                                background: 'rgba(255,0,85,0.06)', border: '1px solid rgba(255,0,85,0.15)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                    <AlertTriangle size={14} style={{ color: 'var(--accent-red)' }} />
                                    <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-tech)', color: 'var(--accent-red)', letterSpacing: '0.1em' }}>ROOT CAUSE HYPOTHESIS</span>
                                </div>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-bright)', lineHeight: 1.5, margin: 0 }}>{workOrder.rootCauseHypothesis}</p>
                            </div>

                            {/* AI Diagnostics */}
                            <div style={{
                                padding: '14px', borderRadius: '8px', marginBottom: '16px',
                                background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                    <FileText size={14} style={{ color: '#a78bfa' }} />
                                    <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-tech)', color: '#a78bfa', letterSpacing: '0.1em' }}>AI DIAGNOSTICS</span>
                                </div>
                                <p style={{ fontSize: '0.82rem', color: 'var(--text-bright)', lineHeight: 1.6, margin: 0 }}>{workOrder.aiDiagnostics}</p>
                            </div>

                            {/* Required Tools */}
                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                    <Wrench size={14} style={{ color: '#64748b' }} />
                                    <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-tech)', color: '#64748b', letterSpacing: '0.1em' }}>REQUIRED TOOLS</span>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {workOrder.requiredTools?.map((tool: string, i: number) => (
                                        <span key={i} style={{
                                            padding: '4px 10px', borderRadius: '4px',
                                            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                                            color: '#94a3b8', fontSize: '0.75rem', fontFamily: 'var(--font-mono)'
                                        }}>{tool}</span>
                                    ))}
                                </div>
                            </div>

                            {/* Status */}
                            <div style={{
                                padding: '12px 16px', borderRadius: '8px',
                                background: 'rgba(57,255,20,0.05)', border: '1px solid rgba(57,255,20,0.15)',
                                textAlign: 'center', fontFamily: 'var(--font-tech)', fontSize: '0.8rem',
                                color: 'var(--accent-green)', letterSpacing: '0.05em'
                            }}>
                                {workOrder.status}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

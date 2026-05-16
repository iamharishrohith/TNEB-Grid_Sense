'use client';

import { useState } from 'react';
import { Search, Sparkles, X, Loader2 } from 'lucide-react';
import { API_BASE } from '@/lib/api';

interface QueryResult {
    summary: string;
    data: any[];
}

export default function AIQueryBar() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [result, setResult] = useState<QueryResult | null>(null);
    const [loading, setLoading] = useState(false);

    const handleQuery = async () => {
        if (!query.trim()) return;
        setLoading(true);
        setResult(null);
        try {
            const res = await fetch(`${API_BASE}/api/ai/query`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: query })
            });
            const data = await res.json();
            setResult(data);
        } catch {
            setResult({ summary: 'Failed to connect to the AI backend.', data: [] });
        }
        setLoading(false);
    };

    const suggestions = [
        "Which industries have a Power Factor below 0.90?",
        "Show me all overheating transformers",
        "Which nodes have active faults?",
        "Show high capacity loads"
    ];

    return (
        <>
            {/* Trigger Button (sits in the top bar area) */}
            <button
                onClick={() => setIsOpen(true)}
                style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 16px', borderRadius: '8px',
                    background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.25)',
                    color: '#a78bfa', cursor: 'pointer', fontFamily: 'var(--font-tech)',
                    fontSize: '0.85rem', letterSpacing: '0.05em',
                    transition: 'all 0.2s'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.2)'; e.currentTarget.style.borderColor = 'rgba(139,92,246,0.5)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.1)'; e.currentTarget.style.borderColor = 'rgba(139,92,246,0.25)'; }}
            >
                <Sparkles size={16} /> Ask Grid AI
            </button>

            {/* Modal Overlay */}
            {isOpen && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 2000,
                    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                    paddingTop: '12vh',
                    animation: 'fadeSlideUp 0.2s ease-out'
                }} onClick={e => { if (e.target === e.currentTarget) setIsOpen(false); }}>
                    <div style={{
                        width: '680px', maxHeight: '75vh',
                        background: 'var(--bg-secondary)', borderRadius: '16px',
                        border: '1px solid rgba(139,92,246,0.3)',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                        overflow: 'hidden', display: 'flex', flexDirection: 'column'
                    }}>
                        {/* Search Header */}
                        <div style={{
                            padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '12px',
                            borderBottom: '1px solid rgba(255,255,255,0.06)'
                        }}>
                            <Search size={20} style={{ color: '#a78bfa' }} />
                            <input
                                type="text"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleQuery(); }}
                                placeholder="Ask anything about your grid in natural language..."
                                autoFocus
                                style={{
                                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                                    color: 'var(--text-bright)', fontSize: '1rem',
                                    fontFamily: 'var(--font-tech)', letterSpacing: '0.03em'
                                }}
                            />
                            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                                <X size={18} />
                            </button>
                        </div>

                        {/* Suggestions */}
                        {!result && !loading && (
                            <div style={{ padding: '16px 24px' }}>
                                <div style={{ fontSize: '0.7rem', color: '#475569', fontFamily: 'var(--font-tech)', letterSpacing: '0.1em', marginBottom: '10px' }}>SUGGESTED QUERIES</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {suggestions.map((s, i) => (
                                        <button
                                            key={i}
                                            onClick={() => { setQuery(s); }}
                                            style={{
                                                padding: '6px 12px', borderRadius: '6px',
                                                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                                                color: '#94a3b8', cursor: 'pointer', fontSize: '0.78rem',
                                                fontFamily: 'var(--font-tech)', transition: 'all 0.15s'
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.1)'; e.currentTarget.style.color = '#a78bfa'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#94a3b8'; }}
                                        >{s}</button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Loading */}
                        {loading && (
                            <div style={{ padding: '40px', textAlign: 'center', color: '#a78bfa' }}>
                                <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
                                <p style={{ fontFamily: 'var(--font-tech)', fontSize: '0.85rem' }}>Analyzing grid telemetry...</p>
                            </div>
                        )}

                        {/* Results */}
                        {result && (
                            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
                                {/* AI Summary */}
                                <div style={{
                                    padding: '14px 16px', borderRadius: '10px', marginBottom: '16px',
                                    background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.06))',
                                    border: '1px solid rgba(139,92,246,0.2)',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                        <Sparkles size={14} style={{ color: '#a78bfa' }} />
                                        <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-tech)', color: '#a78bfa', letterSpacing: '0.1em' }}>AI SUMMARY</span>
                                    </div>
                                    <p style={{ fontSize: '0.9rem', color: 'var(--text-bright)', lineHeight: 1.6, margin: 0 }}>{result.summary}</p>
                                </div>

                                {/* Data Table */}
                                {result.data.length > 0 && (
                                    <div className="table-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                        <table className="data-table" style={{ fontSize: '0.8rem' }}>
                                            <thead>
                                                <tr>
                                                    <th className="text-left">Node ID</th>
                                                    <th className="text-center">District</th>
                                                    <th className="text-center">Status</th>
                                                    <th className="text-right">Health</th>
                                                    <th className="text-right">Temp</th>
                                                    <th className="text-right">PF</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {result.data.slice(0, 15).map((p: any) => (
                                                    <tr key={p.poleId}>
                                                        <td className="dt-mono" style={{ color: 'var(--accent-blue)' }}>{p.poleId}</td>
                                                        <td className="dt-mono text-center">{p.districtId}</td>
                                                        <td className="text-center">
                                                            <span style={{
                                                                padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem',
                                                                background: p.status === 'NORMAL' ? 'rgba(57,255,20,0.1)' : 'rgba(255,0,85,0.1)',
                                                                color: p.status === 'NORMAL' ? 'var(--accent-green)' : 'var(--accent-red)',
                                                                fontFamily: 'var(--font-mono)'
                                                            }}>{p.status}</span>
                                                        </td>
                                                        <td className="dt-mono text-right" style={{ color: p.healthScore < 70 ? 'var(--accent-red)' : 'var(--accent-green)' }}>{p.healthScore?.toFixed(0)}%</td>
                                                        <td className="dt-mono text-right">{p.temperature?.toFixed(1)}°C</td>
                                                        <td className="dt-mono text-right" style={{ color: (p.powerFactor || 1) < 0.90 ? 'var(--accent-red)' : '' }}>{p.powerFactor?.toFixed(3) || '--'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}

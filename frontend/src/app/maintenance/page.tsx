'use client';

import { useEffect, useState } from 'react';
import TopsBar from '@/components/TopBar';
import { useRouter } from 'next/navigation';
import { Wrench, ChevronRight, Activity } from 'lucide-react';
import { API_BASE } from '@/lib/api';

export default function MaintenancePage() {
    const [recs, setRecs] = useState<any[]>([]);
    const router = useRouter();

    useEffect(() => {
        fetch(`${API_BASE}/api/analytics/maintenance`)
            .then(r => r.json())
            .then(setRecs)
            .catch(console.error);
    }, []);

    const getRiskBg = (risk: string) => {
        switch (risk) {
            case 'CRITICAL': return 'bg-red-500/10 border-red-500/30 text-red-400';
            case 'HIGH': return 'bg-amber-500/10 border-amber-500/30 text-amber-500';
            case 'MODERATE': return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500';
            default: return 'bg-green-500/10 border-green-500/30 text-green-500';
        }
    };

    return (
        <>
            <TopsBar title="Predictive Maintenance" breadcrumbs={[]} />
            <div className="page-container">
                <div className="page-header-row">
                    <div className="header-icon-box blue">
                        <Wrench size={24} />
                    </div>
                    <div>
                        <h2 className="page-header-title">AI Maintenance Intelligence</h2>
                        <p className="page-header-subtitle">Risk-ranked predictions based on historical wear and live telemetry</p>
                    </div>
                </div>

                <div className="maintenance-grid">
                    {recs.slice(0, 30).map((r, i) => (
                        <div
                            key={r.poleId + i}
                            className={`card maint-card ${r.riskLevel === 'CRITICAL' ? 'critical' : ''}`}
                            onClick={() => router.push(`/pole/${r.poleId}`)}
                        >
                            <div className="maint-card-header">
                                <div>
                                    <div className="maint-pole-id">
                                        {r.poleId} <ChevronRight size={14} className="chevron-icon" />
                                    </div>
                                    <div className="maint-eta-label">EST. ETA: <span className="maint-eta-val">~{r.estimatedDaysToFailure} DAYS</span></div>
                                </div>
                                <div className={`maint-risk-badge ${r.riskLevel} ${r.riskLevel === 'CRITICAL' ? 'text-red-400 bg-red-400/10 border-red-400/30' : r.riskLevel === 'HIGH' ? 'text-amber-500 bg-amber-500/10 border-amber-500/30' : r.riskLevel === 'MODERATE' ? 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30' : 'text-green-500 bg-green-500/10 border-green-500/30'}`}>
                                    {r.riskLevel}
                                </div>
                            </div>

                            <div className="maint-desc">
                                {r.recommendation}
                            </div>

                            <div className="maint-health-box">
                                <div className="maint-health-header">
                                    <span>Health</span>
                                    <span className={`maint-health-val ${r.healthScore < 40 ? 'red' : r.healthScore < 70 ? 'amber' : 'green'}`}>{r.healthScore.toFixed(0)}%</span>
                                </div>
                                <div className="maint-health-bar-bg">
                                    <div className={`maint-health-bar-fill ${r.healthScore < 40 ? 'bg-red-500' : r.healthScore < 70 ? 'bg-amber-400' : 'bg-green-400'}`} style={{ width: `${r.healthScore}%` }}></div>
                                </div>
                            </div>

                        </div>
                    ))}
                    {recs.length === 0 && (
                        <div style={{ gridColumn: '1 / -1', padding: '64px 0', textAlign: 'center', color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <Activity size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
                            <div>Generating maintenance predictions...</div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

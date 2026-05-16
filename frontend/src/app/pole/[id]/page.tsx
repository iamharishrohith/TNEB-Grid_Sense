'use client';

import { useEffect, useState, useMemo, use } from 'react';
import TopsBar from '@/components/TopBar';
import { useGridStore } from '@/store/gridStore';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Activity, Zap, ShieldAlert, Cpu, Thermometer, RadioTower, Clock, Wrench, Building2 } from 'lucide-react';
import { API_BASE } from '@/lib/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function PolePage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const poleId = decodeURIComponent(resolvedParams.id);

    const [staticData, setStaticData] = useState<any>(null);
    const [history, setHistory] = useState<{ t: string, v: number, c: number, p: number }[]>([]);

    // Real-time data from Zustand WS
    const livePole = useGridStore(s => s.poles[poleId]);
    const allAlerts = useGridStore(s => s.alerts);

    const liveAlerts = useMemo(() => {
        return allAlerts.filter(a => a.poleId === poleId);
    }, [allAlerts, poleId]);

    useEffect(() => {
        // Fetch initial state & historical/maintenance analytics
        fetch(`${API_BASE}/api/poles/${encodeURIComponent(poleId)}`)
            .then(r => r.json())
            .then(data => {
                setStaticData(data);

                // Generate mock history for charts based on current state (24 data points, 1 per hr)
                const now = new Date();
                const hist = Array.from({ length: 24 }).map((_, i) => {
                    const t = new Date(now.getTime() - (23 - i) * 3600000);
                    return {
                        t: t.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
                        v: data.voltage * (0.95 + Math.random() * 0.1),
                        c: data.current * (0.8 + Math.random() * 0.4),
                        p: data.power * (0.8 + Math.random() * 0.4),
                    };
                });
                setHistory(hist);
            })
            .catch(console.error);
    }, [poleId]);

    // Update history arrays as live data streams in
    useEffect(() => {
        if (livePole) {
            setHistory(prev => {
                const next = [...prev, {
                    t: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
                    v: livePole.voltage,
                    c: livePole.current,
                    p: livePole.power
                }].slice(-24); // Keep last 24 points
                return next;
            });
        }
    }, [livePole, livePole?.timestamp]);

    const pole = livePole || staticData;

    if (!pole) {
        return (
            <div style={{ width: '100%', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f1115', color: '#64748b' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <p style={{ fontSize: '0.875rem', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Connecting to Pole Terminal...</p>
                </div>
            </div>
        );
    }

    const getHealthColor = (h: number) => {
        if (h >= 80) return 'text-green-400';
        if (h >= 60) return 'text-amber-400';
        if (h >= 35) return 'text-orange-400';
        return 'text-red-400';
    };

    const getHealthBg = (h: number) => {
        if (h >= 80) return 'bg-green-500';
        if (h >= 60) return 'bg-amber-500';
        if (h >= 35) return 'bg-orange-500';
        return 'bg-red-500';
    };

    const getStatusBadge = (s: string) => {
        if (s === 'NORMAL') return <div className="inline-flex px-3 py-1 rounded bg-green-500/10 border border-green-500/30 text-green-500 text-xs font-bold uppercase tracking-wider">OK / Optimal</div>;
        const label = s.replace(/_/g, ' ');
        const isCritical = s.includes('CRIT') || s === 'MULTI_FAULT';
        const bg = isCritical ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-amber-500/10 border-amber-500/30 text-amber-500';
        return <div className={`inline-flex px-3 py-1 rounded ${bg} text-xs font-bold uppercase tracking-wider ${isCritical ? 'animate-pulse' : ''}`}>{label}</div>;
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: { mode: 'index' as const, intersect: false, backgroundColor: 'rgba(3, 7, 18, 0.95)', titleColor: '#00e5ff', bodyColor: '#ffffff', borderColor: '#00e5ff', borderWidth: 1, titleFont: { family: 'Rajdhani', size: 14 } }
        },
        scales: {
            x: { grid: { display: false }, ticks: { color: '#64748b', font: { family: 'Rajdhani', size: 12 } } },
            y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b', font: { family: 'Rajdhani', size: 12 } } }
        },
        animation: { duration: 400 }
    };

    const maint = staticData?.maintenance;

    return (
        <>
            <TopsBar
                title={`Pole Inspector: ${poleId}`}
                breadcrumbs={[
                    { label: pole.districtId, href: `/district/${pole.districtId}` },
                    { label: poleId }
                ]}
            />

            <div className="page-container">

                {/* Header Strip */}
                <div className="card pole-header-card">
                    <div className="pole-header-bg"></div>

                    <div className="pole-header-left">
                        <div className={`pole-icon-wrapper ${pole.status === 'NORMAL' ? 'normal' : 'critical'}`}>
                            <RadioTower size={32} />
                        </div>
                        <div>
                            <div className="pole-title-wrapper">
                                <h2 className="pole-title">{poleId}</h2>
                                {getStatusBadge(pole.status)}
                            </div>
                            <div className="pole-meta-row">
                                <span className="pole-meta-item"><Building2 size={14} /> {pole.districtId}</span>
                                <span className="pole-meta-item text-blue-400"><Cpu size={14} /> Feeder {pole.feederId}</span>
                                <span className="pole-meta-item"><Clock size={14} /> Updated: {(() => { const ts = pole.timestamp || pole.lastSeen; if (!ts) return '--:--:--'; const d = new Date(ts); return isNaN(d.getTime()) ? '--:--:--' : d.toLocaleTimeString(); })()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="pole-health-box">
                        <div>
                            <div className="pole-health-label">Health Score</div>
                            <div className={`pole-health-value ${getHealthColor(pole.healthScore)}`}>
                                {pole.healthScore?.toFixed(0) ?? '--'}<span style={{ fontSize: '1.25rem' }}>%</span>
                            </div>
                        </div>
                        <div className="pole-health-circle">
                            <div className={`health-circle-fill ${getHealthBg(pole.healthScore)}`} style={{ height: `${pole.healthScore}%` }}></div>
                            <span className="health-circle-label">LIVE</span>
                        </div>
                    </div>
                </div>

                {/* Live Gauges Row */}
                <div className="gauges-row">
                    <div className="card gauge-card animate-in">
                        <div className="gauge-header">
                            <div className="gauge-label">Grid Voltage</div>
                            <div className={`gauge-icon ${pole.voltage > 250 || pole.voltage < 200 ? 'bg-red-500-10' : 'bg-cyan-500-10'}`}>
                                <Activity size={18} />
                            </div>
                        </div>
                        <div className={`gauge-value-row ${pole.voltage > 250 || pole.voltage < 200 ? 'text-red-400' : 'text-bright'}`}>
                            {pole.voltage?.toFixed(1) ?? '--'} <span style={{ fontSize: '1.125rem', color: '#64748b' }}>V</span>
                        </div>
                        <div className="gauge-bar-bg">
                            <div className={`gauge-bar-fill ${pole.voltage > 250 || pole.voltage < 200 ? 'bg-red-400' : 'bg-cyan-400'}`} style={{ width: `${Math.min(100, Math.max(0, ((pole.voltage || 0) - 180) / 100 * 100))}%` }}></div>
                        </div>
                        <div className="gauge-minmax"><span>180V</span><span>280V</span></div>
                    </div>

                    <div className="card gauge-card animate-in" style={{ animationDelay: '0.05s' }}>
                        <div className="gauge-header">
                            <div className="gauge-label">Line Current</div>
                            <div className={`gauge-icon ${pole.current > 40 ? 'bg-amber-500-10' : 'bg-blue-500-10'}`}>
                                <Activity size={18} />
                            </div>
                        </div>
                        <div className={`gauge-value-row ${pole.current > 40 ? 'text-amber-400' : 'text-bright'}`}>
                            {pole.current?.toFixed(2) ?? '--'} <span style={{ fontSize: '1.125rem', color: '#64748b' }}>A</span>
                        </div>
                        <div className="gauge-bar-bg">
                            <div className={`gauge-bar-fill ${pole.current > 40 ? 'bg-amber-400' : 'bg-blue-400'}`} style={{ width: `${Math.min(100, ((pole.current || 0) / 50) * 100)}%` }}></div>
                        </div>
                        <div className="gauge-minmax"><span>0A</span><span>50A</span></div>
                    </div>

                    <div className="card gauge-card animate-in" style={{ animationDelay: '0.1s' }}>
                        <div className="gauge-header">
                            <div className="gauge-label">Transformer Temp</div>
                            <div className={`gauge-icon ${pole.temperature > 65 ? 'bg-red-500-10' : pole.temperature > 50 ? 'bg-amber-500-10' : 'bg-green-500-10'}`} style={{ color: pole.temperature > 65 ? '' : pole.temperature > 50 ? '' : '#4ade80' }}>
                                <Thermometer size={18} />
                            </div>
                        </div>
                        <div className={`gauge-value-row ${pole.temperature > 65 ? 'text-red-400 font-bold' : 'text-bright'}`}>
                            {pole.temperature?.toFixed(1) ?? '--'} <span style={{ fontSize: '1.125rem', color: '#64748b' }}>°C</span>
                        </div>
                        <div className="gauge-bar-bg">
                            <div className={`gauge-bar-fill ${pole.temperature > 65 ? 'bg-red-400' : pole.temperature > 50 ? 'bg-amber-400' : 'bg-green-400'}`} style={{ width: `${Math.min(100, ((pole.temperature || 0) / 80) * 100)}%` }}></div>
                        </div>
                        <div className="gauge-minmax"><span>20°C</span><span>80°C</span></div>
                    </div>

                    <div className="card gauge-card animate-in" style={{ animationDelay: '0.15s' }}>
                        <div className="gauge-header">
                            <div className="gauge-label">Active Power Load</div>
                            <div className="gauge-icon bg-indigo-500-10">
                                <Zap size={18} />
                            </div>
                        </div>
                        <div className="gauge-value-row text-bright">
                            {pole.power?.toFixed(2) ?? '--'} <span style={{ fontSize: '1.125rem', color: '#64748b' }}>kW</span>
                        </div>
                        <div className="gauge-bar-bg">
                            <div className="gauge-bar-fill bg-indigo-400" style={{ width: `${Math.min(100, (pole.power / 12) * 100)}%` }}></div>
                        </div>
                        <div className="gauge-minmax"><span>0kW</span><span>12kW</span></div>
                    </div>
                </div>

                {/* Charts and Maintenance Row */}
                <div className="bottom-panels-row">

                    <div className="card table-panel trend-panel">
                        <div className="panel-header">
                            <h2 className="panel-title">24H Live Telemetry Trend</h2>
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <div className="legend-item"><span className="legend-dot" style={{ backgroundColor: '#00e5ff', boxShadow: '0 0 10px #00e5ff' }}></span><span className="legend-text text-bright">Voltage</span></div>
                                <div className="legend-item"><span className="legend-dot" style={{ backgroundColor: '#00ffd1', boxShadow: '0 0 10px #00ffd1' }}></span><span className="legend-text text-bright">Current</span></div>
                                <div className="legend-item"><span className="legend-dot" style={{ backgroundColor: '#b026ff', boxShadow: '0 0 10px #b026ff' }}></span><span className="legend-text text-bright">Power</span></div>
                            </div>
                        </div>
                        <div className="chart-container">
                            <Line
                                data={{
                                    labels: history.map(h => h.t),
                                    datasets: [
                                        { label: 'Voltage (V)', data: history.map(h => h.v), borderColor: '#00e5ff', borderWidth: 2, tension: 0.3, pointRadius: 0, yAxisID: 'y' },
                                        { label: 'Current (A)', data: history.map(h => h.c), borderColor: '#00ffd1', borderWidth: 2, tension: 0.3, pointRadius: 0, yAxisID: 'y1' },
                                        { label: 'Power (kW)', data: history.map(h => h.p), borderColor: '#b026ff', backgroundColor: 'rgba(176, 38, 255, 0.15)', borderWidth: 2, fill: true, tension: 0.3, pointRadius: 0, yAxisID: 'y1' }
                                    ]
                                }}
                                options={{
                                    ...chartOptions,
                                    interaction: { mode: 'index', intersect: false },
                                    scales: {
                                        x: chartOptions.scales.x,
                                        y: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'VOLTAGE (V)', color: '#00e5ff', font: { family: 'Rajdhani' } }, grid: { color: 'rgba(255,255,255,0.05)' } },
                                        y1: { type: 'linear', display: true, position: 'right', title: { display: true, text: 'CURRENT / LOAD', color: '#b026ff', font: { family: 'Rajdhani' } }, grid: { display: false } }
                                    }
                                }}
                            />
                        </div>
                    </div>

                    <div className="side-panels-col">

                        <div className="card side-panel">
                            <div className="panel-header" style={{ justifyContent: 'flex-start', gap: '8px' }}>
                                <Wrench size={16} style={{ color: '#fbbf24' }} />
                                <h2 className="panel-title">AI Maintenance Prediction</h2>
                            </div>
                            <div className="prediction-content">
                                {maint ? (
                                    <>
                                        <div className="prediction-grid">
                                            <div>
                                                <div className="text-xs-caps">Risk Level</div>
                                                <div className={`pred-badge ${maint.riskLevel}`}>
                                                    {maint.riskLevel}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div className="text-xs-caps">Grid ETA</div>
                                                <div className="pred-eta">{maint.estimatedDaysToFailure != null ? `~${maint.estimatedDaysToFailure} Days` : 'N/A'}</div>
                                            </div>
                                        </div>
                                        <div className="pred-rec">
                                            {maint.recommendation}
                                        </div>
                                        {maint.factors.length > 0 && (
                                            <div>
                                                <ul className="pred-list">
                                                    {maint.factors.map((f: string, i: number) => <li key={i}>{f}</li>)}
                                                </ul>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>Calculating prediction model...</div>
                                )}
                            </div>
                        </div>

                        <div className="card side-panel">
                            <div className="panel-header">
                                <h2 className="panel-title">Relay Contactor</h2>
                                <div className="relay-switch">
                                    <div className={`relay-thumb ${pole.relayState ? 'on' : 'off'}`}></div>
                                </div>
                            </div>
                            <div className="relay-content">
                                <div>
                                    <div className="text-xs-caps">State</div>
                                    <div className={`relay-val ${pole.relayState ? 'text-green-400' : ''}`} style={{ color: pole.relayState ? '' : '#64748b' }}>{pole.relayState ? 'ENERGIZED' : 'OPEN'}</div>
                                </div>
                                <div>
                                    <button className="btn-trip">Trip</button>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </>
    );
}

'use client';

import { useEffect, useState, useMemo, use } from 'react';
import TopsBar from '@/components/TopBar';
import { useGridStore } from '@/store/gridStore';
import { useRouter } from 'next/navigation';
import { Building2, Activity, Zap, ShieldAlert, Cpu, Thermometer, ChevronRight, Radio, Clock } from 'lucide-react';
import { API_BASE } from '@/lib/api';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function DistrictPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const districtId = decodeURIComponent(resolvedParams.id);
    const router = useRouter();

    const [summ, setSumm] = useState<any>(null);
    const [poles, setPoles] = useState<any[]>([]);
    const [districtList, setDistrictList] = useState<any[]>([]);

    // Pull live data from Zustand 
    const polesMap = useGridStore(s => s.poles);

    // We must use useMemo to prevent recreating the array filter every single render,
    // which triggers React's "Maximum update depth exceeded" limit
    const livePoles = useMemo(() => {
        return Object.values(polesMap).filter(p => p.districtId === districtId);
    }, [polesMap, districtId]);

    useEffect(() => {
        fetch(`${API_BASE}/api/districts/${encodeURIComponent(districtId)}`)
            .then(r => r.json())
            .then(setSumm)
            .catch(console.error);

        fetch(`${API_BASE}/api/poles?district=${encodeURIComponent(districtId)}`)
            .then(r => r.json())
            .then(setPoles)
            .catch(console.error);

        fetch(`${API_BASE}/api/districts`)
            .then(r => r.json())
            .then(data => setDistrictList(data))
            .catch(console.error);
    }, [districtId]);

    // Merge live WS data into static REST data
    const mergedPoles = poles.map(p => {
        const live = livePoles.find(lp => lp.poleId === p.poleId);
        return live ? { ...p, ...live } : p;
    });

    // Calculate live feeder metrics from merged poles
    const feeders = Array.from(new Set(mergedPoles.map(p => p.feederId))).map(fId => {
        const fPoles = mergedPoles.filter(p => p.feederId === fId);
        const health = fPoles.reduce((acc, p) => acc + p.healthScore, 0) / fPoles.length || 0;
        const load = fPoles.reduce((acc, p) => acc + p.power, 0) || 0;
        const faults = fPoles.filter(p => p.status !== 'NORMAL').length;
        return { id: fId, activePoles: fPoles.length, health, load, faults };
    });

    const getHealthColor = (h: number) => {
        if (h >= 80) return 'text-green-400';
        if (h >= 60) return 'text-amber-400';
        if (h >= 35) return 'text-orange-400';
        return 'text-red-400';
    };

    const statusBadge = (s: string) => {
        if (s === 'NORMAL') return <span className="status-badge normal">Normal</span>;
        if (s.includes('CRIT') || s.includes('FIRE') || s.includes('BREAK')) return <span className="status-badge critical">{s}</span>;
        return <span className="status-badge warning">{s}</span>;
    };

    const chartData = {
        labels: feeders.map(f => f.id),
        datasets: [
            {
                label: 'Feeder Load (kW)',
                data: feeders.map(f => f.load),
                borderColor: '#00e5ff',
                backgroundColor: 'rgba(0, 229, 255, 0.15)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#00e5ff',
                pointBorderColor: 'rgba(255,255,255,0.8)',
                pointBorderWidth: 1,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: '#ffffff',
                pointHoverBorderColor: '#00e5ff',
            }
        ]
    };

    const rootBg = "#0f1115";

    return (
        <>
            <TopsBar
                title={`${districtId} District`}
                breadcrumbs={[{ label: districtId }]}
            />

            <div className="page-container">

                {/* Dynamic District Selector */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', padding: '16px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Building2 size={24} className="text-blue-400" style={{ color: '#60a5fa' }} />
                        <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-tech)', letterSpacing: '0.1em', margin: 0 }}>Select Grid District</h2>
                    </div>

                    <select
                        value={districtId}
                        onChange={(e) => router.push(`/district/${e.target.value}`)}
                        className="state-select"
                        style={{ padding: '8px 16px', background: 'var(--bg-tertiary)', color: 'var(--text-bright)', border: '1px solid var(--border-active)', borderRadius: '4px', fontFamily: 'var(--font-tech)', fontSize: '1rem', minWidth: '250px', cursor: 'pointer', outline: 'none' }}
                    >
                        {districtList.sort((a, b) => a.districtId.localeCompare(b.districtId)).map((d: any) => (
                            <option key={d.districtId} value={d.districtId}>
                                {d.districtId} ( {d.poleCount} Nodes )
                            </option>
                        ))}
                    </select>
                </div>

                {/* District Stats Row */}
                <div className="stats-row">
                    <div className="card stat-card animate-in">
                        <div>
                            <div className="stat-label">Health Score</div>
                            <div className={`stat-value ${getHealthColor(summ?.avgHealthScore || 0)}`}>
                                {summ?.avgHealthScore?.toFixed(1) || '--'}%
                            </div>
                        </div>
                        <div className={`stat-icon ${getHealthColor(summ?.avgHealthScore || 0)}`} style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                            <Activity size={24} />
                        </div>
                    </div>

                    <div className="card stat-card animate-in" style={{ animationDelay: '0.05s' }}>
                        <div>
                            <div className="stat-label">Total Load</div>
                            <div className="stat-value">
                                {summ?.totalLoad?.toFixed(1) || '--'} <span style={{ fontSize: '14px', color: '#64748b' }}>kW</span>
                            </div>
                        </div>
                        <div className="stat-icon" style={{ backgroundColor: 'rgba(34, 211, 238, 0.1)', color: '#22d3ee' }}>
                            <Zap size={24} />
                        </div>
                    </div>

                    <div className="card stat-card animate-in" style={{ animationDelay: '0.1s' }}>
                        <div>
                            <div className="stat-label">Poles Linked</div>
                            <div className="stat-value">
                                {summ?.poleCount || '--'}
                            </div>
                        </div>
                        <div className="stat-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa' }}>
                            <Radio size={24} />
                        </div>
                    </div>

                    <div className="card stat-card animate-in" style={{ animationDelay: '0.15s' }}>
                        <div>
                            <div className="stat-label">Active Faults</div>
                            <div className={`stat-value ${summ?.faultCount > 0 ? 'text-red-400' : ''}`}>
                                {summ?.faultCount || 0}
                            </div>
                        </div>
                        <div className={`stat-icon ${summ?.faultCount > 0 ? 'bg-red-500-10' : 'bg-slate-800-mute'}`}>
                            <ShieldAlert size={24} />
                        </div>
                    </div>
                </div>

                {/* Feeders & Chart Row */}
                <div className="feeders-chart-row">
                    <div className="card table-panel feeders-panel">
                        <div className="panel-header">
                            <h2 className="panel-title">Active Feeders</h2>
                            <span className="panel-header-badge" style={{ backgroundColor: '#1e293b', color: '#cbd5e1', border: 'none' }}>{feeders.length} Total</span>
                        </div>
                        <div className="feeders-list">
                            {feeders.map(f => (
                                <div key={f.id} className="feeder-item">
                                    <div className="feeder-header">
                                        <div className="feeder-title">
                                            <Building2 size={14} /> {f.id}
                                        </div>
                                        {f.faults > 0 ? (
                                            <span className="dt-badge CRITICAL">{f.faults} Faults</span>
                                        ) : (
                                            <span className="dt-badge LOW">OK</span>
                                        )}
                                    </div>
                                    <div className="feeder-grid">
                                        <div>
                                            <div className="feeder-stat-label">Poles</div>
                                            <div className="feeder-stat-val text-bright">{f.activePoles}</div>
                                        </div>
                                        <div>
                                            <div className="feeder-stat-label">Health</div>
                                            <div className={`feeder-stat-val font-bold ${getHealthColor(f.health)}`}>{f.health?.toFixed(0) ?? '--'}%</div>
                                        </div>
                                        <div>
                                            <div className="feeder-stat-label">Load</div>
                                            <div className="feeder-stat-val text-bright">{f.load?.toFixed(1) ?? '--'} <span style={{ fontSize: '10px', color: '#64748b' }}>kW</span></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {feeders.length === 0 && <div style={{ textAlign: 'center', padding: '32px 0', color: '#64748b' }}>Loading feeders...</div>}
                        </div>
                    </div>

                    <div className="card table-panel chart-panel">
                        <div className="panel-header">
                            <h2 className="panel-title">Feeder Load Distribution</h2>
                        </div>
                        <div className="chart-container">
                            <Line
                                data={chartData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                        legend: { display: false },
                                        tooltip: { mode: 'index', intersect: false, backgroundColor: 'rgba(3, 7, 18, 0.95)', titleColor: '#00e5ff', bodyColor: '#ffffff', borderColor: '#00e5ff', borderWidth: 1, titleFont: { family: 'Rajdhani', size: 14 } }
                                    },
                                    scales: {
                                        x: { grid: { display: false }, ticks: { color: '#64748b', font: { family: 'Rajdhani', size: 12 } } },
                                        y: { grid: { color: 'rgba(255,255,255,0.05)' }, title: { display: true, text: 'KILOWATTS (kW)', color: '#475569', font: { family: 'Rajdhani', size: 10 } }, ticks: { color: '#64748b', font: { family: 'Rajdhani', size: 12 } }, beginAtZero: true }
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Pole Telemetry Table */}
                <div className="card table-panel">
                    <div className="table-header-block">
                        <h2 className="panel-title">Smart Poles</h2>
                        <p className="table-subtitle">Live telemetry streaming direct from distribution nodes</p>
                    </div>
                    <div className="table-wrapper">
                        <table className="district-table">
                            <thead>
                                <tr>
                                    <th>Pole ID</th>
                                    <th>Feeder</th>
                                    <th className="text-right">Status</th>
                                    <th className="text-right">Health</th>
                                    <th className="text-right">Voltage</th>
                                    <th className="text-right">Current</th>
                                    <th className="text-right">Temp</th>
                                    <th className="text-right">Load</th>
                                    <th className="text-right">Predicted TTF</th>
                                </tr>
                            </thead>
                            <tbody>
                                {mergedPoles.sort((a, b) => a.poleId.localeCompare(b.poleId)).map(p => (
                                    <tr
                                        key={p.poleId}
                                        onClick={() => router.push(`/pole/${p.poleId}`)}
                                    >
                                        <td className="dt-name dt-mono" style={{ color: 'var(--accent-blue)' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Cpu size={14} className="dt-icon-hover" /> {p.poleId}
                                            </span>
                                        </td>
                                        <td className="dt-mono">{p.feederId}</td>
                                        <td className="text-right">{statusBadge(p.status)}</td>
                                        <td className="dt-mono" style={{ textAlign: 'right' }}>
                                            <div className="health-bar-container">
                                                <div className="health-bar-bg">
                                                    <div className={`health-bar-fill ${getHealthColor(p.healthScore).replace('text-', 'bg-')}`} style={{ width: `${p.healthScore}%` }}></div>
                                                </div>
                                                <span className={`${getHealthColor(p.healthScore)}`} style={{ width: '3ch', display: 'inline-block', textAlign: 'right' }}>{p.healthScore?.toFixed(0) ?? '--'}%</span>
                                            </div>
                                        </td>
                                        <td className={`dt-mono text-right ${p.voltage > 250 ? 'text-red-400 font-bold' : p.voltage < 210 ? 'text-amber-400 font-bold' : ''}`}>
                                            <span style={{ width: '5ch', display: 'inline-block', textAlign: 'right' }}>{p.voltage?.toFixed(1) ?? '--'}</span>V
                                        </td>
                                        <td className={`dt-mono text-right ${p.current > 40 ? 'text-amber-400' : ''}`}>
                                            <span style={{ width: '5ch', display: 'inline-block', textAlign: 'right' }}>{p.current?.toFixed(2) ?? '--'}</span>A
                                        </td>
                                        <td className="dt-mono" style={{ textAlign: 'right' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                                                <Thermometer size={12} className={p.temperature > 50 ? 'text-red-400' : ''} style={{ color: p.temperature <= 50 ? '#64748b' : '' }} />
                                                <span className={p.temperature > 50 ? 'text-red-400 font-bold' : ''} style={{ width: '5ch', textAlign: 'right', display: 'inline-block' }}>{p.temperature?.toFixed(1) ?? '--'}°C</span>
                                            </span>
                                        </td>
                                        <td className="dt-mono" style={{ textAlign: 'right', color: '#22d3ee', fontWeight: 'bold' }}>
                                            <span style={{ display: 'inline-block', width: '7ch', textAlign: 'right' }}>{p.power?.toFixed(2) ?? '--'}</span>
                                            <span style={{ fontSize: '10px', color: '#64748b', marginLeft: '4px', fontWeight: 'normal' }}>kW</span>
                                        </td>
                                        <td className="dt-mono" style={{ textAlign: 'right' }}>
                                            {p.predictedTTF !== undefined ? (
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                    color: p.predictedTTF <= 3 ? 'var(--accent-red)' : p.predictedTTF <= 14 ? 'var(--accent-amber)' : 'var(--accent-green)',
                                                    fontWeight: p.predictedTTF <= 7 ? 'bold' : 'normal'
                                                }}>
                                                    {p.predictedTTF <= 3 && <Clock size={12} />}
                                                    {p.predictedTTF}d
                                                </span>
                                            ) : (
                                                <span style={{ color: '#64748b' }}>--</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {mergedPoles.length === 0 && (
                                    <tr><td colSpan={9} className="text-center" style={{ padding: '40px', color: '#64748b' }}>Loading poles...</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
}

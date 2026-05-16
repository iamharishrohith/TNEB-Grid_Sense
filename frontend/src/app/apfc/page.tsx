'use client';

import { useEffect, useState } from 'react';
import TopsBar from '@/components/TopBar';
import { useGridStore } from '@/store/gridStore';
import { Activity, Zap, ShieldAlert, FileWarning, Cpu, BatteryCharging, Factory } from 'lucide-react';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// Penalty Configuration for TNEB Industries
// Below 0.90 PF incurs a 1% penalty on total bill for every 0.01 drop
const PENALTY_THRESHOLD = 0.90;
const PENALTY_RATE_PER_KVAR = 125; // Simulating Rupees/kVAr penalty rate per hour of severe drop

export default function APFCPage() {
    // For the B2B Dashboard, we'll monitor a specific high-load Industrial Feeder in Chennai
    const TARGET_FEEDER = "FDR-CHN-01";

    // Pull live data from Zustand 
    const polesMap = useGridStore(s => s.poles);

    // Isolate nodes on the industrial feeder
    const industrialNodes = Object.values(polesMap).filter(p => p.feederId === TARGET_FEEDER);

    // Calculate aggregate APFC metrics
    let avgPF = 1.0;
    let totalActive = 0;
    let totalReactive = 0;
    let systemHealth = 100;
    let worstNode = null;
    let livePenalty = 0;

    if (industrialNodes.length > 0) {
        // Safe averaging since the backend simulator guarantees these props now
        avgPF = industrialNodes.reduce((acc, p) => acc + (p.powerFactor || 0.99), 0) / industrialNodes.length;
        totalActive = industrialNodes.reduce((acc, p) => acc + (p.activePower || p.power || 0), 0);
        totalReactive = industrialNodes.reduce((acc, p) => acc + (p.reactivePower || 0), 0);
        systemHealth = industrialNodes.reduce((acc, p) => acc + p.healthScore, 0) / industrialNodes.length;

        worstNode = [...industrialNodes].sort((a, b) => (a.powerFactor || 1) - (b.powerFactor || 1))[0];

        if (avgPF < PENALTY_THRESHOLD) {
            const dropAmount = PENALTY_THRESHOLD - avgPF;
            livePenalty = (dropAmount * 100) * PENALTY_RATE_PER_KVAR * (totalActive / 1000); // Simulated algorithmic penalty
        }
    }

    const [chartData, setChartData] = useState({
        labels: Array(20).fill(''),
        datasets: [
            {
                label: 'Active Power (kW)',
                data: Array(20).fill(0),
                borderColor: '#00e5ff',
                backgroundColor: 'rgba(0, 229, 255, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
            },
            {
                label: 'Reactive Power (kVAr)',
                data: Array(20).fill(0),
                borderColor: '#b026ff',
                backgroundColor: 'rgba(176, 38, 255, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
            }
        ]
    });

    useEffect(() => {
        if (totalActive > 0) {
            setChartData(prev => {
                const newTime = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const newLabels = [...prev.labels.slice(1), newTime];

                return {
                    labels: newLabels,
                    datasets: [
                        { ...prev.datasets[0], data: [...prev.datasets[0].data.slice(1), totalActive] },
                        { ...prev.datasets[1], data: [...prev.datasets[1].data.slice(1), totalReactive] }
                    ]
                };
            });
        }
    }, [totalActive, totalReactive]);


    return (
        <>
            <TopsBar
                title="Industrial APFC Telemetry"
                breadcrumbs={[{ label: 'B2B Diagnostics' }, { label: 'Reactive Power' }]}
            />

            <div className="page-container">

                {/* Header Banner */}
                <div className="page-header-row" style={{ borderLeft: avgPF < PENALTY_THRESHOLD ? '4px solid var(--accent-red)' : '4px solid var(--accent-blue)' }}>
                    <div className={`header-icon-box ${avgPF < PENALTY_THRESHOLD ? 'critical' : 'indigo'}`}>
                        <BatteryCharging size={32} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <h2 className="page-header-title">AUTOMATIC POWER FACTOR CORRECTION</h2>
                        <p className="page-header-subtitle">Live phase angle monitoring for Industrial Feeder {TARGET_FEEDER}</p>
                    </div>
                    {avgPF < PENALTY_THRESHOLD && (
                        <div className="status-tag theft pulse-critical" style={{ fontSize: '1rem', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <ShieldAlert size={20} /> PENALTY THRESHOLD CROSSED
                        </div>
                    )}
                </div>

                {/* KPI Row */}
                <div className="kpi-grid">
                    <div className="card kpi-card">
                        <div className="kpi-icon-wrapper" style={{ color: avgPF < 0.9 ? 'var(--accent-red)' : 'var(--accent-cyan)' }}>
                            <Activity size={24} />
                        </div>
                        <div className={`kpi-value ${avgPF < 0.9 ? 'text-red-400' : 'text-bright'}`}>{avgPF.toFixed(3)}</div>
                        <div className="kpi-label">Power Factor (cos θ)</div>
                    </div>
                    <div className="card kpi-card">
                        <div className="kpi-icon-wrapper" style={{ color: 'var(--accent-blue)' }}>
                            <Zap size={24} />
                        </div>
                        <div className="kpi-value text-bright">{totalActive.toFixed(0)} <span style={{ fontSize: '14px', color: '#64748b' }}>kW</span></div>
                        <div className="kpi-label">Active Power</div>
                    </div>
                    <div className="card kpi-card">
                        <div className="kpi-icon-wrapper" style={{ color: 'var(--accent-purple)' }}>
                            <Cpu size={24} />
                        </div>
                        <div className="kpi-value text-bright">{totalReactive.toFixed(0)} <span style={{ fontSize: '14px', color: '#64748b' }}>kVAr</span></div>
                        <div className="kpi-label">Reactive Power</div>
                    </div>
                    <div className="card kpi-card">
                        <div className="kpi-icon-wrapper" style={{ color: 'var(--accent-green)' }}>
                            <Activity size={24} />
                        </div>
                        <div className="kpi-value text-bright">{systemHealth.toFixed(1)}%</div>
                        <div className="kpi-label">Relay Health</div>
                    </div>
                    <div className="card kpi-card" style={{ background: livePenalty > 0 ? 'rgba(255,0,85,0.1)' : '', borderColor: livePenalty > 0 ? 'rgba(255,0,85,0.4)' : '' }}>
                        <div className="kpi-icon-wrapper" style={{ color: livePenalty > 0 ? 'var(--accent-red)' : '#64748b' }}>
                            <FileWarning size={24} />
                        </div>
                        <div className={`kpi-value ${livePenalty > 0 ? 'text-red-400 font-bold' : ''}`}>₹{livePenalty.toFixed(0)}</div>
                        <div className="kpi-label">Est. Hourly Penalty</div>
                    </div>
                </div>

                {/* Dashboard Flex Row */}
                <div className="map-event-row" style={{ height: '600px' }}>

                    {/* Live Load Curve */}
                    <div className="card map-card">
                        <div className="panel-header">
                            <h2 className="panel-title">Active vs Reactive Load Curve</h2>
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <div className="legend-item"><span className="legend-dot" style={{ background: '#00e5ff' }}></span> Active (kW)</div>
                                <div className="legend-item"><span className="legend-dot" style={{ background: '#b026ff' }}></span> Reactive (kVAr)</div>
                            </div>
                        </div>
                        <div className="chart-container">
                            <Line
                                data={chartData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    animation: { duration: 0 }, // Disable animation for high-speed live data
                                    plugins: { legend: { display: false } },
                                    scales: {
                                        x: { grid: { color: 'rgba(255,255,255,0.02)' }, ticks: { color: '#64748b', font: { family: 'Rajdhani' } } },
                                        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b', font: { family: 'Rajdhani' } }, beginAtZero: true }
                                    }
                                }}
                            />
                        </div>
                    </div>

                    {/* Capacitor Grid & Critical Node */}
                    <div className="card event-feed-card" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                        <div>
                            <div className="panel-header" style={{ marginBottom: '16px' }}>
                                <h2 className="panel-title">8-Step Capacitor Status</h2>
                            </div>

                            {worstNode ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                                    {worstNode.capacitorSteps?.map((isActive, i) => {
                                        // If PF is terrible, and the step is inactive, it's flagged as degraded
                                        const isDegraded = !isActive && (worstNode?.powerFactor || 1) < 0.90;

                                        return (
                                            <div key={i} style={{
                                                background: isActive ? 'rgba(57, 255, 20, 0.1)' : isDegraded ? 'rgba(255, 0, 85, 0.15)' : 'rgba(0,0,0,0.5)',
                                                border: `1px solid ${isActive ? 'rgba(57, 255, 20, 0.4)' : isDegraded ? 'rgba(255, 0, 85, 0.6)' : 'rgba(255,255,255,0.1)'}`,
                                                padding: '16px 8px',
                                                borderRadius: '4px',
                                                textAlign: 'center',
                                                boxShadow: isActive ? '0 0 15px rgba(57, 255, 20, 0.1)' : isDegraded ? '0 0 15px rgba(255, 0, 85, 0.2)' : 'none',
                                                animation: isDegraded ? 'pulse-critical 2s infinite' : 'none'
                                            }}>
                                                <div style={{ fontFamily: 'var(--font-tech)', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '8px' }}>STEP 0{i + 1}</div>
                                                <div style={{
                                                    fontFamily: 'var(--font-mono)',
                                                    fontSize: '0.8rem',
                                                    color: isActive ? 'var(--accent-green)' : isDegraded ? 'var(--accent-red)' : 'var(--text-dim)',
                                                    fontWeight: 'bold'
                                                }}>
                                                    {isActive ? 'ENGAGED' : isDegraded ? 'FAULT' : 'STANDBY'}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', color: '#64748b', padding: '24px' }}>Awaiting APFC node telemetry...</div>
                            )}
                        </div>

                        {worstNode && worstNode.powerFactor && worstNode.powerFactor < 0.90 && (
                            <div style={{ background: 'rgba(255, 0, 85, 0.1)', border: '1px solid rgba(255, 0, 85, 0.3)', padding: '20px', borderRadius: '8px' }}>
                                <h3 style={{ fontFamily: 'var(--font-tech)', fontSize: '1.2rem', color: 'var(--accent-red)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <ShieldAlert size={20} /> DIAGNOSTIC ALERT
                                </h3>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-bright)', lineHeight: 1.6 }}>
                                    Node <span className="dt-mono" style={{ color: 'var(--accent-blue)' }}>{worstNode.poleId}</span> is recording a critical phase angle drop (PF: <span className="dt-mono text-red-400 font-bold">{worstNode.powerFactor.toFixed(3)}</span>).
                                    <br /><br />
                                    The APFC relay is failing to engage Capacitor Steps required to offset {totalReactive.toFixed(0)} kVAr of reactive load. Immediate contactor inspection required to prevent TNEB regulatory fines.
                                </p>
                            </div>
                        )}

                    </div>
                </div>

                {/* Industrial Consumers Table */}
                <div className="card" style={{ marginTop: '24px' }}>
                    <div className="panel-header" style={{ marginBottom: '16px' }}>
                        <h2 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Factory size={20} className="text-blue-400" /> Active Industrial Consumers
                        </h2>
                    </div>
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th className="text-left">Consumer Unit</th>
                                    <th className="text-center">Active Load (kW)</th>
                                    <th className="text-center">Reactive Load (kVAr)</th>
                                    <th className="text-center">PF (cos θ)</th>
                                    <th className="text-center">Capacitor Arrays</th>
                                    <th className="text-right">Health</th>
                                </tr>
                            </thead>
                            <tbody>
                                {industrialNodes.map((node, idx) => {
                                    const pf = node.powerFactor || 0.99;
                                    const isPenalized = pf < PENALTY_THRESHOLD;

                                    // Count active steps
                                    const activeSteps = node.capacitorSteps?.filter(s => s).length || 0;
                                    const totalSteps = node.capacitorSteps?.length || 8;

                                    return (
                                        <tr key={node.poleId} className={isPenalized ? 'fault-row' : ''}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div className={`status-indicator ${isPenalized ? 'fault' : 'active'}`}></div>
                                                    <div>
                                                        <div style={{ fontFamily: 'var(--font-tech)', fontSize: '1rem', color: isPenalized ? 'var(--accent-red)' : 'var(--text-bright)' }}>
                                                            Heavy Industry {String.fromCharCode(65 + idx)}
                                                        </div>
                                                        <div className="dt-mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                            Node: {node.poleId}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="dt-mono text-center" style={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}>
                                                {(node.activePower || node.power).toFixed(2)}
                                            </td>
                                            <td className="dt-mono text-center" style={{ color: 'var(--accent-purple)' }}>
                                                {node.reactivePower?.toFixed(2) || '0.00'}
                                            </td>
                                            <td className={`dt-mono text-center ${isPenalized ? 'text-red-400 font-bold' : 'text-green-400'}`}>
                                                {pf.toFixed(3)}
                                                {isPenalized && <span style={{ marginLeft: '4px', fontSize: '10px' }}>⚠️</span>}
                                            </td>
                                            <td className="dt-mono text-center">
                                                <span style={{ color: activeSteps < 3 ? 'var(--accent-red)' : 'var(--text-bright)' }}>{activeSteps}</span> / {totalSteps} ONLINE
                                            </td>
                                            <td className="dt-mono text-right" style={{ color: node.healthScore < 80 ? 'var(--accent-amber)' : 'var(--accent-green)' }}>
                                                {node.healthScore.toFixed(0)}%
                                            </td>
                                        </tr>
                                    );
                                })}
                                {industrialNodes.length === 0 && (
                                    <tr>
                                        <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                                            No industrial nodes connected on {TARGET_FEEDER}.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </>
    );
}


'use client';

import { useEffect, useState } from 'react';
import TopBar from '@/components/TopBar';
import { Crown, TrendingUp, Shield, Activity, Zap, Server, IndianRupee, Clock, RefreshCw } from 'lucide-react';
import { API_BASE } from '@/lib/api';

export default function ExecutivePage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const loadData = () => {
        setLoading(true);
        fetch(`${API_BASE}/api/executive/summary`)
            .then(r => r.json())
            .then(d => { setData(d); setLoading(false); })
            .catch(() => setLoading(false));
    };

    useEffect(() => { loadData(); }, []);

    const indicatorColor = (ind: string) => {
        switch (ind) {
            case 'GREEN': return '#22c55e';
            case 'AMBER': return '#f59e0b';
            case 'RED': return '#ef4444';
            default: return '#64748b';
        }
    };

    const indicatorBg = (ind: string) => {
        switch (ind) {
            case 'GREEN': return 'rgba(34,197,94,0.1)';
            case 'AMBER': return 'rgba(245,158,11,0.1)';
            case 'RED': return 'rgba(239,68,68,0.1)';
            default: return 'rgba(100,116,139,0.1)';
        }
    };

    if (loading || !data) {
        return (
            <>
                <TopBar title="Executive Dashboard" breadcrumbs={[]} />
                <div className="page-container">
                    <div className="loading-state"><Activity size={24} className="spin" /> Loading executive summary...</div>
                </div>
            </>
        );
    }

    return (
        <>
            <TopBar title="Executive Dashboard" breadcrumbs={[]} />
            <div className="page-container">
                <div className="exec-header">
                    <div className="exec-header-left">
                        <div className="header-icon-box gold">
                            <Crown size={24} />
                        </div>
                        <div>
                            <h2 className="page-header-title">Executive Summary</h2>
                            <p className="page-header-subtitle">Board-ready single-screen overview — TN-GridSense</p>
                        </div>
                    </div>
                    <div className="exec-header-right">
                        <button className="refresh-btn" onClick={loadData}>
                            <RefreshCw size={16} /> Refresh
                        </button>
                        <span className="exec-timestamp">
                            <Clock size={13} /> {new Date(data.generatedAt).toLocaleTimeString('en-IN')}
                        </span>
                    </div>
                </div>

                {/* Hero Health Score */}
                <div className="exec-hero" style={{ borderColor: indicatorColor(data.stateHealth?.indicator) }}>
                    <div className="exec-hero-score" style={{ color: indicatorColor(data.stateHealth?.indicator) }}>
                        <div className="exec-hero-ring" style={{
                            background: `conic-gradient(${indicatorColor(data.stateHealth?.indicator)} ${data.stateHealth?.score * 3.6}deg, rgba(255,255,255,0.05) 0deg)`
                        }}>
                            <div className="exec-hero-inner">
                                <span className="exec-score-number">{data.stateHealth?.score}</span>
                                <span className="exec-score-unit">/ 100</span>
                            </div>
                        </div>
                    </div>
                    <div className="exec-hero-info">
                        <div className="exec-indicator-badge" style={{
                            color: indicatorColor(data.stateHealth?.indicator),
                            backgroundColor: indicatorBg(data.stateHealth?.indicator)
                        }}>
                            <Shield size={16} /> {data.stateHealth?.indicator}
                        </div>
                        <div className="exec-hero-label">{data.stateHealth?.label}</div>
                        <div className="exec-uptime">
                            <Clock size={14} /> System Uptime: <strong>{data.systemUptime?.formatted}</strong>
                        </div>
                    </div>
                </div>

                {/* KPI Row */}
                <div className="exec-kpi-row">
                    <div className="exec-kpi">
                        <Server size={20} className="text-blue" />
                        <div className="exec-kpi-data">
                            <span className="exec-kpi-value">{data.fleetOverview?.totalPoles?.toLocaleString()}</span>
                            <span className="exec-kpi-label">Total Poles</span>
                        </div>
                    </div>
                    <div className="exec-kpi">
                        <Activity size={20} className="text-green" />
                        <div className="exec-kpi-data">
                            <span className="exec-kpi-value">{data.fleetOverview?.uptimePercent}%</span>
                            <span className="exec-kpi-label">Fleet Uptime</span>
                        </div>
                    </div>
                    <div className="exec-kpi">
                        <Zap size={20} className="text-amber" />
                        <div className="exec-kpi-data">
                            <span className="exec-kpi-value">{data.todayMetrics?.faultEvents?.toLocaleString()}</span>
                            <span className="exec-kpi-label">Fault Events</span>
                        </div>
                    </div>
                    <div className="exec-kpi">
                        <Shield size={20} className="text-red" />
                        <div className="exec-kpi-data">
                            <span className="exec-kpi-value">{data.todayMetrics?.activeAlerts}</span>
                            <span className="exec-kpi-label">Active Alerts</span>
                        </div>
                    </div>
                    <div className="exec-kpi">
                        <IndianRupee size={20} className="text-green" />
                        <div className="exec-kpi-data">
                            <span className="exec-kpi-value">₹{data.financialSnapshot?.estimatedMonthlySavingsLakhs} L</span>
                            <span className="exec-kpi-label">Monthly Savings</span>
                        </div>
                    </div>
                    <div className="exec-kpi">
                        <TrendingUp size={20} className="text-purple" />
                        <div className="exec-kpi-data">
                            <span className="exec-kpi-value">₹{data.financialSnapshot?.projectedAnnualSavingsCr} Cr</span>
                            <span className="exec-kpi-label">Annual Projection</span>
                        </div>
                    </div>
                </div>

                {/* Fleet + Financial Strip */}
                <div className="exec-strip-row">
                    <div className="card exec-fleet-strip">
                        <h3 className="section-title"><Server size={16} /> Fleet Status</h3>
                        <div className="exec-fleet-bars">
                            <div className="exec-fleet-bar-item">
                                <span className="exec-fleet-label">Active</span>
                                <div className="exec-fleet-bar-bg">
                                    <div className="exec-fleet-bar" style={{
                                        width: `${(data.fleetOverview?.activePoles / data.fleetOverview?.totalPoles) * 100}%`,
                                        backgroundColor: 'var(--color-green)'
                                    }} />
                                </div>
                                <span className="exec-fleet-count">{data.fleetOverview?.activePoles}</span>
                            </div>
                            <div className="exec-fleet-bar-item">
                                <span className="exec-fleet-label">Offline</span>
                                <div className="exec-fleet-bar-bg">
                                    <div className="exec-fleet-bar" style={{
                                        width: `${(data.fleetOverview?.offlinePoles / data.fleetOverview?.totalPoles) * 100}%`,
                                        backgroundColor: 'var(--color-muted)'
                                    }} />
                                </div>
                                <span className="exec-fleet-count">{data.fleetOverview?.offlinePoles}</span>
                            </div>
                            <div className="exec-fleet-bar-item">
                                <span className="exec-fleet-label">Critical</span>
                                <div className="exec-fleet-bar-bg">
                                    <div className="exec-fleet-bar" style={{
                                        width: `${(data.fleetOverview?.criticalPoles / data.fleetOverview?.totalPoles) * 100}%`,
                                        backgroundColor: 'var(--color-red)'
                                    }} />
                                </div>
                                <span className="exec-fleet-count">{data.fleetOverview?.criticalPoles}</span>
                            </div>
                        </div>
                    </div>
                    <div className="card exec-financial-strip">
                        <h3 className="section-title"><IndianRupee size={16} /> Financial Snapshot</h3>
                        <div className="exec-financial-status">{data.financialSnapshot?.roiStatus}</div>
                        <div className="exec-alert-tiers">
                            <div className="exec-tier"><span className="tier-badge tier-l1">L1</span> {data.todayMetrics?.alertsByTier?.L1 || 0}</div>
                            <div className="exec-tier"><span className="tier-badge tier-l2">L2</span> {data.todayMetrics?.alertsByTier?.L2 || 0}</div>
                            <div className="exec-tier"><span className="tier-badge tier-l3">L3</span> {data.todayMetrics?.alertsByTier?.L3 || 0}</div>
                        </div>
                    </div>
                </div>

                {/* District Traffic Light Grid */}
                <div className="card">
                    <h3 className="section-title"><Shield size={16} /> District Health Indicators</h3>
                    <div className="district-traffic-grid">
                        {data.districtIndicators?.map((d: any) => (
                            <div key={d.districtId} className="traffic-light-item">
                                <div className="traffic-dot" style={{ backgroundColor: indicatorColor(d.indicator) }} />
                                <div className="traffic-info">
                                    <span className="traffic-district">{d.districtId.replace('DIST-', '')}</span>
                                    <span className="traffic-health">{d.avgHealth}%</span>
                                </div>
                                {d.activeFaults > 0 && (
                                    <span className="traffic-faults">{d.activeFaults} faults</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}

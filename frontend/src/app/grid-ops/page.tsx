'use client';

import { useEffect, useState } from 'react';
import TopBar from '@/components/TopBar';
import { Activity, TrendingUp, Zap, ArrowRightLeft, BarChart3, Clock, AlertTriangle, ChevronDown } from 'lucide-react';
import { API_BASE } from '@/lib/api';

type Tab = 'balance' | 'forecast' | 'demand';

const DISTRICTS = [
    { id: 'DIST-CHN', name: 'Chennai' },
    { id: 'DIST-CBE', name: 'Coimbatore' },
    { id: 'DIST-MDU', name: 'Madurai' },
    { id: 'DIST-TIR', name: 'Tiruchirappalli' },
    { id: 'DIST-SLM', name: 'Salem' },
    { id: 'DIST-VLR', name: 'Vellore' },
    { id: 'DIST-ERD', name: 'Erode' },
    { id: 'DIST-TNJ', name: 'Thanjavur' },
];

export default function GridOpsPage() {
    const [tab, setTab] = useState<Tab>('balance');
    const [district, setDistrict] = useState('DIST-CHN');
    const [balanceData, setBalanceData] = useState<any>(null);
    const [forecastData, setForecastData] = useState<any>(null);
    const [demandData, setDemandData] = useState<any[]>([]);
    const [reduction, setReduction] = useState(10);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        if (tab === 'balance') {
            fetch(`${API_BASE}/api/grid/load-balance/${district}`)
                .then(r => r.json()).then(d => { setBalanceData(d); setLoading(false); })
                .catch(() => setLoading(false));
        } else if (tab === 'forecast') {
            fetch(`${API_BASE}/api/grid/forecast/${district}`)
                .then(r => r.json()).then(d => { setForecastData(d); setLoading(false); })
                .catch(() => setLoading(false));
        } else {
            fetch(`${API_BASE}/api/grid/demand-response?district=${district}&reduction=${reduction}`)
                .then(r => r.json()).then(d => { setDemandData(d); setLoading(false); })
                .catch(() => setLoading(false));
        }
    }, [tab, district, reduction]);

    const getUtilColor = (pct: number) => {
        if (pct >= 85) return 'var(--color-red)';
        if (pct >= 65) return 'var(--color-amber)';
        return 'var(--color-green)';
    };

    const getStatusBadge = (status: string) => {
        const colors: Record<string, string> = {
            'OVERLOADED': 'badge-red', 'HEAVY': 'badge-amber',
            'NORMAL': 'badge-green', 'UNDERLOADED': 'badge-blue'
        };
        return colors[status] || 'badge-green';
    };

    return (
        <>
            <TopBar title="Grid Operations" breadcrumbs={[]} />
            <div className="page-container">
                <div className="page-header-row">
                    <div className="header-icon-box purple">
                        <Activity size={24} />
                    </div>
                    <div>
                        <h2 className="page-header-title">Grid Operations Center</h2>
                        <p className="page-header-subtitle">Load balancing, peak forecasting, and demand-response simulation</p>
                    </div>
                </div>

                {/* Tab Buttons + District Selector */}
                <div className="grid-ops-controls">
                    <div className="tab-group">
                        <button className={`tab-btn ${tab === 'balance' ? 'active' : ''}`} onClick={() => setTab('balance')}>
                            <ArrowRightLeft size={15} /> Load Balance
                        </button>
                        <button className={`tab-btn ${tab === 'forecast' ? 'active' : ''}`} onClick={() => setTab('forecast')}>
                            <TrendingUp size={15} /> 24h Forecast
                        </button>
                        <button className={`tab-btn ${tab === 'demand' ? 'active' : ''}`} onClick={() => setTab('demand')}>
                            <Zap size={15} /> Demand Response
                        </button>
                    </div>
                    <div className="district-selector">
                        <select value={district} onChange={e => setDistrict(e.target.value)} className="select-input">
                            {DISTRICTS.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="select-chevron" />
                    </div>
                </div>

                {loading && (
                    <div className="loading-state">
                        <Activity size={24} className="spin" /> Loading data...
                    </div>
                )}

                {/* Load Balance Tab */}
                {tab === 'balance' && balanceData && !loading && (
                    <div className="grid-ops-content">
                        <div className="card ops-stat-row">
                            <div className="ops-stat">
                                <span className="ops-stat-label">Imbalance Score</span>
                                <span className={`ops-stat-value ${balanceData.imbalanceScore > 30 ? 'text-red' : balanceData.imbalanceScore > 15 ? 'text-amber' : 'text-green'}`}>
                                    {balanceData.imbalanceScore?.toFixed(1)}%
                                </span>
                            </div>
                            <div className="ops-stat">
                                <span className="ops-stat-label">Feeders Analyzed</span>
                                <span className="ops-stat-value">{balanceData.feeders?.length || 0}</span>
                            </div>
                            <div className="ops-stat">
                                <span className="ops-stat-label">Recommendations</span>
                                <span className="ops-stat-value text-blue">{balanceData.recommendations?.length || 0}</span>
                            </div>
                        </div>

                        <div className="card">
                            <h3 className="section-title"><BarChart3 size={16} /> Feeder Utilization</h3>
                            <div className="feeder-util-grid">
                                {balanceData.feeders?.map((f: any) => (
                                    <div key={f.feederId} className="feeder-util-item">
                                        <div className="feeder-util-header">
                                            <span className="feeder-id">{f.feederId}</span>
                                            <span className={`status-badge ${getStatusBadge(f.status)}`}>{f.status}</span>
                                        </div>
                                        <div className="util-bar-container">
                                            <div className="util-bar" style={{ width: `${Math.min(f.utilizationPercent, 100)}%`, backgroundColor: getUtilColor(f.utilizationPercent) }} />
                                        </div>
                                        <div className="feeder-util-meta">
                                            <span>{f.currentLoad?.toFixed(0)} / {f.estimatedCapacity} kW</span>
                                            <span style={{ color: getUtilColor(f.utilizationPercent), fontWeight: 600 }}>{f.utilizationPercent?.toFixed(0)}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {balanceData.recommendations?.length > 0 && (
                            <div className="card">
                                <h3 className="section-title"><ArrowRightLeft size={16} /> Transfer Recommendations</h3>
                                <div className="recommendation-list">
                                    {balanceData.recommendations.map((rec: any, i: number) => (
                                        <div key={i} className={`recommendation-card priority-${rec.priority?.toLowerCase()}`}>
                                            <div className="rec-priority-badge">{rec.priority}</div>
                                            <div className="rec-action">{rec.action}</div>
                                            <div className="rec-details">
                                                <span>From: <strong>{rec.from}</strong></span>
                                                <ArrowRightLeft size={14} />
                                                <span>To: <strong>{rec.to}</strong></span>
                                            </div>
                                            <div className="rec-meta">
                                                <span>Transfer: {rec.loadToTransfer?.toFixed(0)} kW</span>
                                                <span className="text-green">{rec.expectedImprovement}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Forecast Tab */}
                {tab === 'forecast' && forecastData && !loading && (
                    <div className="grid-ops-content">
                        <div className="card ops-stat-row">
                            <div className="ops-stat">
                                <span className="ops-stat-label">Peak Hour</span>
                                <span className="ops-stat-value text-amber">{forecastData.peakHour}:00</span>
                            </div>
                            <div className="ops-stat">
                                <span className="ops-stat-label">Peak Load</span>
                                <span className="ops-stat-value">{forecastData.peakLoad?.toFixed(0)} kW</span>
                            </div>
                            <div className="ops-stat">
                                <span className="ops-stat-label">Warnings</span>
                                <span className={`ops-stat-value ${forecastData.capacityWarnings?.length > 0 ? 'text-red' : 'text-green'}`}>
                                    {forecastData.capacityWarnings?.length || 0}
                                </span>
                            </div>
                        </div>

                        {forecastData.capacityWarnings?.length > 0 && (
                            <div className="card warning-card">
                                <AlertTriangle size={16} className="text-amber" />
                                <div className="warning-list">
                                    {forecastData.capacityWarnings.map((w: string, i: number) => (
                                        <div key={i} className="warning-item">{w}</div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="card">
                            <h3 className="section-title"><Clock size={16} /> 24-Hour Load Forecast</h3>
                            <div className="forecast-chart">
                                {forecastData.forecast?.map((h: any) => {
                                    const maxLoad = forecastData.peakLoad || 1;
                                    const heightPct = (h.predictedLoad / maxLoad) * 100;
                                    return (
                                        <div key={h.hour} className={`forecast-bar-wrapper ${h.overCapacity ? 'over-capacity' : ''}`}>
                                            <div className="forecast-bar" style={{
                                                height: `${Math.max(heightPct, 5)}%`,
                                                backgroundColor: h.overCapacity ? 'var(--color-red)' : heightPct > 80 ? 'var(--color-amber)' : 'var(--color-accent)',
                                                opacity: h.confidence / 100
                                            }} />
                                            <span className="forecast-hour">{h.label}</span>
                                            <span className="forecast-load">{h.predictedLoad?.toFixed(0)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* Demand Response Tab */}
                {tab === 'demand' && demandData && !loading && (
                    <div className="grid-ops-content">
                        <div className="card demand-controls">
                            <h3 className="section-title"><Zap size={16} /> Simulation Parameters</h3>
                            <div className="demand-slider-row">
                                <label>Industrial Load Reduction</label>
                                <div className="slider-with-val">
                                    <input type="range" min={5} max={30} step={5} value={reduction}
                                        onChange={e => setReduction(parseInt(e.target.value))}
                                        className="range-slider" />
                                    <span className="slider-val">{reduction}%</span>
                                </div>
                            </div>
                        </div>

                        <div className="demand-cards-grid">
                            {demandData.map((s: any, i: number) => (
                                <div key={i} className="card demand-scenario-card">
                                    <div className="demand-scenario-header">{s.scenario}</div>
                                    <div className="demand-metrics">
                                        <div className="demand-metric">
                                            <span className="demand-metric-label">Current Load</span>
                                            <span className="demand-metric-value">{s.currentLoad?.toFixed(0)} kW</span>
                                        </div>
                                        <div className="demand-metric">
                                            <span className="demand-metric-label">Reduced By</span>
                                            <span className="demand-metric-value text-green">-{s.reduction?.toFixed(0)} kW</span>
                                        </div>
                                        <div className="demand-metric">
                                            <span className="demand-metric-label">New Load</span>
                                            <span className="demand-metric-value text-blue">{s.newLoad?.toFixed(0)} kW</span>
                                        </div>
                                        <div className="demand-metric highlight">
                                            <span className="demand-metric-label">Est. Savings</span>
                                            <span className="demand-metric-value text-green">₹{(s.savingsEstimate || 0).toLocaleString('en-IN')}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

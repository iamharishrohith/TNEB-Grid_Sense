'use client';

import { useEffect, useState } from 'react';
import TopBar from '@/components/TopBar';
import { IndianRupee, Calculator, TrendingUp, BarChart3, ArrowUpRight, ArrowDownRight, PiggyBank } from 'lucide-react';
import { API_BASE } from '@/lib/api';

type Tab = 'cost' | 'savings' | 'payback' | 'comparison';

export default function EconomicsPage() {
    const [tab, setTab] = useState<Tab>('cost');
    const [costData, setCostData] = useState<any>(null);
    const [savingsData, setSavingsData] = useState<any>(null);
    const [paybackData, setPaybackData] = useState<any>(null);
    const [comparisonData, setComparisonData] = useState<any[]>([]);
    const [poles, setPoles] = useState(1210);
    const [lossPercent, setLossPercent] = useState(18);
    const [discountRate, setDiscountRate] = useState(10);

    useEffect(() => {
        fetch(`${API_BASE}/api/economics/cost-model?poles=${poles}`).then(r => r.json()).then(setCostData).catch(console.error);
        fetch(`${API_BASE}/api/economics/savings?poles=${poles}&lossPercent=${lossPercent}`).then(r => r.json()).then(setSavingsData).catch(console.error);
        fetch(`${API_BASE}/api/economics/payback?poles=${poles}&discountRate=${discountRate}`).then(r => r.json()).then(setPaybackData).catch(console.error);
        fetch(`${API_BASE}/api/economics/comparison?poles=${poles}`).then(r => r.json()).then(setComparisonData).catch(console.error);
    }, [poles, lossPercent, discountRate]);

    const formatINR = (val: number) => {
        if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
        if (val >= 100000) return `₹${(val / 100000).toFixed(1)} L`;
        return `₹${val?.toLocaleString('en-IN')}`;
    };

    return (
        <>
            <TopBar title="Economics & ROI" breadcrumbs={[]} />
            <div className="page-container">
                <div className="page-header-row">
                    <div className="header-icon-box green">
                        <IndianRupee size={24} />
                    </div>
                    <div>
                        <h2 className="page-header-title">Economics & ROI Engine</h2>
                        <p className="page-header-subtitle">Financial modeling, savings projection, and payback analysis</p>
                    </div>
                </div>

                {/* Controls */}
                <div className="card econ-controls">
                    <div className="econ-control-group">
                        <label>Deployment Scale</label>
                        <div className="slider-with-val">
                            <input type="range" min={100} max={5000} step={100} value={poles}
                                onChange={e => setPoles(parseInt(e.target.value))} className="range-slider" />
                            <span className="slider-val">{poles} poles</span>
                        </div>
                    </div>
                    <div className="econ-control-group">
                        <label>AT&C Loss %</label>
                        <div className="slider-with-val">
                            <input type="range" min={10} max={30} step={1} value={lossPercent}
                                onChange={e => setLossPercent(parseInt(e.target.value))} className="range-slider" />
                            <span className="slider-val">{lossPercent}%</span>
                        </div>
                    </div>
                    <div className="econ-control-group">
                        <label>Discount Rate</label>
                        <div className="slider-with-val">
                            <input type="range" min={5} max={20} step={1} value={discountRate}
                                onChange={e => setDiscountRate(parseInt(e.target.value))} className="range-slider" />
                            <span className="slider-val">{discountRate}%</span>
                        </div>
                    </div>
                </div>

                {/* Tab Buttons */}
                <div className="tab-group">
                    <button className={`tab-btn ${tab === 'cost' ? 'active' : ''}`} onClick={() => setTab('cost')}>
                        <Calculator size={15} /> Cost Model
                    </button>
                    <button className={`tab-btn ${tab === 'savings' ? 'active' : ''}`} onClick={() => setTab('savings')}>
                        <PiggyBank size={15} /> Savings
                    </button>
                    <button className={`tab-btn ${tab === 'payback' ? 'active' : ''}`} onClick={() => setTab('payback')}>
                        <TrendingUp size={15} /> Payback
                    </button>
                    <button className={`tab-btn ${tab === 'comparison' ? 'active' : ''}`} onClick={() => setTab('comparison')}>
                        <BarChart3 size={15} /> 5-Year Compare
                    </button>
                </div>

                {/* Cost Model Tab */}
                {tab === 'cost' && costData && (
                    <div className="econ-content">
                        <div className="econ-summary-row">
                            <div className="card econ-summary-card highlight-blue">
                                <span className="econ-summary-label">Total CAPEX</span>
                                <span className="econ-summary-value">{formatINR(costData.breakdown?.totalCapex)}</span>
                            </div>
                            <div className="card econ-summary-card">
                                <span className="econ-summary-label">Annual OPEX</span>
                                <span className="econ-summary-value">{formatINR(costData.breakdown?.totalAnnualOpex)}</span>
                            </div>
                            <div className="card econ-summary-card">
                                <span className="econ-summary-label">Per-Pole CAPEX</span>
                                <span className="econ-summary-value">{formatINR(costData.perPole?.capex)}</span>
                            </div>
                            <div className="card econ-summary-card">
                                <span className="econ-summary-label">Per-Pole OPEX/yr</span>
                                <span className="econ-summary-value">{formatINR(costData.perPole?.annualOpex)}</span>
                            </div>
                        </div>
                        <div className="card">
                            <h3 className="section-title"><Calculator size={16} /> Cost Breakdown</h3>
                            <div className="cost-breakdown-grid">
                                {[
                                    { label: 'Hardware (BOM)', value: costData.breakdown?.hardware, color: '#3b82f6' },
                                    { label: 'Installation', value: costData.breakdown?.installation, color: '#8b5cf6' },
                                    { label: 'Annual Communication', value: costData.breakdown?.annualComm, color: '#06b6d4' },
                                    { label: 'Annual Maintenance', value: costData.breakdown?.annualMaintenance, color: '#f59e0b' },
                                    { label: 'Annual Infrastructure', value: costData.breakdown?.annualInfra, color: '#10b981' },
                                ].map(item => {
                                    const maxVal = costData.breakdown?.totalCapex || 1;
                                    return (
                                        <div key={item.label} className="cost-item">
                                            <div className="cost-item-header">
                                                <span>{item.label}</span>
                                                <span className="cost-item-amount">{formatINR(item.value)}</span>
                                            </div>
                                            <div className="cost-bar-bg">
                                                <div className="cost-bar" style={{
                                                    width: `${Math.min((item.value / maxVal) * 100, 100)}%`,
                                                    backgroundColor: item.color
                                                }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* Savings Tab */}
                {tab === 'savings' && savingsData && (
                    <div className="econ-content">
                        <div className="econ-summary-row">
                            {savingsData.scenarios && Object.entries(savingsData.scenarios).map(([key, s]: [string, any]) => (
                                <div key={key} className={`card econ-summary-card ${key === 'moderate' ? 'highlight-green' : ''}`}>
                                    <span className="econ-summary-label">{key.charAt(0).toUpperCase() + key.slice(1)} ({s.recoveryPercent}%)</span>
                                    <span className="econ-summary-value text-green">{formatINR(s.annualRecoveryCr * 10000000)}</span>
                                    <span className="econ-summary-sub">{formatINR(s.monthlyRecoveryCr * 10000000)} /month</span>
                                </div>
                            ))}
                        </div>

                        <div className="savings-extra-grid">
                            <div className="card savings-extra-card">
                                <h4 className="savings-extra-title">Transformer Failure Savings</h4>
                                <div className="savings-extra-value text-green">
                                    <ArrowDownRight size={16} /> {formatINR(savingsData.transformerSavings?.annualSavingsCr * 10000000)}
                                </div>
                                <div className="savings-extra-detail">
                                    {savingsData.transformerSavings?.preventedFailures} failures prevented/year
                                </div>
                            </div>
                            <div className="card savings-extra-card">
                                <h4 className="savings-extra-title">Dispatch Cost Savings</h4>
                                <div className="savings-extra-value text-green">
                                    <ArrowDownRight size={16} /> {formatINR(savingsData.dispatchSavings?.annualSavingsCr * 10000000)}
                                </div>
                                <div className="savings-extra-detail">
                                    {savingsData.dispatchSavings?.hoursSaved} crew-hours saved/year
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Payback Tab */}
                {tab === 'payback' && paybackData && (
                    <div className="econ-content">
                        <div className="econ-summary-row">
                            <div className="card econ-summary-card highlight-green">
                                <span className="econ-summary-label">Payback Period</span>
                                <span className="econ-summary-value">{paybackData.simplePaybackMonths} months</span>
                            </div>
                            <div className="card econ-summary-card">
                                <span className="econ-summary-label">5-Year NPV</span>
                                <span className="econ-summary-value text-green">{formatINR(paybackData.npvYear5)}</span>
                            </div>
                            <div className="card econ-summary-card">
                                <span className="econ-summary-label">5-Year ROI</span>
                                <span className="econ-summary-value text-green">{paybackData.roiYear5Percent}%</span>
                            </div>
                            <div className="card econ-summary-card">
                                <span className="econ-summary-label">Annual Savings</span>
                                <span className="econ-summary-value">{formatINR(paybackData.annualSavings)}</span>
                            </div>
                        </div>

                        <div className="card">
                            <h3 className="section-title"><TrendingUp size={16} /> Year-by-Year Projection</h3>
                            <div className="payback-chart">
                                {paybackData.yearByYear?.map((y: any) => {
                                    const maxVal = Math.max(
                                        ...paybackData.yearByYear.map((yr: any) => Math.max(Math.abs(yr.cumulativeCost), Math.abs(yr.cumulativeSavings)))
                                    );
                                    return (
                                        <div key={y.year} className="payback-year">
                                            <div className="payback-label">Year {y.year}</div>
                                            <div className="payback-bars">
                                                <div className="payback-bar-row">
                                                    <div className="payback-bar cost-bar" style={{
                                                        width: `${(y.cumulativeCost / maxVal) * 100}%`
                                                    }} />
                                                    <span className="payback-bar-label">{formatINR(y.cumulativeCost)}</span>
                                                </div>
                                                <div className="payback-bar-row">
                                                    <div className="payback-bar savings-bar" style={{
                                                        width: `${(y.cumulativeSavings / maxVal) * 100}%`
                                                    }} />
                                                    <span className="payback-bar-label">{formatINR(y.cumulativeSavings)}</span>
                                                </div>
                                            </div>
                                            <div className={`payback-net ${y.netPosition >= 0 ? 'text-green' : 'text-red'}`}>
                                                {y.netPosition >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                                {formatINR(Math.abs(y.netPosition))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* Comparison Tab */}
                {tab === 'comparison' && comparisonData?.length > 0 && (
                    <div className="econ-content">
                        <div className="comparison-grid">
                            {comparisonData.map((c: any) => (
                                <div key={c.metric} className="card comparison-card">
                                    <h4 className="comparison-metric">{c.metric}</h4>
                                    <div className="comparison-bars">
                                        {c.withoutGridSense?.map((val: number, i: number) => {
                                            const maxVal = Math.max(
                                                ...c.withoutGridSense,
                                                ...c.withGridSense
                                            );
                                            return (
                                                <div key={i} className="comparison-year-row">
                                                    <span className="comparison-year">Yr {i + 1}</span>
                                                    <div className="comparison-dual-bar">
                                                        <div className="comp-bar without" style={{ width: `${(val / maxVal) * 100}%` }} />
                                                        <div className="comp-bar with" style={{ width: `${(c.withGridSense[i] / maxVal) * 100}%` }} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="comparison-footer">
                                        <span className="comp-legend"><span className="comp-dot without" /> Without</span>
                                        <span className="comp-legend"><span className="comp-dot with" /> With GridSense</span>
                                        <span className="comparison-savings text-green">
                                            Save {formatINR(Math.abs(c.savingsYear5))} by Year 5
                                        </span>
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

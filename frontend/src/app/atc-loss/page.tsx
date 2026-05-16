'use client';

import { useEffect, useState } from 'react';
import TopsBar from '@/components/TopBar';
import { BarChart2, Activity } from 'lucide-react';
import { API_BASE } from '@/lib/api';

export default function ATCLossPage() {
    const [reports, setReports] = useState<any[]>([]);

    useEffect(() => {
        fetch(`${API_BASE}/api/analytics/atc-loss`)
            .then(r => r.json())
            .then(data => {
                // Sort by highest loss percentage
                setReports([...data].sort((a, b) => b.lossPercentage - a.lossPercentage));
            })
            .catch(console.error);
    }, []);

    return (
        <>
            <TopsBar title="AT&C Loss Analysis" breadcrumbs={[]} />
            <div className="page-container">
                <div className="page-header-row">
                    <div className="header-icon-box indigo">
                        <BarChart2 size={24} />
                    </div>
                    <div>
                        <h2 className="page-header-title">Aggregate Technical & Commercial Losses</h2>
                        <p className="page-header-subtitle">Feeder-level power tracking to identify line theft and inefficiencies</p>
                    </div>
                </div>

                <div className="card table-panel">
                    <div className="table-wrapper">
                        <table className="district-table">
                            <thead>
                                <tr>
                                    <th>Feeder ID</th>
                                    <th style={{ textAlign: 'right' }}>Input Power (kW)</th>
                                    <th style={{ textAlign: 'right' }}>Billed Load (kW)</th>
                                    <th style={{ textAlign: 'right' }}>Loss Delta (kW)</th>
                                    <th style={{ textAlign: 'right' }}>Loss %</th>
                                    <th style={{ textAlign: 'center' }}>Status Analysis</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reports.map((r, i) => {
                                    const lossColor = r.lossPercentage > 15 ? 'dt-red' : r.lossPercentage > 10 ? 'dt-amber' : 'dt-green';

                                    return (
                                        <tr key={i}>
                                            <td className="dt-name font-mono">{r.feederId}</td>
                                            <td className="dt-numeric font-mono" style={{ textAlign: 'right', fontWeight: 'normal', color: '#cbd5e1' }}>{r.inputPower?.toFixed(2) ?? '--'}</td>
                                            <td className="dt-numeric font-mono" style={{ textAlign: 'right', fontWeight: 'normal', color: '#cbd5e1' }}>{r.measuredLoad?.toFixed(2) ?? '--'}</td>
                                            <td className="dt-numeric font-mono" style={{ textAlign: 'right', fontWeight: 'normal' }}>{r.loss?.toFixed(2) ?? '--'}</td>
                                            <td className={`dt-numeric font-mono ${lossColor}`} style={{ textAlign: 'right' }}>
                                                {r.lossPercentage?.toFixed(1) ?? '--'}%
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {r.possibleTheft ? (
                                                    <span className="status-tag theft">⚠ THEFT SUSPECTED</span>
                                                ) : r.anomalous ? (
                                                    <span className="status-tag anomalous">ANOMALOUS</span>
                                                ) : (
                                                    <span className="status-tag normal">NORMAL</span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                                {reports.length === 0 && (
                                    <tr>
                                        <td colSpan={6} style={{ textAlign: 'center', padding: '64px 0', color: '#64748b' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                <Activity style={{ marginBottom: '8px', opacity: 0.5 }} />
                                                Analyzing feeder networks...
                                            </div>
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

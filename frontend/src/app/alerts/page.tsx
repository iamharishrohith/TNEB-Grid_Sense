'use client';

import { useEffect, useState, useCallback } from 'react';
import TopBar from '@/components/TopBar';
import { Bell, ShieldAlert, CheckCircle2, Clock, AlertTriangle, ChevronRight, RefreshCw } from 'lucide-react';
import { API_BASE } from '@/lib/api';

export default function AlertsPage() {
    const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [tab, setTab] = useState<'active' | 'history'>('active');
    const [refreshing, setRefreshing] = useState(false);

    const loadData = useCallback(() => {
        setRefreshing(true);
        Promise.all([
            fetch(`${API_BASE}/api/alerts/active`).then(r => r.json()),
            fetch(`${API_BASE}/api/alerts/stats`).then(r => r.json()),
            fetch(`${API_BASE}/api/alerts/history?limit=50`).then(r => r.json()),
        ]).then(([alerts, alertStats, hist]) => {
            setActiveAlerts(alerts);
            setStats(alertStats);
            setHistory(hist);
            setRefreshing(false);
        }).catch(() => setRefreshing(false));
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleAcknowledge = async (alertId: string) => {
        await fetch(`${API_BASE}/api/alerts/${alertId}/acknowledge`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ actor: 'dashboard_user' })
        });
        loadData();
    };

    const handleResolve = async (alertId: string) => {
        await fetch(`${API_BASE}/api/alerts/${alertId}/resolve`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }
        });
        loadData();
    };

    const tierColor = (tier: string) => {
        switch (tier) {
            case 'L1': return 'tier-l1';
            case 'L2': return 'tier-l2';
            case 'L3': return 'tier-l3';
            default: return '';
        }
    };

    const severityColor = (sev: string) => {
        switch (sev) {
            case 'CRITICAL': return 'badge-red';
            case 'HIGH': return 'badge-amber';
            case 'MEDIUM': return 'badge-yellow';
            default: return 'badge-blue';
        }
    };

    const stateIcon = (state: string) => {
        switch (state) {
            case 'OPEN': return <AlertTriangle size={14} className="text-red" />;
            case 'ACKNOWLEDGED': return <Clock size={14} className="text-amber" />;
            case 'RESOLVED': return <CheckCircle2 size={14} className="text-green" />;
            default: return null;
        }
    };

    const timeSince = (iso: string) => {
        const sec = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
        if (sec < 60) return `${sec}s ago`;
        if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
        return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m ago`;
    };

    return (
        <>
            <TopBar title="Alert Center" breadcrumbs={[]} />
            <div className="page-container">
                <div className="page-header-row">
                    <div className="header-icon-box red">
                        <Bell size={24} />
                    </div>
                    <div>
                        <h2 className="page-header-title">Alert Escalation Center</h2>
                        <p className="page-header-subtitle">3-tier automated escalation with acknowledge and resolve workflows</p>
                    </div>
                    <button className="refresh-btn" onClick={loadData} disabled={refreshing}>
                        <RefreshCw size={16} className={refreshing ? 'spin' : ''} /> Refresh
                    </button>
                </div>

                {/* Stats Strip */}
                {stats && (
                    <div className="alert-stats-strip">
                        <div className="alert-stat">
                            <span className="alert-stat-number text-red">{stats.active || 0}</span>
                            <span className="alert-stat-label">Active</span>
                        </div>
                        <div className="alert-stat">
                            <span className="alert-stat-number tier-l1">{stats.byTier?.L1 || 0}</span>
                            <span className="alert-stat-label">L1 Auto-Retry</span>
                        </div>
                        <div className="alert-stat">
                            <span className="alert-stat-number tier-l2">{stats.byTier?.L2 || 0}</span>
                            <span className="alert-stat-label">L2 Engineer</span>
                        </div>
                        <div className="alert-stat">
                            <span className="alert-stat-number tier-l3">{stats.byTier?.L3 || 0}</span>
                            <span className="alert-stat-label">L3 Management</span>
                        </div>
                        <div className="alert-stat">
                            <span className="alert-stat-number text-green">{stats.resolved || 0}</span>
                            <span className="alert-stat-label">Resolved</span>
                        </div>
                        <div className="alert-stat">
                            <span className="alert-stat-number text-muted">{stats.total || 0}</span>
                            <span className="alert-stat-label">Total</span>
                        </div>
                    </div>
                )}

                {/* Tab Toggle */}
                <div className="tab-group" style={{ marginBottom: '1rem' }}>
                    <button className={`tab-btn ${tab === 'active' ? 'active' : ''}`} onClick={() => setTab('active')}>
                        <ShieldAlert size={15} /> Active ({activeAlerts.length})
                    </button>
                    <button className={`tab-btn ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
                        <Clock size={15} /> History ({history.length})
                    </button>
                </div>

                {/* Active Alerts */}
                {tab === 'active' && (
                    <div className="alert-cards-grid">
                        {activeAlerts.length === 0 && (
                            <div className="empty-state">
                                <CheckCircle2 size={32} className="text-green" />
                                <p>No active alerts — system is clear</p>
                            </div>
                        )}
                        {activeAlerts.slice(0, 50).map((a: any) => (
                            <div key={a.id} className={`card alert-card alert-${a.severity?.toLowerCase()}`}>
                                <div className="alert-card-top">
                                    <div className="alert-card-badges">
                                        <span className={`tier-badge ${tierColor(a.currentTier)}`}>{a.currentTier}</span>
                                        <span className={`status-badge ${severityColor(a.severity)}`}>{a.severity}</span>
                                        <span className="alert-state-badge">{stateIcon(a.state)} {a.state}</span>
                                    </div>
                                    <span className="alert-time">{timeSince(a.createdAt)}</span>
                                </div>
                                <div className="alert-card-body">
                                    <div className="alert-pole-id">{a.poleId} <ChevronRight size={12} /></div>
                                    <div className="alert-type">{a.type}</div>
                                    <div className="alert-message">{a.message}</div>
                                    <div className="alert-meta">
                                        <span>{a.feederId}</span> · <span>{a.districtId}</span>
                                    </div>
                                </div>
                                <div className="alert-card-actions">
                                    {a.state === 'OPEN' && (
                                        <button className="action-btn action-acknowledge" onClick={() => handleAcknowledge(a.id)}>
                                            <Clock size={14} /> Acknowledge
                                        </button>
                                    )}
                                    {(a.state === 'OPEN' || a.state === 'ACKNOWLEDGED') && (
                                        <button className="action-btn action-resolve" onClick={() => handleResolve(a.id)}>
                                            <CheckCircle2 size={14} /> Resolve
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* History */}
                {tab === 'history' && (
                    <div className="alert-history-list">
                        {history.map((a: any) => (
                            <div key={a.id} className="card alert-history-item">
                                <div className="alert-history-left">
                                    {stateIcon(a.state)}
                                    <span className="alert-pole-id">{a.poleId}</span>
                                    <span className={`status-badge sm ${severityColor(a.severity)}`}>{a.severity}</span>
                                    <span className={`tier-badge sm ${tierColor(a.currentTier)}`}>{a.currentTier}</span>
                                </div>
                                <div className="alert-history-center">
                                    <span className="alert-type">{a.type}</span>
                                </div>
                                <div className="alert-history-right">
                                    <span className="text-muted">{timeSince(a.createdAt)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

'use client';

import { useEffect, useState } from 'react';
import TopBar from '@/components/TopBar';
import { Cpu, HardDrive, Signal, Clock, ChevronDown, Search, Filter, Wifi, Radio, Smartphone } from 'lucide-react';
import { API_BASE } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function FleetPage() {
    const [devices, setDevices] = useState<any[]>([]);
    const [firmware, setFirmware] = useState<any[]>([]);
    const [zones, setZones] = useState<any[]>([]);
    const [totalDevices, setTotalDevices] = useState(0);
    const [filterZone, setFilterZone] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [search, setSearch] = useState('');
    const router = useRouter();

    useEffect(() => {
        const params = new URLSearchParams();
        if (filterZone) params.set('zone', filterZone);
        if (filterStatus) params.set('status', filterStatus);
        const qs = params.toString();

        fetch(`${API_BASE}/api/fleet/status${qs ? '?' + qs : ''}`)
            .then(r => r.json())
            .then(d => { setDevices(d.devices || []); setTotalDevices(d.total || 0); })
            .catch(console.error);

        fetch(`${API_BASE}/api/fleet/firmware`).then(r => r.json()).then(setFirmware).catch(console.error);
        fetch(`${API_BASE}/api/fleet/zones`).then(r => r.json()).then(setZones).catch(console.error);
    }, [filterZone, filterStatus]);

    const filteredDevices = search
        ? devices.filter(d => d.poleId?.toLowerCase().includes(search.toLowerCase()) || d.feederId?.toLowerCase().includes(search.toLowerCase()))
        : devices;

    const statusColor = (s: string) => {
        switch (s) {
            case 'HEALTHY': return 'badge-green';
            case 'DEGRADED': return 'badge-amber';
            case 'CRITICAL': return 'badge-red';
            case 'OFFLINE': return 'badge-gray';
            default: return '';
        }
    };

    const commIcon = (ch: string) => {
        if (ch.includes('WiFi')) return <Wifi size={13} />;
        if (ch.includes('LoRa')) return <Radio size={13} />;
        return <Smartphone size={13} />;
    };

    const formatUptime = (sec: number) => {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        return `${h}h ${m}m`;
    };

    // Donut chart SVG
    const DonutChart = ({ data }: { data: any[] }) => {
        const total = data.reduce((s: number, d: any) => s + d.count, 0);
        const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#a855f7', '#ef4444'];
        let cumulative = 0;

        return (
            <div className="donut-chart-container">
                <svg viewBox="0 0 42 42" className="donut-svg">
                    <circle cx="21" cy="21" r="15.915" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
                    {data.map((d: any, i: number) => {
                        const pct = (d.count / total) * 100;
                        const dashArray = `${pct} ${100 - pct}`;
                        const dashOffset = 100 - cumulative + 25;
                        cumulative += pct;
                        return (
                            <circle key={d.version} cx="21" cy="21" r="15.915" fill="none"
                                stroke={colors[i % colors.length]} strokeWidth="5"
                                strokeDasharray={dashArray} strokeDashoffset={dashOffset}
                                strokeLinecap="round" />
                        );
                    })}
                    <text x="21" y="20" textAnchor="middle" className="donut-center-text">{total}</text>
                    <text x="21" y="24.5" textAnchor="middle" className="donut-center-label">devices</text>
                </svg>
                <div className="donut-legend">
                    {data.map((d: any, i: number) => (
                        <div key={d.version} className="legend-item">
                            <span className="legend-dot" style={{ backgroundColor: colors[i % colors.length] }} />
                            <span className="legend-label">v{d.version}</span>
                            <span className="legend-count">{d.count} ({d.percentage}%)</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <>
            <TopBar title="Fleet Management" breadcrumbs={[]} />
            <div className="page-container">
                <div className="page-header-row">
                    <div className="header-icon-box teal">
                        <Cpu size={24} />
                    </div>
                    <div>
                        <h2 className="page-header-title">Device Fleet Management</h2>
                        <p className="page-header-subtitle">Monitor all deployed pole nodes — status, firmware, connectivity</p>
                    </div>
                </div>

                {/* Zone Summary Cards */}
                <div className="zone-cards-grid">
                    {zones.map(z => (
                        <div key={z.zone} className="card zone-card" onClick={() => setFilterZone(z.zone === filterZone ? '' : z.zone)}>
                            <div className="zone-card-header">
                                <span className="zone-name">{z.zone} Zone</span>
                                <span className="zone-total">{z.totalDevices}</span>
                            </div>
                            <div className="zone-health-bar-bg">
                                <div className="zone-health-bar" style={{
                                    width: `${z.avgHealthScore}%`,
                                    backgroundColor: z.avgHealthScore > 70 ? 'var(--color-green)' : z.avgHealthScore > 50 ? 'var(--color-amber)' : 'var(--color-red)'
                                }} />
                            </div>
                            <div className="zone-breakdown">
                                <span className="text-green">{z.healthy} ok</span>
                                <span className="text-amber">{z.degraded} deg</span>
                                <span className="text-red">{z.critical} crit</span>
                                <span className="text-muted">{z.offline} off</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="fleet-main-grid">
                    {/* Device Table */}
                    <div className="card fleet-table-card">
                        <div className="fleet-table-header">
                            <h3 className="section-title"><HardDrive size={16} /> Device Fleet ({totalDevices})</h3>
                            <div className="fleet-filters">
                                <div className="search-box">
                                    <Search size={14} />
                                    <input type="text" placeholder="Search pole ID..." value={search}
                                        onChange={e => setSearch(e.target.value)} className="search-input" />
                                </div>
                                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="select-input select-sm">
                                    <option value="">All Status</option>
                                    <option value="HEALTHY">Healthy</option>
                                    <option value="DEGRADED">Degraded</option>
                                    <option value="CRITICAL">Critical</option>
                                    <option value="OFFLINE">Offline</option>
                                </select>
                            </div>
                        </div>
                        <div className="fleet-table-wrapper">
                            <table className="fleet-table">
                                <thead>
                                    <tr>
                                        <th>Pole ID</th>
                                        <th>Status</th>
                                        <th>Health</th>
                                        <th>Firmware</th>
                                        <th>Comm</th>
                                        <th>Uptime</th>
                                        <th>Zone</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredDevices.slice(0, 50).map(d => (
                                        <tr key={d.poleId} className="fleet-row" onClick={() => router.push(`/pole/${d.poleId}`)}>
                                            <td className="pole-id-cell">{d.poleId}</td>
                                            <td><span className={`status-badge ${statusColor(d.status)}`}>{d.status}</span></td>
                                            <td>
                                                <div className="health-cell">
                                                    <div className="mini-bar-bg">
                                                        <div className="mini-bar" style={{
                                                            width: `${d.healthScore}%`,
                                                            backgroundColor: d.healthScore > 70 ? 'var(--color-green)' : d.healthScore > 40 ? 'var(--color-amber)' : 'var(--color-red)'
                                                        }} />
                                                    </div>
                                                    <span>{d.healthScore}%</span>
                                                </div>
                                            </td>
                                            <td className="firmware-cell">v{d.firmwareVersion}</td>
                                            <td className="comm-cell">{commIcon(d.commChannel)} {d.commChannel}</td>
                                            <td className="uptime-cell">{formatUptime(d.uptime)}</td>
                                            <td className="zone-cell">{d.zone}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Firmware Distribution */}
                    <div className="card firmware-card">
                        <h3 className="section-title"><Signal size={16} /> Firmware Distribution</h3>
                        {firmware.length > 0 && <DonutChart data={firmware} />}
                    </div>
                </div>
            </div>
        </>
    );
}

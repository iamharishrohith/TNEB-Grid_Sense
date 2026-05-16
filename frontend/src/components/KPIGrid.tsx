'use client';

import { useGridStore } from '@/store/gridStore';
import { Radio, CheckCircle, AlertOctagon, Thermometer, Zap } from 'lucide-react';

export default function KPIGrid() {
    const { stats } = useGridStore();

    const kpis = [
        {
            label: 'Total Poles',
            value: stats?.totalPoles ?? '--',
            icon: Radio,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/20'
        },
        {
            label: 'Active Poles',
            value: stats?.activePoles ?? '--',
            icon: CheckCircle,
            color: 'text-green-400',
            bg: 'bg-green-500/10',
            border: 'border-green-500/20'
        },
        {
            label: 'Active Faults',
            value: stats?.totalFaults ?? '--',
            icon: AlertOctagon,
            color: 'text-red-400',
            bg: 'bg-red-500/10',
            border: 'border-red-500/20'
        },
        {
            label: 'Overheat Alerts',
            value: stats?.totalOverheats ?? '--',
            icon: Thermometer,
            color: 'text-amber-400',
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/20'
        },
        {
            label: 'Total Load (kW)',
            value: stats?.totalLoad != null ? stats.totalLoad.toFixed(1) : '--',
            icon: Zap,
            color: 'text-cyan-400',
            bg: 'bg-cyan-500/10',
            border: 'border-cyan-500/20'
        },
    ];

    return (
        <div className="kpi-grid">
            {kpis.map((kpi, i) => {
                const Icon = kpi.icon;
                const iconColorClass = kpi.color.replace('text-', 'kpi-icon-');
                return (
                    <div key={i} className="card kpi-card animate-in" style={{ animationDelay: `${i * 0.05}s` }}>
                        <div className={`kpi-icon-wrapper ${iconColorClass}`}>
                            <Icon size={20} />
                        </div>
                        <div className="kpi-value">
                            {kpi.value}
                        </div>
                        <div className="kpi-label">
                            {kpi.label}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

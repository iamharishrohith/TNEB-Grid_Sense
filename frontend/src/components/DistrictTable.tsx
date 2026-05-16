'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { API_BASE } from '@/lib/api';

interface District {
    districtId: string;
    avgHealthScore: number;
    poleCount: number;
    activePoles: number;
    totalLoad: number;
    avgVoltage: number;
    faultCount: number;
    riskLevel: string;
}

export default function DistrictTable() {
    const [districts, setDistricts] = useState<District[]>([]);
    const router = useRouter();

    useEffect(() => {
        fetch(`${API_BASE}/api/districts`)
            .then(r => r.json())
            .then(data => {
                // Sort by health score ascending (worst first)
                const sorted = [...data].sort((a, b) => a.avgHealthScore - b.avgHealthScore);
                setDistricts(sorted);
            })
            .catch(console.error);

        const interval = setInterval(() => {
            fetch(`${API_BASE}/api/districts`)
                .then(r => r.json())
                .then(data => {
                    setDistricts([...data].sort((a, b) => a.avgHealthScore - b.avgHealthScore));
                })
                .catch(console.error);
        }, 5000);

        return () => clearInterval(interval);
    }, []);



    const getHealthColor = (health: number) => {
        if (health >= 80) return 'text-green-400';
        if (health >= 60) return 'text-amber-400';
        if (health >= 35) return 'text-orange-400';
        return 'text-red-400';
    };

    return (
        <div className="table-wrapper">
            <table className="district-table">
                <thead>
                    <tr>
                        <th>District</th>
                        <th className="text-right">Poles</th>
                        <th className="text-right">Faults</th>
                        <th className="text-right">Health</th>
                        <th className="text-right">Load (kW)</th>
                        <th className="text-right">Voltage</th>
                        <th className="text-center">Risk</th>
                    </tr>
                </thead>
                <tbody>
                    {districts.map(d => (
                        <tr
                            key={d.districtId}
                            onClick={() => router.push(`/district/${d.districtId}`)}
                        >
                            <td className="dt-name">
                                {d.districtId}
                                <ChevronRight size={14} className="dt-icon-hover" />
                            </td>
                            <td className="dt-numeric font-mono" style={{ textAlign: 'right' }}>{d.poleCount}</td>
                            <td className={`dt-faults text-right ${d.faultCount > 0 ? 'has-faults' : 'no-faults'}`}>
                                {d.faultCount}
                            </td>
                            <td className={`dt-health text-right ${getHealthColor(d.avgHealthScore).replace('text-', '')}`}>
                                <span className={getHealthColor(d.avgHealthScore)}>{d.avgHealthScore.toFixed(1)}%</span>
                            </td>
                            <td className="dt-numeric font-mono" style={{ textAlign: 'right' }}>{d.totalLoad.toFixed(1)}</td>
                            <td className="dt-numeric font-mono" style={{ textAlign: 'right' }}>{d.avgVoltage.toFixed(1)}V</td>
                            <td className="text-center">
                                <span className={`badge ${d.riskLevel.toLowerCase()}`}>
                                    {d.riskLevel}
                                </span>
                            </td>
                        </tr>
                    ))}
                    {districts.length === 0 && (
                        <tr>
                            <td colSpan={7} className="text-center" style={{ padding: '32px', color: '#64748b' }}>Loading districts...</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

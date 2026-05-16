'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import AIQueryBar from '@/components/AIQueryBar';

interface BreadcrumbItem {
    label: string;
    href?: string;
}

export default function TopBar({
    title,
    breadcrumbs
}: {
    title: string;
    breadcrumbs: BreadcrumbItem[]
}) {
    const [time, setTime] = useState<string>('--:--:--');

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date().toLocaleTimeString('en-IN', {
                hour: '2-digit', minute: '2-digit', second: '2-digit',
                hour12: false, timeZone: 'Asia/Kolkata',
            }));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (e.target.value !== 'TN') {
            e.target.value = 'TN';
            alert('🔒 Coming Soon!\n\nThis state is not yet available.\nOnly Tamil Nadu (38 Districts) is active in the current deployment phase.');
        }
    };

    return (
        <header className="topbar">
            <div className="topbar-title-section">
                <h1 className="topbar-title">{title}</h1>
                <div className="breadcrumbs">
                    <Link href="/" className="breadcrumb-link">India</Link>
                    <ChevronRight size={12} className="breadcrumb-separator" />
                    <Link href="/" className="breadcrumb-link">Tamil Nadu</Link>
                    {breadcrumbs.map((crumb, i) => (
                        <div key={i} className="breadcrumb-item">
                            <ChevronRight size={12} className="breadcrumb-separator" />
                            {crumb.href ? (
                                <Link href={crumb.href} className="breadcrumb-link">{crumb.label}</Link>
                            ) : (
                                <span className="breadcrumb-label">{crumb.label}</span>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="topbar-right">
                <AIQueryBar />
                <select
                    onChange={handleStateChange}
                    defaultValue="TN"
                    className="state-select"
                >
                    <optgroup label="Active">
                        <option value="TN">🟢 Tamil Nadu (38 Districts)</option>
                    </optgroup>
                    <optgroup label="Coming Soon" className="text-slate-500">
                        <option value="KA" disabled>🔒 Karnataka</option>
                        <option value="KL" disabled>🔒 Kerala</option>
                        <option value="AP" disabled>🔒 Andhra Pradesh</option>
                        <option value="TS" disabled>🔒 Telangana</option>
                        <option value="MH" disabled>🔒 Maharashtra</option>
                        <option value="GJ" disabled>🔒 Gujarat</option>
                    </optgroup>
                </select>

                <div className="time-section">
                    <div className="live-badge">
                        <span className="live-pulse"></span>
                        Live
                    </div>
                    <div className="clock-display" suppressHydrationWarning>
                        {time}
                    </div>
                </div>
            </div>
        </header>
    );
}

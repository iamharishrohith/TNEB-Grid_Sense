'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useGridStore } from '@/store/gridStore';
import { Map, Building2, Radio, AlertTriangle, Wrench, BarChart2, Zap, BatteryCharging, Activity, Cpu, Bell, Crown, IndianRupee } from 'lucide-react';

export default function Sidebar() {
    const pathname = usePathname();
    const { connectionStatus, stats } = useGridStore();

    type NavItem = { name: string; href: string; icon: any; exact?: boolean; matchPrefix?: string; badge?: number };

    const navItems: NavItem[] = [
        { name: 'State Overview', href: '/', exact: true, icon: Map },
        { name: 'District View', href: '/district/Chennai', matchPrefix: '/district', icon: Building2 },
        { name: 'Pole Inspector', href: '/pole/POLE-001', matchPrefix: '/pole', icon: Radio },
    ];

    const analyticsItems: NavItem[] = [
        { name: 'Fault Events', href: '/events', exact: true, icon: AlertTriangle, badge: stats?.totalFaults || 0 },
        { name: 'Maintenance', href: '/maintenance', exact: true, icon: Wrench },
        { name: 'AT&C Loss', href: '/atc-loss', exact: true, icon: BarChart2 }
    ];

    const opsItems: NavItem[] = [
        { name: 'Grid Operations', href: '/grid-ops', exact: true, icon: Activity },
        { name: 'Fleet Management', href: '/fleet', exact: true, icon: Cpu },
        { name: 'Alert Center', href: '/alerts', exact: true, icon: Bell },
    ];

    const mgmtItems: NavItem[] = [
        { name: 'Executive View', href: '/executive', exact: true, icon: Crown },
        { name: 'Economics & ROI', href: '/economics', exact: true, icon: IndianRupee },
    ];

    const b2bItems: NavItem[] = [
        { name: 'Industrial APFC', href: '/apfc', matchPrefix: '/apfc', icon: BatteryCharging },
    ];

    const renderNavSection = (title: string, items: NavItem[]) => (
        <>
            <div className="nav-section-title">{title}</div>
            {items.map((item) => {
                const isActive = item.exact
                    ? pathname === item.href
                    : pathname.startsWith(item.matchPrefix || item.href);
                const Icon = item.icon;
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`nav-link ${isActive ? 'active' : ''}`}
                    >
                        <Icon size={18} />
                        <span className="nav-label">{item.name}</span>
                        {/* @ts-ignore */}
                        {item.badge !== undefined && item.badge > 0 && (
                            <span className="nav-badge">
                                {/* @ts-ignore */}
                                {item.badge}
                            </span>
                        )}
                    </Link>
                );
            })}
        </>
    );

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="brand-icon">
                    <Zap size={20} />
                </div>
                <div>
                    <h1 className="brand-title">TN-GridSense</h1>
                    <span className="brand-subtitle">Smart Grid Platform</span>
                </div>
            </div>

            <nav className="sidebar-nav">
                {renderNavSection('Monitoring', navItems)}
                {renderNavSection('Analytics', analyticsItems)}
                {renderNavSection('Operations', opsItems)}
                {renderNavSection('Management', mgmtItems)}
                {renderNavSection('B2B Industrial', b2bItems)}
            </nav>

            <div className="sidebar-footer">
                <div className="conn-status-box">
                    <span className="conn-indicator-wrapper">
                        {connectionStatus === 'connected' && (
                            <span className="conn-indicator-ping"></span>
                        )}
                        <span className={`conn-indicator ${connectionStatus}`}></span>
                    </span>
                    <span className="conn-text" suppressHydrationWarning>
                        {connectionStatus === 'connected' ? 'Live Connected' :
                            connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
                    </span>
                </div>
            </div>
        </aside>
    );
}

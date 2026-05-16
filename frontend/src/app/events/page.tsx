'use client';

import TopsBar from '@/components/TopBar';
import EventFeed from '@/components/EventFeed';
import { AlertTriangle, Clock } from 'lucide-react';

export default function EventsPage() {
    return (
        <>
            <TopsBar title="Fault Events" breadcrumbs={[]} />
            <div className="page-container">
                <div className="card table-panel events-panel">
                    <div className="events-header">
                        <div>
                            <h2 className="events-title">
                                <AlertTriangle size={20} className="text-red-400" /> System Fault Log
                            </h2>
                            <p className="page-header-subtitle">Real-time alerts and historical grid anomalies</p>
                        </div>
                        <div className="live-badge">
                            <Clock size={14} className="text-green-400" /> Live Stream Active
                        </div>
                    </div>
                    <div className="events-content">
                        <div className="events-max-w">
                            <EventFeed />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

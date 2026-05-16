'use client';

import dynamic from 'next/dynamic';
import TopBar from '@/components/TopBar';
import KPIGrid from '@/components/KPIGrid';
import EventFeed from '@/components/EventFeed';
import DistrictTable from '@/components/DistrictTable';

// Dynamically import Leaflet map, disable SSR
const TNMap = dynamic(() => import('@/components/TNMap'), {
  ssr: false,
  loading: () => (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f1115', color: '#64748b', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <p style={{ fontSize: '0.875rem', letterSpacing: '0.025em', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Loading Map Engine...</p>
      </div>
    </div>
  )
});

export default function StateOverview() {
  return (
    <>
      <TopBar title="State Overview" breadcrumbs={[]} />

      <div className="page-container">

        {/* Top KPIs */}
        <KPIGrid />

        {/* Map and Event Feed Row */}
        <div className="map-event-row">
          <div className="card map-card">
            <div className="panel-header">
              <h2 className="panel-title">
                Tamil Nadu — 38 District Map
              </h2>
              <div>
                <span className="panel-header-badge">All Zones</span>
              </div>
            </div>
            <div className="map-container">
              <TNMap />
            </div>
          </div>

          <div className="card event-feed-card">
            <div className="panel-header">
              <h2 className="panel-title">Live Fault Feed</h2>
              <span className="live-pulse" style={{ backgroundColor: '#ef4444' }}></span>
            </div>
            <div className="event-feed-container">
              <EventFeed />
            </div>
          </div>
        </div>

        {/* District Rankings Table Row */}
        <div className="card table-panel">
          <div className="table-header-block">
            <h2 className="panel-title">District Health Rankings</h2>
            <p className="table-subtitle">Arranged by critical priority</p>
          </div>
          <div className="table-wrapper">
            <DistrictTable />
          </div>
        </div>

      </div>
    </>
  );
}

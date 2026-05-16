'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useRouter } from 'next/navigation';
import { API_BASE } from '@/lib/api';

interface District {
    districtId: string;
    avgHealthScore: number;
    poleCount: number;
    totalLoad: number;
    feeders?: any[];
    faultCount?: number;
    riskLevel?: string;
}

// Map center of TN
const TN_CENTER: [number, number] = [10.8505, 78.4844];
const TN_ZOOM = 7;

// Approximate lat/lng for districts
const DISTRICT_COORDS: Record<string, [number, number]> = {
    'ARIYALUR': [11.1401, 79.0786],
    'CHENGALPATTU': [12.6841, 79.9836],
    'CHENNAI': [13.0827, 80.2707],
    'COIMBATORE': [11.0168, 76.9558],
    'CUDDALORE': [11.7480, 79.7714],
    'DHARMAPURI': [12.1211, 78.1582],
    'DINDIGUL': [10.3624, 77.9695],
    'ERODE': [11.3410, 77.7172],
    'KALLAKURICHI': [11.7384, 78.9639],
    'KANCHEEPURAM': [12.8185, 79.6947],
    'KANNIYAKUMARI': [8.0883, 77.5385],
    'KARUR': [10.9601, 78.0766],
    'KRISHNAGIRI': [12.5186, 78.2137],
    'MADURAI': [9.9252, 78.1198],
    'MAYILADUTHURAI': [11.1085, 79.6534],
    'NAGAPATTINAM': [10.7656, 79.8424],
    'NAMAKKAL': [11.2189, 78.1674],
    'PERAMBALUR': [11.2335, 78.8821],
    'PUDUKKOTTAI': [10.3797, 78.8208],
    'RAMANATHAPURAM': [9.3664, 78.8354],
    'RANIPET': [12.9275, 79.3330],
    'SALEM': [11.6643, 78.1460],
    'SIVAGANGA': [9.8517, 78.4770],
    'TENKASI': [8.9592, 77.3105],
    'THANJAVUR': [10.7870, 79.1378],
    'THENI': [10.0096, 77.4772],
    'TIRUPATHUR': [12.4939, 78.5668],
    'TIRUPPUR': [11.1085, 77.3411],
    'TIRUVALLUR': [13.1432, 79.9048],
    'TIRUVANNAMALAI': [12.2274, 79.0664],
    'TIRUVARUR': [10.7672, 79.6448],
    'THOOTHUKUDI': [8.8105, 78.1122],
    'TIRUCHIRAPPALLI': [10.7905, 78.7047],
    'TIRUNELVELI': [8.7139, 77.7567],
    'THE NILGIRIS': [11.4916, 76.7337],
    'VELLORE': [12.9165, 79.1325],
    'VILUPPURAM': [11.9401, 79.4861],
    'VIRUDHUNAGAR': [9.5872, 77.9515],
};

function MapResizer() {
    const map = useMap();
    useEffect(() => {
        map.invalidateSize();
    }, [map]);
    return null;
}

export default function TNMap() {
    const router = useRouter();
    const [districts, setDistricts] = useState<District[]>([]);

    useEffect(() => {
        // Fetch initial district summary to paint the map
        fetch(`${API_BASE}/api/districts`)
            .then(r => r.json())
            .then(setDistricts)
            .catch(console.error);

        // In a real app we would subscribe to a district summary topic too,
        // or aggregate from the active poles. For now we poll the summary to keep map colors fresh
        const interval = setInterval(() => {
            fetch(`${API_BASE}/api/districts`)
                .then(r => r.json())
                .then(setDistricts)
                .catch(console.error);
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    const getHealthColor = (health: number) => {
        if (health >= 80) return '#39ff14'; // Neon Green
        if (health >= 60) return '#ffaa00'; // Neon Amber
        if (health >= 35) return '#ff5e00'; // Neon Orange
        return '#ff0055'; // Neon Pink/Red
    };

    return (
        <div className="map-wrapper">
            <MapContainer
                center={TN_CENTER}
                zoom={TN_ZOOM}
                style={{ height: '100%', width: '100%', background: '#03050a' }}
                zoomControl={false}
            >
                <MapResizer />

                {/* Dark theme OpenStreetMap tiles (CartoDB Dark Matter) */}
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />

                {districts.flatMap((d) => {
                    const coords = DISTRICT_COORDS[d.districtId];
                    if (!coords) return [];

                    const markers = [];
                    const mainColor = getHealthColor(d.avgHealthScore);

                    // 1. Parent District Marker
                    markers.push(
                        <CircleMarker
                            key={`dist-${d.districtId}`}
                            center={coords}
                            radius={Math.max(12, Math.min(30, d.poleCount * 1.5))}
                            fillColor={mainColor}
                            color={mainColor}
                            weight={2}
                            opacity={0.8}
                            fillOpacity={0.3}
                            eventHandlers={{
                                click: () => router.push(`/district/${d.districtId}`)
                            }}
                        >
                            <Popup className="district-popup">
                                <div className="district-popup-header">
                                    <div className="popup-title">{d.districtId}</div>
                                    <div className="popup-subtitle">Click to view District details</div>
                                </div>
                                <div className="popup-grid">
                                    <div className="popup-label">Feeders:</div>
                                    <div className="popup-val">{d.feeders?.length || 0}</div>
                                    <div className="popup-label">Poles:</div>
                                    <div className="popup-val">{d.poleCount}</div>
                                    <div className="popup-label">Health:</div>
                                    <div className="popup-val" style={{ color: mainColor, fontWeight: 'bold' }}>{d.avgHealthScore.toFixed(0)}%</div>
                                    <div className="popup-label">Load:</div>
                                    <div className="popup-val">{d.totalLoad.toFixed(1)} kW</div>
                                </div>
                            </Popup>
                        </CircleMarker>
                    );

                    // 2. Child Feeder Markers (Towns/Areas)
                    if (d.feeders && d.feeders.length > 0) {
                        d.feeders.forEach((feeder: any, i: number) => {
                            // Deterministic positioning offset based on index and district ID length
                            const radiusOffset = 0.15 + (i * 0.05);
                            const angle = (i / d.feeders!.length) * Math.PI * 2 + (d.districtId.length * 0.1);

                            const feederCoords: [number, number] = [
                                coords[0] + radiusOffset * Math.cos(angle),
                                coords[1] + radiusOffset * Math.sin(angle)
                            ];

                            const feederColor = getHealthColor(feeder.avgHealthScore);

                            markers.push(
                                <CircleMarker
                                    key={`fdr-${feeder.feederId}`}
                                    center={feederCoords}
                                    radius={Math.max(5, Math.min(15, feeder.poleCount * 1.2))}
                                    fillColor={feederColor}
                                    color={feederColor}
                                    weight={1.5}
                                    opacity={0.9}
                                    fillOpacity={0.8}
                                >
                                    <Popup className="district-popup">
                                        <div className="district-popup-header">
                                            <div className="popup-title" style={{ fontSize: '1rem' }}>{feeder.feederId}</div>
                                            <div className="popup-subtitle">{d.districtId} Sub-Area</div>
                                        </div>
                                        <div className="popup-grid">
                                            <div className="popup-label">Poles:</div>
                                            <div className="popup-val">{feeder.poleCount}</div>
                                            <div className="popup-label">Health:</div>
                                            <div className="popup-val" style={{ color: feederColor, fontWeight: 'bold' }}>{feeder.avgHealthScore.toFixed(0)}%</div>
                                            <div className="popup-label">Load:</div>
                                            <div className="popup-val">{feeder.totalLoad.toFixed(1)} kW</div>
                                        </div>
                                    </Popup>
                                </CircleMarker>
                            );
                        });
                    }

                    return markers;
                })}
            </MapContainer>
        </div>
    );
}

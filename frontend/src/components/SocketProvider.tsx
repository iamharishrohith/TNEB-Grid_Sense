'use client';

import { useEffect, useRef } from 'react';
import { useGridStore } from '@/store/gridStore';
import { WS_URL } from '@/lib/api';

export default function SocketProvider({ children }: { children: React.ReactNode }) {
    const ws = useRef<WebSocket | null>(null);
    const { setConnectionStatus, setStats, updatePole, addAlert } = useGridStore();

    useEffect(() => {
        let retryCount = 0;
        let statsInterval: ReturnType<typeof setInterval> | null = null;

        const connect = () => {
            setConnectionStatus('connecting');
            ws.current = new WebSocket(WS_URL);

            ws.current.onopen = () => {
                setConnectionStatus('connected');
                retryCount = 0;

                // Request stats periodically to keep KPIs fresh
                statsInterval = setInterval(() => {
                    if (ws.current?.readyState === WebSocket.OPEN) {
                        ws.current.send(JSON.stringify({ type: 'getStats' }));
                    }
                }, 5000);
            };

            ws.current.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);

                    if (msg.type === 'init' || msg.type === 'stats') {
                        setStats(msg.data);
                    } else if (msg.type === 'telemetry') {
                        updatePole(msg.data.poleId, msg.data);
                    } else if (msg.type === 'alert') {
                        addAlert(msg.data);
                    }
                } catch (e) {
                    console.error("WS Parse error", e);
                }
            };

            ws.current.onclose = () => {
                setConnectionStatus('disconnected');
                if (statsInterval) { clearInterval(statsInterval); statsInterval = null; }

                // Auto-reconnect logic
                if (retryCount < 10) {
                    retryCount++;
                    const delay = Math.min(2000 * retryCount, 15000);
                    setTimeout(connect, delay);
                }
            };

            ws.current.onerror = () => {
                setConnectionStatus('disconnected');
            };
        };

        connect();

        // Clean up
        return () => {
            if (statsInterval) clearInterval(statsInterval);
            if (ws.current) {
                ws.current.close();
            }
        };
    }, [setConnectionStatus, setStats, updatePole, addAlert]);

    return <>{children}</>;
}

'use client';

import { useState, useRef, useEffect } from 'react';
import TopsBar from '@/components/TopBar';
import { Plug, TerminalSquare, FileText, X } from 'lucide-react';
import { API_BASE } from '@/lib/api';

export default function PrototypePage() {
    const [log, setLog] = useState<string[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [latestData, setLatestData] = useState<any>(null);
    const portRef = useRef<any>(null);
    const readerRef = useRef<any>(null);
    const logEndRef = useRef<HTMLDivElement>(null);
    const [isTerminalOpen, setIsTerminalOpen] = useState(false);

    // Auto-connect to previously paired devices
    useEffect(() => {
        const autoConnect = async () => {
            if ('serial' in navigator) {
                try {
                    // @ts-ignore
                    const ports = await navigator.serial.getPorts();
                    if (ports.length > 0) {
                        setLog(prev => [...prev, '[SYSTEM] Found previously paired device. Auto-connecting...']);
                        await connectToPort(ports[0]);
                    }
                } catch (err) {
                    console.error("Auto-connect failed", err);
                }
            }
        };
        autoConnect();

        if ('serial' in navigator) {
            // @ts-ignore
            navigator.serial.addEventListener('disconnect', () => {
                setIsConnected(false);
                setLog(prev => [...prev, '[SYSTEM] Device physically disconnected']);
                portRef.current = null;
                readerRef.current = null;
            });
        }
    }, []);

    const connectSerial = async () => {
        try {
            if (!('serial' in navigator)) {
                alert('Web Serial API not supported in this browser. Use Chrome or Edge.');
                return;
            }

            // @ts-ignore
            const port = await navigator.serial.requestPort();
            await connectToPort(port);
        } catch (err: any) {
            console.error('Serial Error:', err);
            setLog(prev => [...prev, `[ERROR] User cancelled or selection failed`]);
        }
    };

    const connectToPort = async (port: any) => {
        try {
            await port.open({ baudRate: 115200 });
            portRef.current = port;
            setIsConnected(true);
            setLog(prev => [...prev, '[SYSTEM] Connected to ESP32 Serial Port at 115200 baud']);

            // @ts-ignore
            const textDecoder = new TextDecoderStream();
            const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
            const reader = textDecoder.readable.getReader();
            readerRef.current = reader;

            let buffer = '';

            while (true) {
                const { value, done } = await reader.read();
                if (done) {
                    reader.releaseLock();
                    break;
                }
                if (value) {
                    buffer += value;
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        const cleanLine = line.trim();
                        if (cleanLine) {
                            handleSerialData(cleanLine);
                        }
                    }
                }
            }
        } catch (err: any) {
            console.error('Serial Error:', err);
            setLog(prev => [...prev, `[ERROR] Stream error: ${err.message}`]);
            setIsConnected(false);
        }
    };

    const handleSerialData = (line: string) => {
        setLog(prev => {
            const newLog = [...prev, `[RX] ${line}`];
            if (newLog.length > 50) newLog.shift();
            return newLog;
        });

        // ESP32 returns V:230.1 I:0.5 DC:0 T:30.0 NORMAL
        const match = line.match(/V:([\d.]+)\s+I:([\d.]+)\s+DC:([\d.]+)\s+T:([\d.]+)\s+(.+)/);

        if (match) {
            const v = parseFloat(match[1]);
            const i = parseFloat(match[2]);
            const t = parseFloat(match[4]);
            const status = match[5].trim();
            const p = (v * i) / 1000.0;

            const parsed = {
                voltage: v,
                current: i,
                temperature: t,
                power: p,
                status: status,
                relay: status === 'NORMAL'
            };
            setLatestData(parsed);

            // Forward to Backend API
            fetch(`${API_BASE}/api/telemetry`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    poleId: "PROTO-ESP32",
                    districtId: "Chennai",
                    feederId: "PROTO-FDR-1",
                    voltage: v,
                    current: i,
                    power: p,
                    temperature: t,
                    status: status,
                    healthScore: status === 'NORMAL' ? 100 : (status === 'VOLT_FAULT' ? 40 : 20),
                    relayState: status === 'NORMAL'
                })
            }).catch(e => console.error("Telemetry forward failed", e));
        }
    };

    const disconnectSerial = async () => {
        if (readerRef.current) {
            await readerRef.current.cancel();
            readerRef.current = null;
        }
        if (portRef.current) {
            await portRef.current.close();
            portRef.current = null;
        }
        setIsConnected(false);
        setLog(prev => [...prev, '[SYSTEM] Disconnected from serial port']);
    };

    // Auto-scroll log (only when open)
    useEffect(() => {
        if (isTerminalOpen && logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
        }
    }, [log, isTerminalOpen]);

    return (
        <>
            <TopsBar title="Live Hardware Prototype" breadcrumbs={[{ label: 'ESP32 Serial' }]} />
            <div className="page-container">
                <div className="page-header-row">
                    <div className="header-icon-box" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                        <TerminalSquare size={24} />
                    </div>
                    <div>
                        <h2 className="page-header-title">ESP32 Hardware Bridge</h2>
                        <p className="page-header-subtitle">Connect physical smart pole prototype via Web Serial API</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px' }}>

                    {/* Controls & Metrics */}
                    <div className="card table-panel" style={{ gridColumn: 'span 4' }}>
                        <div className="panel-header">
                            <h2 className="panel-title">Connection</h2>
                            {isConnected ?
                                <span className="status-badge normal" style={{ padding: '4px 12px' }}>● Connected</span> :
                                <span className="status-badge" style={{ backgroundColor: '#1e293b', color: '#94a3b8', padding: '4px 12px' }}>○ Offline</span>
                            }
                        </div>
                        <div style={{ padding: '24px' }}>
                            {!isConnected ? (
                                <button
                                    onClick={connectSerial}
                                    style={{ width: '100%', padding: '12px', backgroundColor: '#3b82f6', color: 'white', borderRadius: '8px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer', border: 'none' }}
                                >
                                    <Plug size={18} /> Connect Serial Port
                                </button>
                            ) : (
                                <button
                                    onClick={disconnectSerial}
                                    style={{ width: '100%', padding: '12px', backgroundColor: '#ef4444', color: 'white', borderRadius: '8px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer', border: 'none' }}
                                >
                                    Disconnect
                                </button>
                            )}

                            <p style={{ marginTop: '16px', fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.5' }}>
                                Connects directly to the ESP32 USB COM port at 115200 baud. Parsed data is automatically mapped to <strong>Pole: PROTO-ESP32</strong> in <strong>Chennai</strong>.
                            </p>
                        </div>

                        {latestData && (
                            <div style={{ padding: '0 24px 24px 24px' }}>
                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', margin: '16px 0' }}></div>
                                <h3 style={{ fontSize: '0.875rem', color: '#e2e8f0', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Live Parsed Metrics</h3>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div style={{ backgroundColor: '#0a0c0f', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>Voltage</div>
                                        <div style={{ fontSize: '1.25rem', fontFamily: 'var(--font-mono)', color: latestData.voltage > 250 || latestData.voltage < 200 ? '#f87171' : '#4ade80' }}>
                                            {latestData.voltage.toFixed(1)}V
                                        </div>
                                    </div>
                                    <div style={{ backgroundColor: '#0a0c0f', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>Current</div>
                                        <div style={{ fontSize: '1.25rem', fontFamily: 'var(--font-mono)', color: latestData.current > 15 ? '#f87171' : '#60a5fa' }}>
                                            {latestData.current.toFixed(2)}A
                                        </div>
                                    </div>
                                    <div style={{ backgroundColor: '#0a0c0f', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>Temperature</div>
                                        <div style={{ fontSize: '1.25rem', fontFamily: 'var(--font-mono)', color: latestData.temperature > 60 ? '#f87171' : '#fbbf24' }}>
                                            {latestData.temperature.toFixed(1)}°C
                                        </div>
                                    </div>
                                    <div style={{ backgroundColor: '#0a0c0f', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>Status</div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: latestData.status === 'NORMAL' ? '#4ade80' : '#f87171' }}>
                                            {latestData.status}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Stats & Tools */}
                    <div className="card table-panel" style={{ gridColumn: 'span 8', padding: '24px' }}>
                        <h2 className="panel-title" style={{ marginBottom: '16px' }}>Diagnostics</h2>
                        <div style={{ display: 'flex', gap: '16px' }}>
                            <button
                                onClick={() => setIsTerminalOpen(true)}
                                style={{ padding: '12px 24px', backgroundColor: '#1e293b', color: '#e2e8f0', borderRadius: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)' }}
                            >
                                <FileText size={18} /> View Raw Serial Log
                            </button>
                        </div>
                        <p style={{ marginTop: '16px', fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.5' }}>
                            The raw serial stream is processed in the background. If you need to debug the raw string output from the ESP32 `Serial.println()`, open the terminal view.
                        </p>
                    </div>

                </div>
            </div>

            {/* Terminal Modal overlay */}
            {isTerminalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
                    <div className="card table-panel" style={{ width: '100%', maxWidth: '900px', display: 'flex', flexDirection: 'column', maxHeight: '80vh', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <h2 className="panel-title" style={{ margin: 0 }}>Serial Output Console</h2>
                                <div className="live-pulse" style={{ backgroundColor: isConnected ? '#22c55e' : '#64748b' }}></div>
                            </div>
                            <button onClick={() => setIsTerminalOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>
                        </div>
                        <div style={{ flex: 1, backgroundColor: '#0a0c0f', padding: '16px', overflowY: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#cbd5e1', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
                            {log.length === 0 ? (
                                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', minHeight: '300px' }}>
                                    Awaiting serial connection...
                                </div>
                            ) : (
                                log.map((l, i) => (
                                    <div key={i} style={{ marginBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '4px' }}>
                                        <span style={{ color: l.includes('[RX]') ? '#60a5fa' : l.includes('[ERROR]') ? '#f87171' : '#fbbf24' }}>{l.split(' ')[0]}</span>
                                        <span style={{ marginLeft: '8px' }}>{l.substring(l.indexOf(' ') + 1)}</span>
                                    </div>
                                ))
                            )}
                            <div ref={logEndRef} />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

import { create } from 'zustand';

export interface BoxStats {
    totalPoles: number;
    activePoles: number;
    offlinePoles: number;
    totalFaults: number;
    totalOverheats: number;
    totalOverloads: number;
    totalLoad: number;
    avgHealthScore: number;
    avgVoltage: number;
    districts: number;
    feeders: number;
    lastUpdate: string;
}

export interface PoleData {
    poleId: string;
    voltage: number;
    current: number;
    temperature: number;
    power: number;
    healthScore: number;
    status: string;
    relayState: boolean;
    districtId: string;
    feederId: string;
    timestamp: string;
    lastSeen?: string;
    predictedTTF?: number;
    signal?: number;
    uptime?: number;
    powerFactor?: number;
    degradationRatio?: number;
    activePower?: number;
    reactivePower?: number;
    capacitorSteps?: boolean[];
}

export interface AlertData {
    poleId: string;
    districtId: string;
    feederId: string;
    status: string;
    voltage: number;
    current: number;
    temperature: number;
    timestamp: string;
}

interface GridState {
    stats: BoxStats | null;
    poles: Record<string, PoleData>;
    alerts: AlertData[];
    connectionStatus: 'connecting' | 'connected' | 'disconnected';

    setStats: (stats: BoxStats) => void;
    updatePole: (id: string, data: PoleData) => void;
    addAlert: (alert: AlertData) => void;
    setConnectionStatus: (status: 'connecting' | 'connected' | 'disconnected') => void;
}

export const useGridStore = create<GridState>((set) => ({
    stats: null,
    poles: {},
    alerts: [],
    connectionStatus: 'disconnected',

    setStats: (stats) => set({ stats }),

    updatePole: (id, data) =>
        set((state) => ({
            poles: {
                ...state.poles,
                [id]: data,
            },
        })),

    addAlert: (alert) =>
        set((state) => {
            // Keep last 100 alerts
            const newAlerts = [alert, ...state.alerts].slice(0, 100);
            return { alerts: newAlerts };
        }),

    setConnectionStatus: (status) => set({ connectionStatus: status }),
}));

// Centralized API configuration
// Uses env var NEXT_PUBLIC_API_URL, defaults to current host on port 3000
const getApiBase = () => {
    if (typeof window === 'undefined') return 'http://localhost:3000';
    return `http://${window.location.hostname}:3000`;
};

export const API_BASE = getApiBase();
export const WS_URL = typeof window !== 'undefined'
    ? `ws://${window.location.hostname}:3000/ws`
    : 'ws://localhost:3000/ws';

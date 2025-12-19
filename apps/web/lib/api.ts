import axios from 'axios';

// Resolve API base URL:
// 1) Respect NEXT_PUBLIC_API_URL if set
// 2) In browser, fall back to current host on port 3001 (so LAN/IP access works)
// 3) Default to localhost:3001 for dev/server contexts
const resolveApiUrl = () => {
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envUrl) return envUrl;

    if (typeof window !== 'undefined') {
        const { protocol, hostname } = window.location;
        return `${protocol}//${hostname}:3001`;
    }

    return 'http://localhost:3001';
};

export const API_URL = resolveApiUrl();

export const api = axios.create({
    baseURL: API_URL,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const setToken = (token: string) => {
    localStorage.setItem('token', token);
};

export const clearToken = () => {
    localStorage.removeItem('token');
};

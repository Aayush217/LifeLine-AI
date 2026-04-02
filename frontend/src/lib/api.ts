// Central API configuration
// In development: reads from .env.local
// In production: reads NEXT_PUBLIC_API_URL set on Vercel
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = {
    // Auth
    login: `${API_BASE}/api/auth/login`,
    register: `${API_BASE}/api/auth/register`,

    // Predictions
    predictions: `${API_BASE}/api/predictions`,

    // Requests
    requests: `${API_BASE}/api/requests`,
    activeRequests: `${API_BASE}/api/requests/active`,
    acceptRequest: (id: string) => `${API_BASE}/api/requests/${id}/accept`,
    closeRequest: (id: string) => `${API_BASE}/api/requests/${id}/close`,

    // Warnings
    warnings: `${API_BASE}/api/warnings`,

    // Leaderboard
    leaderboard: `${API_BASE}/api/leaderboard`,

    // Proactive Donations
    proactiveDonations: `${API_BASE}/api/donations/proactive`,
};

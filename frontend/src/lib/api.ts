// Central API configuration
// In development: reads from .env.local
// In production: reads NEXT_PUBLIC_API_URL set on Vercel
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = {
    // Auth
    login: `${API_BASE}/api/auth/login`,
    register: `${API_BASE}/api/auth/register`,
    forgotPassword: `${API_BASE}/api/auth/forgot-password`,
    resetPassword: `${API_BASE}/api/auth/reset-password`,
    googleAuth: `${API_BASE}/api/auth/google`,

    // System Stats
    stats: `${API_BASE}/api/stats`,

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

    // Proactive Donations & Appointments
    proactiveDonations: `${API_BASE}/api/donations/proactive`,
    completeProactiveDonation: (id: string) => `${API_BASE}/api/donations/proactive/${id}/complete`,

    // Blood Banks
    bloodbanks: `${API_BASE}/api/bloodbanks`,
    bloodbank: (id: string) => `${API_BASE}/api/bloodbanks/${id}`,
    requestBloodBank: (id: string) => `${API_BASE}/api/bloodbanks/${id}/request`,

    // Hospital Cold Chain Storage
    hospitalStorage: (hospitalId: string) => `${API_BASE}/api/hospital/storage?hospital_id=${encodeURIComponent(hospitalId)}`,
    addHospitalStorage: `${API_BASE}/api/hospital/storage`,
    deleteHospitalStorage: (batchId: string, hospitalId?: string) => 
        `${API_BASE}/api/hospital/storage/${batchId}${hospitalId ? `?hospital_id=${encodeURIComponent(hospitalId)}` : ""}`,
};

"use client";

import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    HeartPulse,
    Mail,
    Lock,
    User as UserIcon,
    Building2,
    Activity,
    MapPin,
    ArrowLeft,
    CheckCircle2,
    AlertCircle,
    ShieldCheck,
    KeyRound
} from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";

const JAIPUR_ZONES = [
    { name: "Central (City Palace)", lat: 26.9239, lng: 75.8267 },
    { name: "North (Amer)", lat: 26.9855, lng: 75.8513 },
    { name: "South (Mansarovar)", lat: 26.8549, lng: 75.7603 },
    { name: "West (Vaishali Nagar)", lat: 26.9088, lng: 75.7402 },
];

const BLOOD_TYPES = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"];

function GoogleIcon() {
    return (
        <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
            />
            <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
            />
            <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                fill="#FBBC05"
            />
            <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                fill="#EA4335"
            />
        </svg>
    );
}

export default function LoginPage() {
    const { login } = useAuth();
    const [view, setView] = useState<"login" | "register" | "forgot" | "reset">("login");
    
    // Dedicated role section: 'donor' or 'hospital'
    const [activeSection, setActiveSection] = useState<"donor" | "hospital">("donor");

    // Form states
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [bloodType, setBloodType] = useState("O+");
    const [zoneIdx, setZoneIdx] = useState(0);

    // Password reset states
    const [resetCode, setResetCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // Status & messages
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [loading, setLoading] = useState(false);

    // Handle Login
    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccessMsg("");
        setLoading(true);

        try {
            const res = await fetch(api.login, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim(), password })
            });

            const data = await res.json();
            if (res.ok) {
                // If user logged in via different tab, notify them and route safely
                if (data.user.role !== activeSection && data.user.role !== "admin") {
                    setSuccessMsg(`Welcome ${data.user.name}! Directing you to your ${data.user.role.toUpperCase()} terminal...`);
                    setTimeout(() => login(data.user), 800);
                } else {
                    login(data.user);
                }
            } else {
                setError(data.detail || "Invalid email or password.");
            }
        } catch {
            setError("Cannot connect to server. Ensure FastAPI backend is running on port 8000.");
        } finally {
            setLoading(false);
        }
    };

    // Handle Registration (Includes Welcome Email dispatch)
    const handleRegisterSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccessMsg("");
        setLoading(true);

        const selectedZone = JAIPUR_ZONES[zoneIdx];

        const payload = {
            name: name.trim(),
            email: email.trim(),
            password,
            role: activeSection,
            bloodType: activeSection === "donor" ? bloodType : "N/A",
            lat: selectedZone.lat,
            lng: selectedZone.lng
        };

        try {
            const res = await fetch(api.register, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (res.ok) {
                login(data.user);
            } else {
                setError(data.detail || "Registration failed. Please check your details.");
            }
        } catch {
            setError("Server connection failed. Is FastAPI running on port 8000?");
        } finally {
            setLoading(false);
        }
    };

    // Handle Forgot Password (Sends 6-digit code via email)
    const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;

        setError("");
        setSuccessMsg("");
        setLoading(true);

        try {
            const res = await fetch(api.forgotPassword, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim() })
            });

            const data = await res.json();
            if (res.ok) {
                setSuccessMsg(`Verification code sent to ${email.trim()}. Please check your email inbox.`);
                setView("reset");
            } else {
                setError(data.detail || "Failed to send reset code.");
            }
        } catch {
            setError("Failed to request password reset. Check backend connection.");
        } finally {
            setLoading(false);
        }
    };

    // Handle Reset Password (Verifies code & updates password)
    const handleResetPasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setError("");
        setSuccessMsg("");
        setLoading(true);

        try {
            const res = await fetch(api.resetPassword, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: email.trim(),
                    code: resetCode.trim(),
                    newPassword
                })
            });

            const data = await res.json();
            if (res.ok) {
                setSuccessMsg("Password successfully reset! You can now sign in.");
                setPassword("");
                setResetCode("");
                setNewPassword("");
                setConfirmPassword("");
                setTimeout(() => {
                    setView("login");
                }, 1500);
            } else {
                setError(data.detail || "Invalid verification code.");
            }
        } catch {
            setError("Failed to reset password.");
        } finally {
            setLoading(false);
        }
    };

    // Handle Google Login / Sign Up
    const handleGoogleAuth = async () => {
        setError("");
        setLoading(true);

        const googleEmail = prompt(
            `Enter Google Account email to authenticate as ${activeSection.toUpperCase()}:`,
            email.trim() || `user@gmail.com`
        );
        if (!googleEmail) {
            setLoading(false);
            return;
        }

        const googleName = googleEmail.split("@")[0].replace(".", " ").replace(/\b\w/g, c => c.toUpperCase());
        const selectedZone = JAIPUR_ZONES[zoneIdx];

        try {
            const res = await fetch(api.googleAuth, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: googleEmail.trim(),
                    name: googleName,
                    role: activeSection,
                    bloodType: activeSection === "donor" ? bloodType : "N/A",
                    lat: selectedZone.lat,
                    lng: selectedZone.lng
                })
            });

            const data = await res.json();
            if (res.ok) {
                login(data.user);
            } else {
                setError(data.detail || "Google authentication failed.");
            }
        } catch {
            setError("Failed to authenticate with Google.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-[85vh] items-center justify-center p-4">
            <Card className="mx-auto max-w-md w-full bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-[0_12px_40px_rgb(0,0,0,0.06)] z-10 relative overflow-hidden rounded-2xl">
                <div className={`absolute top-0 left-0 right-0 h-1.5 transition-colors ${
                    activeSection === "donor"
                        ? "bg-gradient-to-r from-rose-500 via-rose-600 to-amber-500"
                        : "bg-gradient-to-r from-indigo-500 via-indigo-600 to-emerald-500"
                }`} />

                <CardHeader className="text-center pb-3 pt-7">
                    <div className="mx-auto mb-3 flex h-13 w-13 items-center justify-center rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 shadow-xs">
                        <HeartPulse className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-2xl font-extrabold tracking-tight text-slate-900">
                        LifeLine AI
                    </CardTitle>
                    <CardDescription className="text-slate-500 mt-1 text-xs">
                        {view === "login" && (
                            activeSection === "donor"
                                ? "Access your emergency match alerts, donation leaderboard, and appointment booking."
                                : "Access dispatch radar, cold chain storage FIFO, and blood bank reserve transfers."
                        )}
                        {view === "register" && `Create a new ${activeSection === "donor" ? "Blood Donor" : "Hospital"} account.`}
                        {view === "forgot" && "Enter your email to receive a secure password reset code."}
                        {view === "reset" && "Enter the 6-digit verification code sent to your email."}
                    </CardDescription>

                    {/* DEDICATED SECTIONS FOR DONOR AND HOSPITAL LOGIN */}
                    {(view === "login" || view === "register") && (
                        <div className="mt-4 pt-1">
                            <div className="grid grid-cols-2 p-1 bg-slate-100/90 rounded-xl border border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => { setError(""); setActiveSection("donor"); }}
                                    className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                                        activeSection === "donor"
                                            ? "bg-white text-rose-700 shadow-xs border border-slate-200/80"
                                            : "text-slate-600 hover:text-slate-900"
                                    }`}
                                >
                                    <Activity className="h-3.5 w-3.5 text-rose-600" />
                                    <span>Donor Portal</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => { setError(""); setActiveSection("hospital"); }}
                                    className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                                        activeSection === "hospital"
                                            ? "bg-white text-indigo-700 shadow-xs border border-slate-200/80"
                                            : "text-slate-600 hover:text-slate-900"
                                    }`}
                                >
                                    <Building2 className="h-3.5 w-3.5 text-indigo-600" />
                                    <span>Hospital Terminal</span>
                                </button>
                            </div>
                        </div>
                    )}
                </CardHeader>

                <CardContent className="p-6 pt-2">
                    {/* Error Notice */}
                    {error && (
                        <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-200 rounded-xl flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Success Notice */}
                    {successMsg && (
                        <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200 rounded-xl flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                            <span>{successMsg}</span>
                        </div>
                    )}

                    <AnimatePresence mode="wait">
                        {/* ─── 1. SIGN IN VIEW (DONOR OR HOSPITAL) ─── */}
                        {view === "login" && (
                            <motion.div
                                key={`login-${activeSection}`}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.15 }}
                                className="space-y-4"
                            >
                                <form onSubmit={handleLoginSubmit} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
                                            <span>{activeSection === "donor" ? "Donor Email Address" : "Hospital Facility Email"}</span>
                                        </label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                            <input
                                                type="email"
                                                required
                                                placeholder={activeSection === "donor" ? "donor@example.com" : "hospital@lifeline.com"}
                                                className="w-full pl-9 p-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                                Password
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => { setError(""); setSuccessMsg(""); setView("forgot"); }}
                                                className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline"
                                            >
                                                Forgot password?
                                            </button>
                                        </div>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                            <input
                                                type="password"
                                                required
                                                placeholder="••••••••"
                                                className="w-full pl-9 p-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={loading}
                                        className={`w-full text-white font-semibold text-xs h-10 rounded-xl shadow-sm transition-all ${
                                            activeSection === "donor"
                                                ? "bg-rose-600 hover:bg-rose-700 shadow-[0_4px_14px_rgba(225,29,72,0.25)]"
                                                : "bg-indigo-600 hover:bg-indigo-700 shadow-[0_4px_14px_rgba(79,70,229,0.25)]"
                                        }`}
                                    >
                                        {loading
                                            ? "Authenticating..."
                                            : activeSection === "donor"
                                            ? "Sign In to Donor Portal"
                                            : "Sign In to Hospital Dispatch"}
                                    </Button>
                                </form>

                                {/* Divider */}
                                <div className="relative my-4">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t border-slate-200" />
                                    </div>
                                    <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
                                        <span className="bg-white px-3 text-slate-400">Or continue with</span>
                                    </div>
                                </div>

                                {/* Google Sign In Button */}
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleGoogleAuth}
                                    disabled={loading}
                                    className="w-full h-10 border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shadow-2xs"
                                >
                                    <GoogleIcon />
                                    <span>Sign in as {activeSection === "donor" ? "Donor" : "Hospital"} with Google</span>
                                </Button>

                                {/* Not registered yet? link */}
                                <div className="text-center pt-2">
                                    <p className="text-xs text-slate-500">
                                        Not registered yet?{" "}
                                        <button
                                            type="button"
                                            onClick={() => { setError(""); setSuccessMsg(""); setView("register"); }}
                                            className="font-bold text-rose-600 hover:text-rose-700 hover:underline"
                                        >
                                            Register as {activeSection === "donor" ? "Donor" : "Hospital"}
                                        </button>
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {/* ─── 2. REGISTER VIEW ─── */}
                        {view === "register" && (
                            <motion.div
                                key={`register-${activeSection}`}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.15 }}
                                className="space-y-4"
                            >
                                <form onSubmit={handleRegisterSubmit} className="space-y-3">
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                            {activeSection === "donor" ? "Full Name" : "Hospital / Medical Center Name"}
                                        </label>
                                        <div className="relative">
                                            <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                            <input
                                                type="text"
                                                required
                                                placeholder={activeSection === "donor" ? "e.g. Rahul Sharma" : "e.g. SMS Hospital Emergency Center"}
                                                className="w-full pl-9 p-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                            Email Address
                                        </label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                            <input
                                                type="email"
                                                required
                                                placeholder={activeSection === "donor" ? "donor@example.com" : "contact@hospital.org"}
                                                className="w-full pl-9 p-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                            Password
                                        </label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                            <input
                                                type="password"
                                                required
                                                placeholder="••••••••"
                                                className="w-full pl-9 p-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {/* Donor Blood Group Picker */}
                                    {activeSection === "donor" && (
                                        <div className="space-y-1">
                                            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                                Blood Group
                                            </label>
                                            <select
                                                className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium"
                                                value={bloodType}
                                                onChange={(e) => setBloodType(e.target.value)}
                                            >
                                                {BLOOD_TYPES.map(t => (
                                                    <option key={t} value={t}>Type {t}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {/* City Region */}
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                            Jaipur Region / Center
                                        </label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                            <select
                                                className="w-full pl-9 p-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium"
                                                value={zoneIdx}
                                                onChange={(e) => setZoneIdx(parseInt(e.target.value))}
                                            >
                                                {JAIPUR_ZONES.map((zone, idx) => (
                                                    <option key={idx} value={idx}>{zone.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={loading}
                                        className={`w-full text-white font-semibold text-xs h-10 rounded-xl shadow-sm transition-all mt-2 ${
                                            activeSection === "donor"
                                                ? "bg-rose-600 hover:bg-rose-700 shadow-[0_4px_14px_rgba(225,29,72,0.25)]"
                                                : "bg-indigo-600 hover:bg-indigo-700 shadow-[0_4px_14px_rgba(79,70,229,0.25)]"
                                        }`}
                                    >
                                        {loading
                                            ? "Registering..."
                                            : `Create ${activeSection === "donor" ? "Donor" : "Hospital"} Account`}
                                    </Button>
                                </form>

                                {/* Divider */}
                                <div className="relative my-3">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t border-slate-200" />
                                    </div>
                                    <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
                                        <span className="bg-white px-3 text-slate-400">Or register with</span>
                                    </div>
                                </div>

                                {/* Google Sign Up Button */}
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleGoogleAuth}
                                    disabled={loading}
                                    className="w-full h-10 border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shadow-2xs"
                                >
                                    <GoogleIcon />
                                    <span>Sign up with Google</span>
                                </Button>

                                {/* Already have an account? link */}
                                <div className="text-center pt-1">
                                    <p className="text-xs text-slate-500">
                                        Already registered?{" "}
                                        <button
                                            type="button"
                                            onClick={() => { setError(""); setSuccessMsg(""); setView("login"); }}
                                            className="font-bold text-rose-600 hover:text-rose-700 hover:underline"
                                        >
                                            Sign in to existing account
                                        </button>
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {/* ─── 3. FORGOT PASSWORD VIEW (Step 1) ─── */}
                        {view === "forgot" && (
                            <motion.div
                                key="forgot-view"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.15 }}
                                className="space-y-4"
                            >
                                <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                            Your Registered Email
                                        </label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                            <input
                                                type="email"
                                                required
                                                placeholder="you@example.com"
                                                className="w-full pl-9 p-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs h-10 rounded-xl shadow-[0_4px_14px_rgba(225,29,72,0.25)] transition-all"
                                    >
                                        {loading ? "Sending Code..." : "Send Verification Code"}
                                    </Button>

                                    <div className="text-center pt-2">
                                        <button
                                            type="button"
                                            onClick={() => { setError(""); setSuccessMsg(""); setView("login"); }}
                                            className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1 mx-auto"
                                        >
                                            <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        )}

                        {/* ─── 4. RESET PASSWORD VIEW (Step 2) ─── */}
                        {view === "reset" && (
                            <motion.div
                                key="reset-view"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.15 }}
                                className="space-y-4"
                            >
                                <form onSubmit={handleResetPasswordSubmit} className="space-y-3">
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                            6-Digit Verification Code
                                        </label>
                                        <div className="relative">
                                            <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                            <input
                                                type="text"
                                                required
                                                maxLength={6}
                                                placeholder="123456"
                                                className="w-full pl-9 p-2.5 border border-slate-200 rounded-xl text-center font-mono tracking-widest text-sm font-bold bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                                                value={resetCode}
                                                onChange={(e) => setResetCode(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                            New Password
                                        </label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                            <input
                                                type="password"
                                                required
                                                placeholder="••••••••"
                                                className="w-full pl-9 p-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                            Confirm New Password
                                        </label>
                                        <div className="relative">
                                            <ShieldCheck className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                            <input
                                                type="password"
                                                required
                                                placeholder="••••••••"
                                                className="w-full pl-9 p-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-10 rounded-xl shadow-[0_4px_14px_rgba(5,150,105,0.25)] transition-all mt-2"
                                    >
                                        {loading ? "Updating Password..." : "Update Password & Send Confirmation"}
                                    </Button>

                                    <div className="text-center pt-2">
                                        <button
                                            type="button"
                                            onClick={() => { setError(""); setSuccessMsg(""); setView("login"); }}
                                            className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1 mx-auto"
                                        >
                                            <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </CardContent>
            </Card>
        </div>
    );
}

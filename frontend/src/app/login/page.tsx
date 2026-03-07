"use client";

import { useAuth, User } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HeartPulse, User as UserIcon, Building2, ShieldCheck, ArrowRight, Activity, MapPin } from "lucide-react";
import { useState } from "react";

const JAIPUR_ZONES = [
    { name: "Central (City Palace)", lat: 26.9239, lng: 75.8267 },
    { name: "North (Amer)", lat: 26.9855, lng: 75.8513 },
    { name: "South (Mansarovar)", lat: 26.8549, lng: 75.7603 },
    { name: "West (Vaishali Nagar)", lat: 26.9088, lng: 75.7402 },
];

export default function LoginPage() {
    const { login } = useAuth();
    const [view, setView] = useState<'selection' | 'login' | 'register'>('selection');
    const [roleStr, setRoleStr] = useState<'donor' | 'hospital' | 'admin'>('donor');

    // Form States
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [bloodType, setBloodType] = useState("O+");
    const [zoneIdx, setZoneIdx] = useState(0);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (email === "admin@lifeline.com" && password === "admin") {
            // Hardcoded admin login override to bypass fetch if needed
            // though our backend has it seeded!
            console.log("Admin bypass");
        }

        setLoading(true);
        try {
            const res = await fetch("http://localhost:8000/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();
            if (res.ok) {
                login(data.user);
            } else {
                setError(data.detail || "Login failed");
            }
        } catch (err) {
            setError("Server connection failed. Is FastAPI running?");
        } finally {
            setLoading(false);
        }
    };

    const handleRegisterSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        const selectedZone = JAIPUR_ZONES[zoneIdx];

        const payload = {
            name,
            email,
            password,
            role: roleStr,
            bloodType: roleStr === 'donor' ? bloodType : 'N/A',
            lat: selectedZone.lat,
            lng: selectedZone.lng
        };

        try {
            const res = await fetch("http://localhost:8000/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (res.ok) {
                login(data.user);
            } else {
                setError(data.detail || "Registration failed");
            }
        } catch (err) {
            setError("Server connection failed. Is FastAPI running?");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-[80vh] items-center justify-center p-4">
            <Card className="mx-auto max-w-md w-full bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.2)] z-10 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500/80 via-purple-500/80 to-emerald-500/80" />
                <CardHeader className="text-center pb-4 pt-8">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800/80 border border-slate-700/50 text-red-500 shadow-inner">
                        <HeartPulse className="h-8 w-8 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight text-white">LifeLine AI Portal</CardTitle>
                    <CardDescription className="text-slate-400 mt-1">
                        {view === 'selection' && "Select your access to enter the Jaipur network."}
                        {view === 'login' && "Sign in to your account."}
                        {view === 'register' && `Create a new ${roleStr === 'donor' ? 'Donor' : 'Hospital'} account.`}
                    </CardDescription>
                </CardHeader>
                <CardContent>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm border border-red-200 rounded-md">
                            {error}
                        </div>
                    )}

                    {view === 'selection' && (
                        <div className="grid gap-4">
                            <Button
                                variant="outline"
                                className="flex h-16 items-center justify-between px-6 bg-slate-800/40 hover:bg-slate-800 hover:border-slate-600 border border-slate-700/50 shadow-sm transition-all text-white group"
                                onClick={() => setView('login')}
                            >
                                <div className="flex items-center gap-4 text-left">
                                    <UserIcon className="h-6 w-6 text-slate-400 group-hover:text-white transition-colors" />
                                    <div>
                                        <div className="font-semibold tracking-wide">Sign In</div>
                                        <div className="text-xs text-slate-500 font-medium">I already have an account</div>
                                    </div>
                                </div>
                                <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-white transition-colors" />
                            </Button>

                            <div className="relative py-2">
                                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-800/80" /></div>
                                <div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-900/60 backdrop-blur-md px-3 text-slate-500 font-semibold tracking-widest rounded-full">Or Join Network</span></div>
                            </div>

                            <Button
                                variant="outline"
                                className="flex h-16 items-center justify-start gap-4 px-6 text-left bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/40 shadow-sm transition-all group"
                                onClick={() => { setRoleStr('donor'); setView('register'); }}
                            >
                                <Activity className="h-6 w-6 text-emerald-500 group-hover:drop-shadow-[0_0_8px_rgba(52,211,153,0.5)] transition-all" />
                                <div>
                                    <div className="font-semibold text-emerald-50 tracking-wide">Register as Donor</div>
                                    <div className="text-xs text-emerald-500/70 font-medium">Save lives in your city</div>
                                </div>
                            </Button>

                            <Button
                                variant="outline"
                                className="flex h-16 items-center justify-start gap-4 px-6 text-left bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/20 hover:border-blue-500/40 shadow-sm transition-all group"
                                onClick={() => { setRoleStr('hospital'); setView('register'); }}
                            >
                                <Building2 className="h-6 w-6 text-blue-500 group-hover:drop-shadow-[0_0_8px_rgba(59,130,246,0.5)] transition-all" />
                                <div>
                                    <div className="font-semibold text-blue-50 tracking-wide">Register as Hospital</div>
                                    <div className="text-xs text-blue-500/70 font-medium">Manage inventory & requests</div>
                                </div>
                            </Button>
                        </div>
                    )}

                    {view === 'login' && (
                        <form onSubmit={handleLoginSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Email Address</label>
                                <input
                                    type="email" required
                                    className="w-full p-2.5 border border-slate-700/50 rounded-md text-sm bg-slate-800/50 text-white focus:outline-none focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 transition-all placeholder:text-slate-500"
                                    placeholder="e.g. rahul@example.com (or admin@lifeline.com)"
                                    value={email} onChange={e => setEmail(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Password</label>
                                <input
                                    type="password" required
                                    className="w-full p-2.5 border border-slate-700/50 rounded-md text-sm bg-slate-800/50 text-white focus:outline-none focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 transition-all placeholder:text-slate-500"
                                    placeholder="Enter password"
                                    value={password} onChange={e => setPassword(e.target.value)}
                                />
                            </div>
                            <Button type="submit" className="w-full bg-red-600 hover:bg-red-500 text-white font-semibold transition-all mt-6 shadow-[0_0_20px_rgba(220,38,38,0.2)] tracking-wide" disabled={loading}>
                                {loading ? "Connecting..." : "Sign In"}
                            </Button>
                            <Button type="button" variant="ghost" className="w-full mt-2 text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors" onClick={() => setView('selection')}>
                                Back
                            </Button>
                        </form>
                    )}

                    {view === 'register' && (
                        <form onSubmit={handleRegisterSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Full Name {roleStr === 'hospital' && "(Hospital Name)"}</label>
                                <input
                                    type="text" required
                                    className="w-full p-2.5 border border-slate-200 rounded-md text-sm"
                                    placeholder="John Doe"
                                    value={name} onChange={e => setName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Email Address</label>
                                <input
                                    type="email" required
                                    className="w-full p-2.5 border border-slate-700/50 rounded-md text-sm bg-slate-800/50 text-white focus:outline-none focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 transition-all placeholder:text-slate-500"
                                    placeholder="john@example.com"
                                    value={email} onChange={e => setEmail(e.target.value)}
                                />
                            </div>

                            {roleStr === 'donor' && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">Blood Type</label>
                                    <select
                                        className="w-full p-2.5 border border-slate-700/50 rounded-md text-sm bg-slate-800/50 text-white focus:outline-none focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 transition-all"
                                        value={bloodType} onChange={e => setBloodType(e.target.value)}
                                    >
                                        <option className="bg-slate-900 text-white" value="O-">O Negative</option>
                                        <option className="bg-slate-900 text-white" value="O+">O Positive</option>
                                        <option className="bg-slate-900 text-white" value="A-">A Negative</option>
                                        <option className="bg-slate-900 text-white" value="A+">A Positive</option>
                                        <option className="bg-slate-900 text-white" value="B-">B Negative</option>
                                        <option className="bg-slate-900 text-white" value="B+">B Positive</option>
                                        <option className="bg-slate-900 text-white" value="AB-">AB Negative</option>
                                        <option className="bg-slate-900 text-white" value="AB+">AB Positive</option>
                                    </select>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2 text-slate-300"><MapPin className="h-4 w-4 text-red-500" /> Jaipur Location Zone</label>
                                <select
                                    className="w-full p-2.5 border border-slate-700/50 rounded-md text-sm bg-slate-800/50 text-white focus:outline-none focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 transition-all"
                                    value={zoneIdx} onChange={e => setZoneIdx(Number(e.target.value))}
                                >
                                    {JAIPUR_ZONES.map((zone, idx) => (
                                        <option className="bg-slate-900 text-white" key={idx} value={idx}>{zone.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Create Password</label>
                                <input
                                    type="password" required minLength={6}
                                    className="w-full p-2.5 border border-slate-200 rounded-md text-sm"
                                    placeholder="At least 6 characters"
                                    value={password} onChange={e => setPassword(e.target.value)}
                                />
                            </div>

                            <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={loading}>
                                {loading ? "Creating Account..." : "Create Account"}
                            </Button>
                            <Button type="button" variant="ghost" className="w-full mt-2" onClick={() => setView('selection')}>
                                Cancel
                            </Button>
                        </form>
                    )}

                </CardContent>
            </Card>
        </div>
    );
}

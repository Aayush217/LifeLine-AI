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
            <Card className="mx-auto max-w-md w-full shadow-lg border-slate-200">
                <CardHeader className="text-center pb-4">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
                        <HeartPulse className="h-8 w-8" />
                    </div>
                    <CardTitle className="text-2xl">LifeLine AI Portal</CardTitle>
                    <CardDescription>
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
                                className="flex h-16 items-center justify-between px-6 hover:bg-red-50 hover:text-red-900 hover:border-red-200 border-slate-200"
                                onClick={() => setView('login')}
                            >
                                <div className="flex items-center gap-4 text-left">
                                    <UserIcon className="h-6 w-6 text-slate-400" />
                                    <div>
                                        <div className="font-semibold">Sign In</div>
                                        <div className="text-xs text-slate-500 font-normal">I already have an account</div>
                                    </div>
                                </div>
                                <ArrowRight className="h-4 w-4 text-slate-400" />
                            </Button>

                            <div className="relative py-2">
                                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200" /></div>
                                <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-500">Or Join Network</span></div>
                            </div>

                            <Button
                                variant="outline"
                                className="flex h-16 items-center justify-start gap-4 px-6 text-left hover:bg-emerald-50 hover:text-emerald-900 hover:border-emerald-200 border-slate-200"
                                onClick={() => { setRoleStr('donor'); setView('register'); }}
                            >
                                <Activity className="h-6 w-6 text-emerald-600" />
                                <div>
                                    <div className="font-semibold">Register as Donor</div>
                                    <div className="text-xs text-slate-500 font-normal">Save lives in your city</div>
                                </div>
                            </Button>

                            <Button
                                variant="outline"
                                className="flex h-16 items-center justify-start gap-4 px-6 text-left hover:bg-blue-50 hover:text-blue-900 hover:border-blue-200 border-slate-200"
                                onClick={() => { setRoleStr('hospital'); setView('register'); }}
                            >
                                <Building2 className="h-6 w-6 text-blue-600" />
                                <div>
                                    <div className="font-semibold">Register as Hospital</div>
                                    <div className="text-xs text-slate-500 font-normal">Manage inventory & requests</div>
                                </div>
                            </Button>
                        </div>
                    )}

                    {view === 'login' && (
                        <form onSubmit={handleLoginSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Email Address</label>
                                <input
                                    type="email" required
                                    className="w-full p-2.5 border border-slate-200 rounded-md text-sm"
                                    placeholder="e.g. rahul@example.com (or admin@lifeline.com)"
                                    value={email} onChange={e => setEmail(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Password</label>
                                <input
                                    type="password" required
                                    className="w-full p-2.5 border border-slate-200 rounded-md text-sm"
                                    placeholder="Enter password"
                                    value={password} onChange={e => setPassword(e.target.value)}
                                />
                            </div>
                            <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={loading}>
                                {loading ? "Connecting..." : "Sign In"}
                            </Button>
                            <Button type="button" variant="ghost" className="w-full mt-2" onClick={() => setView('selection')}>
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
                                <label className="text-sm font-medium">Email Address</label>
                                <input
                                    type="email" required
                                    className="w-full p-2.5 border border-slate-200 rounded-md text-sm"
                                    placeholder="john@example.com"
                                    value={email} onChange={e => setEmail(e.target.value)}
                                />
                            </div>

                            {roleStr === 'donor' && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Blood Type</label>
                                    <select
                                        className="w-full p-2.5 border border-slate-200 rounded-md text-sm bg-white"
                                        value={bloodType} onChange={e => setBloodType(e.target.value)}
                                    >
                                        <option value="O-">O Negative</option>
                                        <option value="O+">O Positive</option>
                                        <option value="A-">A Negative</option>
                                        <option value="A+">A Positive</option>
                                        <option value="B-">B Negative</option>
                                        <option value="B+">B Positive</option>
                                        <option value="AB-">AB Negative</option>
                                        <option value="AB+">AB Positive</option>
                                    </select>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-500" /> Jaipur Location Zone</label>
                                <select
                                    className="w-full p-2.5 border border-slate-200 rounded-md text-sm bg-white"
                                    value={zoneIdx} onChange={e => setZoneIdx(Number(e.target.value))}
                                >
                                    {JAIPUR_ZONES.map((zone, idx) => (
                                        <option key={idx} value={idx}>{zone.name}</option>
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

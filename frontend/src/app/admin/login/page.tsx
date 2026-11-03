"use client";

import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Lock, Mail, AlertCircle } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import { motion } from "framer-motion";

export default function AdminLoginPage() {
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleAdminLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetch(api.login, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim(), password })
            });

            const data = await res.json();
            if (res.ok) {
                // Verify that user possesses admin role
                if (data.user.role !== "admin") {
                    setError("Access Denied: This terminal is strictly restricted to System Administrators. Donor & Hospital accounts must use the primary portal.");
                    return;
                }
                login(data.user);
            } else {
                setError(data.detail || "Authentication failed. Invalid admin credentials.");
            }
        } catch {
            setError("Cannot reach authentication server. Verify FastAPI backend is running on port 8000.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-[85vh] items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-md"
            >
                <Card className="w-full bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-[0_12px_40px_rgb(0,0,0,0.06)] rounded-2xl overflow-hidden relative">
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-rose-600 to-indigo-600" />

                    <CardHeader className="text-center pt-8 pb-3">
                        <div className="mx-auto mb-3 flex h-13 w-13 items-center justify-center rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 shadow-xs">
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase bg-rose-100/70 text-rose-700 border border-rose-200 mx-auto mb-1.5">
                            Root Access Only
                        </div>
                        <CardTitle className="text-2xl font-extrabold tracking-tight text-slate-900">
                            Command Terminal
                        </CardTitle>
                        <CardDescription className="text-slate-500 text-xs mt-1">
                            LifeLine AI System Administration & Logistics Controller
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="p-6 pt-2">
                        {error && (
                            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleAdminLogin} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                    Administrator Email
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                    <input
                                        type="email"
                                        required
                                        placeholder="admin@lifeline.com"
                                        className="w-full pl-9 p-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                    Master Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                    <input
                                        type="password"
                                        required
                                        placeholder="••••••••"
                                        className="w-full pl-9 p-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs h-10 rounded-xl shadow-[0_4px_14px_rgba(225,29,72,0.25)] transition-all mt-2"
                            >
                                {loading ? "Authenticating Root..." : "Authenticate Command Terminal"}
                            </Button>
                        </form>

                        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">
                                Security Protocol: ISO-27001 / Session Audited
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}

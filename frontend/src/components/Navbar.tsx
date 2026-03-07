"use client";

import { useAuth } from "@/context/AuthContext";
import { HeartPulse, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export function Navbar() {
    const { role, logout } = useAuth();
    const pathname = usePathname();

    if (!role || pathname === '/login') return null;

    return (
        <motion.header
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="sticky top-4 z-50 mx-auto w-[calc(100%-2rem)] max-w-6xl rounded-full border border-slate-800/60 bg-slate-900/60 backdrop-blur-xl shadow-2xl mb-8"
        >
            <div className="flex h-14 items-center justify-between px-6">
                <div className="flex items-center gap-2 font-bold text-lg tracking-tight text-white drop-shadow-sm">
                    <HeartPulse className="h-5 w-5 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                    <span>LifeLine <span className="text-emerald-400/90 font-light">AI</span></span>
                </div>

                <nav className="hidden md:flex gap-8 text-sm font-medium">
                    {role === "admin" && (
                        <Link href="/admin" className="text-slate-300 transition-all hover:text-white hover:drop-shadow-[0_0_5px_rgba(255,255,255,0.4)]">Live Radar Matrix</Link>
                    )}
                    {role === "donor" && (
                        <Link href="/donor" className="text-slate-300 transition-all hover:text-white">Active Grid</Link>
                    )}
                    {role === "hospital" && (
                        <Link href="/hospital" className="text-slate-300 transition-all hover:text-emerald-400">Emergency Dispatch</Link>
                    )}
                </nav>

                <div className="flex items-center gap-4 shrink-0">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-full border border-emerald-400/20 shadow-[0_0_10px_rgba(52,211,153,0.1)]">
                        {role}
                    </span>
                    <Button variant="ghost" size="icon" onClick={logout} className="h-8 w-8 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                        <LogOut className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </motion.header>
    );
}

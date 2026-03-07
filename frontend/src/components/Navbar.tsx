"use client";

import { useAuth } from "@/context/AuthContext";
import { HeartPulse, LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

export function Navbar() {
    const { role, logout } = useAuth();
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);

    if (!role || pathname === '/login') return null;

    const navLink = role === "admin"
        ? { href: "/admin", label: "Live Radar Matrix" }
        : role === "donor"
            ? { href: "/donor", label: "Active Grid" }
            : { href: "/hospital", label: "Emergency Dispatch" };

    return (
        <div className="sticky top-4 z-50 mx-auto w-[calc(100%-2rem)] max-w-6xl mb-8">
            <motion.header
                initial={{ y: -40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="rounded-2xl border border-slate-800/60 bg-slate-900/80 backdrop-blur-xl shadow-2xl"
            >
                <div className="flex h-14 items-center justify-between px-4 sm:px-6">
                    {/* Logo */}
                    <div className="flex items-center gap-2 font-bold text-base tracking-tight text-white">
                        <HeartPulse className="h-5 w-5 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                        <span>LifeLine <span className="text-emerald-400/90 font-light">AI</span></span>
                    </div>

                    {/* Desktop nav */}
                    <nav className="hidden md:flex gap-8 text-sm font-medium">
                        <Link
                            href={navLink.href}
                            className="text-slate-300 transition-all hover:text-white hover:drop-shadow-[0_0_5px_rgba(255,255,255,0.4)]"
                        >
                            {navLink.label}
                        </Link>
                    </nav>

                    {/* Desktop right */}
                    <div className="hidden md:flex items-center gap-3 shrink-0">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-full border border-emerald-400/20">
                            {role}
                        </span>
                        <Button variant="ghost" size="icon" onClick={logout} className="h-8 w-8 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                            <LogOut className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Mobile: role badge + hamburger */}
                    <div className="flex md:hidden items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full border border-emerald-400/20">
                            {role}
                        </span>
                        <Button
                            variant="ghost" size="icon"
                            onClick={() => setMenuOpen(!menuOpen)}
                            className="h-8 w-8 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>

                {/* Mobile dropdown menu */}
                <AnimatePresence>
                    {menuOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="md:hidden border-t border-slate-800/60 overflow-hidden"
                        >
                            <div className="flex flex-col px-4 py-3 gap-3">
                                <Link
                                    href={navLink.href}
                                    onClick={() => setMenuOpen(false)}
                                    className="text-sm font-medium text-slate-300 hover:text-white transition-colors py-1"
                                >
                                    {navLink.label}
                                </Link>
                                <button
                                    onClick={() => { logout(); setMenuOpen(false); }}
                                    className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors py-1 w-fit"
                                >
                                    <LogOut className="h-4 w-4" /> Sign Out
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.header>
        </div>
    );
}

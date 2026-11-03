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

    if (!role || pathname === '/login' || pathname === '/admin/login') return null;

    const navLink = role === "admin"
        ? { href: "/admin", label: "Command Center" }
        : role === "donor"
            ? { href: "/donor", label: "Donor Grid" }
            : { href: "/hospital", label: "Hospital Dispatch" };

    return (
        <div className="sticky top-4 z-50 mx-auto w-[calc(100%-2rem)] max-w-6xl mb-6">
            <motion.header
                initial={{ y: -30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
                className="rounded-2xl border border-slate-200/90 bg-white/85 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
            >
                <div className="flex h-14 items-center justify-between px-5 sm:px-6">
                    {/* Brand */}
                    <Link href={navLink.href} className="flex items-center gap-2.5 font-bold text-base tracking-tight text-slate-900 group">
                        <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-rose-600 to-rose-500 flex items-center justify-center shadow-[0_4px_12px_rgba(244,63,94,0.3)] transition-transform group-hover:scale-105">
                            <HeartPulse className="h-4 w-4 text-white" />
                        </div>
                        <span>LifeLine <span className="text-rose-600 font-semibold">AI</span></span>
                    </Link>

                    {/* Desktop nav */}
                    <nav className="hidden md:flex gap-8 text-sm font-semibold">
                        <Link
                            href={navLink.href}
                            className="text-slate-600 transition-colors hover:text-slate-950 flex items-center gap-2"
                        >
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                            {navLink.label}
                        </Link>
                    </nav>

                    {/* Desktop right */}
                    <div className="hidden md:flex items-center gap-3 shrink-0">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-200/70">
                            {role}
                        </span>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={logout} 
                            className="h-8 w-8 rounded-full text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Sign out"
                        >
                            <LogOut className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Mobile: role badge + hamburger */}
                    <div className="flex md:hidden items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200/70">
                            {role}
                        </span>
                        <Button
                            variant="ghost" size="icon"
                            onClick={() => setMenuOpen(!menuOpen)}
                            className="h-8 w-8 rounded-full text-slate-600 hover:text-slate-950 hover:bg-slate-100 transition-colors"
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
                            className="md:hidden border-t border-slate-100 overflow-hidden bg-white/95"
                        >
                            <div className="flex flex-col px-5 py-3.5 gap-2.5">
                                <Link
                                    href={navLink.href}
                                    onClick={() => setMenuOpen(false)}
                                    className="text-sm font-semibold text-slate-700 hover:text-rose-600 transition-colors py-1 flex items-center gap-2"
                                >
                                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                    {navLink.label}
                                </Link>
                                <Button
                                    variant="outline"
                                    onClick={() => { setMenuOpen(false); logout(); }}
                                    className="w-full text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50 justify-start gap-2"
                                >
                                    <LogOut className="h-3.5 w-3.5" /> Sign Out
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.header>
        </div>
    );
}

"use client";

import { useAuth } from "@/context/AuthContext";
import { HeartPulse, LogOut } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Navbar() {
    const { role, logout } = useAuth();

    if (!role) return null; // Don't show generic navbar on login page

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
            <div className="container mx-auto flex h-16 items-center align-center justify-between px-4 max-w-7xl">
                <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-red-600">
                    <HeartPulse className="h-6 w-6" />
                    <span>LifeLine AI</span>
                </div>

                <nav className="flex gap-6 text-sm font-medium">
                    {role === "admin" && (
                        <>
                            <Link href="/" className="text-foreground transition-colors hover:text-red-600">Global Dashboard</Link>
                            <Link href="#" className="text-foreground/60 transition-colors hover:text-red-600">Analytics</Link>
                        </>
                    )}
                    {role === "donor" && (
                        <>
                            <Link href="/donor" className="text-foreground transition-colors hover:text-red-600">My Dashboard</Link>
                            <Link href="#" className="text-foreground/60 transition-colors hover:text-red-600">Leaderboard</Link>
                            <Link href="#" className="text-foreground/60 transition-colors hover:text-red-600">Rewards</Link>
                        </>
                    )}
                    {role === "hospital" && (
                        <>
                            <Link href="/hospital" className="text-foreground transition-colors hover:text-red-600">Hospital Portal</Link>
                            <Link href="#" className="text-foreground/60 transition-colors hover:text-red-600">Inventory Management</Link>
                        </>
                    )}
                </nav>

                <div className="flex items-center space-x-4 shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-500 capitalize">{role}</span>
                        <Button variant="ghost" size="icon" onClick={logout} className="text-slate-500 hover:text-red-600">
                            <LogOut className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </header>
    );
}

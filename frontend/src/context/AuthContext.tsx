"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export type Role = "donor" | "hospital" | "admin" | "guest" | null;

export interface User {
    id: string;
    name: string;
    email: string;
    role: Role;
    bloodType: string;
    location: { lat: number; lng: number };
    points?: number;
    livesSaved?: number;
    badges?: string[];
}

interface AuthContextType {
    user: User | null;
    role: Role; // For backward compatibility
    login: (user: User) => void;
    logout: () => void;
    updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // Hydrate from localStorage
        const savedUserStr = localStorage.getItem("lifeline_user");
        if (savedUserStr) {
            try {
                const savedUser = JSON.parse(savedUserStr);
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setUser(savedUser);
            } catch {
                console.error("Failed to parse user from localstorage");
                localStorage.removeItem("lifeline_user");
                if (pathname !== "/login") router.push("/login");
            }
        } else if (pathname !== "/login") {
            router.push("/login");
        }
    }, [pathname, router]);

    const login = (newUser: User) => {
        setUser(newUser);
        localStorage.setItem("lifeline_user", JSON.stringify(newUser));
        if (newUser.role === "admin") router.push("/admin"); // Changed from '/'
        else if (newUser.role === "donor") router.push("/donor");
        else if (newUser.role === "hospital") router.push("/hospital");
        else router.push("/");
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem("lifeline_user");
        router.push("/login");
    };

    const updateUser = (data: Partial<User>) => {
        if (!user) return;
        const updated = { ...user, ...data };
        setUser(updated);
        localStorage.setItem("lifeline_user", JSON.stringify(updated));
    }

    return (
        <AuthContext.Provider value={{ user, role: user?.role || null, login, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}

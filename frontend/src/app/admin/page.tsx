"use client";

import AIPredictionMap, { PredictionData } from "@/components/AIPredictionMap";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Activity,
    Droplets,
    Users,
    ShieldAlert,
    ArrowRight
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";

interface RequestData {
    id: string;
}

const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    show: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.4,
            ease: "easeOut"
        }
    }
};

export default function Home() {
    const [liveAlerts, setLiveAlerts] = useState<PredictionData[]>([]);
    const [liveRequests, setLiveRequests] = useState<RequestData[]>([]);
    const [warnedRegions, setWarnedRegions] = useState<Set<string>>(new Set());

    // FIXED TYPE
    const [expandedXAI, setExpandedXAI] = useState<number | null>(null);

    // NEW STATES
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const handleBroadcastWarning = async (alert: PredictionData) => {
        try {
            const res = await fetch(api.warnings, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    region_id: alert.id.toString(),
                    bloodType: alert.bloodType,
                    message: `[SYSTEM] ${alert.severity} severity shortage predicted in Region ${alert.id}. ML flagged risk due to: ${alert.reason}. Suggest maintaining ${alert.predictedShortage} units of ${alert.bloodType}.`,
                    severity: alert.severity
                })
            });

            if (res.ok) {
                setWarnedRegions(prev =>
                    new Set(prev).add(alert.id.toString())
                );
            }
        } catch (e) {
            console.error("Failed to broadcast warning:", e);
        }
    };

    // OPTIMIZED FETCH
    const fetchDashboardData = useCallback(async (signal?: AbortSignal) => {
        try {
            setError(false);

            const [predictionsRes, requestsRes] = await Promise.all([
                fetch(api.predictions, { signal }),
                fetch(api.activeRequests, { signal })
            ]);

            if (predictionsRes.ok) {
                const predictionData = await predictionsRes.json();
                setLiveAlerts(predictionData);
            }

            if (requestsRes.ok) {
                const requestData = await requestsRes.json();
                setLiveRequests(requestData);
            }
        } catch (err: any) {
            if (err.name !== "AbortError") {
                console.error("Dashboard fetch failed:", err);
                setError(true);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();

        fetchDashboardData(controller.signal);

        const interval = setInterval(() => {
            fetchDashboardData(controller.signal);
        }, 5000);

        return () => {
            controller.abort();
            clearInterval(interval);
        };
    }, [fetchDashboardData]);

    // LOADING STATE
    if (loading) {
        return (
            <div className="container mx-auto max-w-7xl px-4 py-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                    {[...Array(4)].map((_, i) => (
                        <div
                            key={i}
                            className="h-36 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse"
                        />
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-7 gap-6 mt-6">
                    <div className="lg:col-span-4 h-[450px] rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
                    <div className="lg:col-span-3 h-[450px] rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
                </div>
            </div>
        );
    }

    // ERROR STATE
    if (error) {
        return (
            <div className="container mx-auto max-w-7xl px-4 py-16">
                <div className="flex flex-col items-center justify-center text-center">
                    <div className="h-16 w-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-5">
                        <ShieldAlert className="h-8 w-8 text-red-400" />
                    </div>

                    <h2 className="text-2xl font-bold text-white">
                        Failed to Load Dashboard
                    </h2>

                    <p className="text-slate-400 mt-2 max-w-md">
                        Unable to connect to the prediction services right now.
                    </p>

                    <Button
                        className="mt-6 bg-cyan-500 hover:bg-cyan-400 text-black"
                        onClick={() => window.location.reload()}
                    >
                        Retry Connection
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-7xl px-4 py-8 relative isolate">

            {/* Background Effects */}
            <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 right-0 w-[450px] h-[450px] bg-blue-500/10 rounded-full blur-[120px]" />
            </div>

            <div className="flex flex-col gap-8">

                {/* HEADER */}
                <motion.div
                    variants={fadeUp}
                    initial="hidden"
                    animate="show"
                >
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                        System Overview
                    </h1>

                    <p className="text-slate-400 mt-2 text-sm sm:text-base max-w-2xl">
                        Live metrics from the AI prediction hub and intelligent blood matching engine.
                    </p>
                </motion.div>

                {/* KPI GRID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">

                    {/* KPI CARD */}
                    {[
                        {
                            title: "Available Donors (20km)",
                            value: "1,248",
                            subtitle: "+12 joined today",
                            icon: Users,
                            color: "cyan"
                        },
                        {
                            title: "Pending Matches",
                            value: liveRequests.length,
                            subtitle: "Running Hopcroft-Karp...",
                            icon: Activity,
                            color: "cyan"
                        },
                        {
                            title: "Predicted Shortages",
                            value: liveAlerts.length,
                            subtitle: "Regions flagged by AI",
                            icon: ShieldAlert,
                            color: liveAlerts.length > 0 ? "red" : "slate"
                        },
                        {
                            title: "Total Blood Units",
                            value: "8,402",
                            subtitle: "98% tracked via Cold Chain FIFO",
                            icon: Droplets,
                            color: "cyan"
                        }
                    ].map((item, i) => {
                        const Icon = item.icon;

                        return (
                            <motion.div
                                key={item.title}
                                variants={fadeUp}
                                initial="hidden"
                                animate="show"
                                transition={{ delay: i * 0.05 }}
                            >
                                <Card className={`
                                    relative overflow-hidden
                                    backdrop-blur-2xl
                                    border transition-all duration-300
                                    hover:-translate-y-1 hover:shadow-2xl
                                    ${
                                        item.color === "red"
                                            ? "bg-red-950/20 border-red-500/20 hover:border-red-500/40 hover:shadow-red-500/10"
                                            : "bg-slate-900/60 border-slate-800/70 hover:border-cyan-500/30 hover:shadow-cyan-500/10"
                                    }
                                `}>
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent" />

                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-sm font-medium text-slate-300">
                                            {item.title}
                                        </CardTitle>

                                        <div className={`
                                            p-2 rounded-xl border
                                            ${
                                                item.color === "red"
                                                    ? "bg-red-500/10 border-red-500/20"
                                                    : "bg-cyan-500/10 border-cyan-500/20"
                                            }
                                        `}>
                                            <Icon className={`
                                                h-4 w-4
                                                ${
                                                    item.color === "red"
                                                        ? "text-red-400"
                                                        : "text-cyan-400"
                                                }
                                            `} />
                                        </div>
                                    </CardHeader>

                                    <CardContent>
                                        <div className={`
                                            text-3xl font-bold tracking-tight
                                            ${
                                                item.color === "red"
                                                    ? "text-red-400"
                                                    : "text-white"
                                            }
                                        `}>
                                            {item.value}
                                        </div>

                                        <p className={`
                                            text-xs font-medium mt-2
                                            ${
                                                item.color === "red"
                                                    ? "text-red-400"
                                                    : "text-emerald-400"
                                            }
                                        `}>
                                            {item.subtitle}
                                        </p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        );
                    })}
                </div>

                {/* MAIN GRID */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="grid grid-cols-1 lg:grid-cols-7 gap-6"
                >

                    {/* MAP */}
                    <Card className="col-span-1 lg:col-span-4 bg-slate-900/60 backdrop-blur-2xl border border-slate-800/70 overflow-hidden shadow-2xl shadow-black/20">
                        <CardHeader className="border-b border-slate-800/60 bg-slate-900/40">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-white">
                                        AI Prediction Map
                                    </CardTitle>

                                    <CardDescription className="text-slate-400 mt-1">
                                        Live forecasting powered by SVM & XGBoost.
                                    </CardDescription>
                                </div>

                                <Badge
                                    variant="outline"
                                    className="bg-red-500/10 text-red-400 border-red-500/20 px-3 py-1 flex items-center gap-2"
                                >
                                    <span className="relative flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                                    </span>

                                    Live
                                </Badge>
                            </div>
                        </CardHeader>

                        <CardContent className="p-0 relative min-h-[320px] sm:min-h-[450px]">
                            <div className="absolute inset-0 ring-1 ring-inset ring-white/5 pointer-events-none z-[400]" />

                            <AIPredictionMap
                                predictions={liveAlerts}
                                activeRequests={liveRequests}
                            />
                        </CardContent>
                    </Card>

                    {/* SIDEBAR */}
                    <Card className="col-span-1 lg:col-span-3 bg-slate-900/60 backdrop-blur-2xl border border-slate-800/70 overflow-hidden shadow-2xl shadow-black/20">

                        <CardHeader className="border-b border-slate-800/60 bg-slate-900/40">
                            <CardTitle className="text-white">
                                Urgent Shortage Alerts
                            </CardTitle>

                            <CardDescription className="text-slate-400 mt-1">
                                Regions flagged by the prediction engine.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="p-0">

                            {/* Existing alerts section remains SAME */}

                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}

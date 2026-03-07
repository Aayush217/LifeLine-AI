"use client";

import AIPredictionMap, { PredictionData } from "@/components/AIPredictionMap";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, Droplets, Users, ShieldAlert, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";

export default function Home() {
    const [liveAlerts, setLiveAlerts] = useState<PredictionData[]>([]);
    const [liveRequests, setLiveRequests] = useState<any[]>([]);
    const [warnedRegions, setWarnedRegions] = useState<Set<string>>(new Set());
    const [expandedXAI, setExpandedXAI] = useState<string | null>(null);

    const handleBroadcastWarning = async (alert: PredictionData) => {
        try {
            const res = await fetch(api.warnings, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    region_id: alert.id.toString(),
                    bloodType: alert.bloodType,
                    message: `[SYSTEM] ${alert.severity} severity shortage predicted in Region ${alert.id}. ML flagged risk due to: ${alert.reason}. Suggest maintaining ${alert.predictedShortage} units of ${alert.bloodType}.`,
                    severity: alert.severity
                })
            });
            if (res.ok) {
                setWarnedRegions(prev => new Set(prev).add(alert.id.toString()));
            }
        } catch (e) {
            console.error("Failed to broadcast warning:", e);
        }
    };

    useEffect(() => {
        const fetchPredictions = async () => {
            try {
                const res = await fetch(api.predictions);
                if (res.ok) setLiveAlerts(await res.json());
            } catch (error) {
                console.error("Failed to fetch ML alerts for sidebar:", error);
            }
        };

        const fetchRequests = async () => {
            try {
                const res = await fetch(api.activeRequests);
                if (res.ok) setLiveRequests(await res.json());
            } catch (error) {
                console.error("Failed to fetch active requests:", error);
            }
        };

        fetchPredictions();
        fetchRequests();

        const interval = setInterval(() => {
            fetchPredictions();
            fetchRequests();
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl relative">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />
            <div className="absolute top-40 left-0 w-[500px] h-[500px] bg-red-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />

            <div className="flex flex-col gap-8">
                {/* Header Section */}
                <div className="flex flex-col items-start gap-2 md:flex-row md:justify-between md:items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white">System Overview</h1>
                        <p className="text-slate-400 mt-1">Live metrics from the AI prediction hub and global matching engine.</p>
                    </div>
                </div>

                {/* Top KPI Cards */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ staggerChildren: 0.1 }}
                    className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
                >
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
                        <Card className="bg-slate-900/60 backdrop-blur-xl border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:border-emerald-500/30 transition-all overflow-hidden relative group">
                            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-emerald-400/0 via-emerald-400/40 to-emerald-400/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-slate-300">Available Donors (20km)</CardTitle>
                                <Users className="h-4 w-4 text-emerald-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-white drop-shadow-sm">1,248</div>
                                <p className="text-xs text-emerald-400 font-medium mt-1">+12 joined today</p>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
                        <Card className="bg-slate-900/60 backdrop-blur-xl border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:border-emerald-500/30 transition-all overflow-hidden relative group">
                            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-emerald-400/0 via-emerald-400/40 to-emerald-400/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-slate-300">Pending Matches</CardTitle>
                                <Activity className="h-4 w-4 text-emerald-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-white drop-shadow-sm">{liveRequests.length}</div>
                                <p className="text-xs text-emerald-400/80 font-medium mt-1">Running Hopcroft-Karp...</p>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
                        <Card className={`backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all overflow-hidden relative group ${liveAlerts.length > 0 ? 'bg-red-950/20 border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.15)]' : 'bg-slate-900/60 border-slate-800/80'}`}>
                            <div className={`absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity ${liveAlerts.length > 0 ? "from-red-500/0 via-red-500/60 to-red-500/0" : "from-emerald-400/0 via-emerald-400/40 to-emerald-400/0"}`} />
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-slate-300">Predicted Shortages</CardTitle>
                                <ShieldAlert className={`h-4 w-4 ${liveAlerts.length > 0 ? 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'text-slate-500'}`} />
                            </CardHeader>
                            <CardContent>
                                <div className={`text-2xl font-bold drop-shadow-sm ${liveAlerts.length > 0 ? 'text-red-400' : 'text-slate-300'}`}>{liveAlerts.length} Regions</div>
                                <p className="text-xs text-slate-500 font-medium mt-1">Last updated 2 mins ago</p>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}>
                        <Card className="bg-slate-900/60 backdrop-blur-xl border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:border-emerald-500/30 transition-all overflow-hidden relative group">
                            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-emerald-400/0 via-emerald-400/40 to-emerald-400/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-slate-300">Total Blood Units</CardTitle>
                                <Droplets className="h-4 w-4 text-emerald-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-white drop-shadow-sm">8,402</div>
                                <p className="text-xs text-slate-500 font-medium mt-1">98% tracked via Cold Chain FIFO</p>
                            </CardContent>
                        </Card>
                    </motion.div>
                </motion.div>

                {/* Main Content Area */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="grid gap-6 md:grid-cols-7"
                >

                    {/* Map spans 4 columns on desktop */}
                    <Card className="md:col-span-4 flex flex-col bg-slate-900/60 backdrop-blur-xl border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.15)] overflow-hidden">
                        <CardHeader className="pb-4 border-b border-slate-800/60 bg-slate-900/40">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-white">AI Prediction Map</CardTitle>
                                    <CardDescription className="text-slate-400 mt-1">Live forecasting of regional shortages powered by SVM & XGBoost.</CardDescription>
                                </div>
                                <Badge variant="outline" className="bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-1 flex items-center gap-2 font-medium">
                                    <span className="relative flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                                    </span>
                                    Live Stream
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 p-0 relative z-0">
                            <div className="absolute inset-0 ring-1 ring-inset ring-slate-800/30 pointer-events-none z-[400]" />
                            {/* Leaflet Component Wrapper */}
                            <AIPredictionMap predictions={liveAlerts} activeRequests={liveRequests} />
                        </CardContent>
                    </Card>

                    {/* AI Alerts Sidebar spans 3 columns on desktop */}
                    <Card className="md:col-span-3 flex flex-col h-[550px] bg-slate-900/60 backdrop-blur-xl border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.15)] overflow-hidden">
                        <CardHeader className="pb-4 border-b border-slate-800/60 bg-slate-900/40 shrink-0">
                            <CardTitle className="text-white">Urgent Shortage Alerts</CardTitle>
                            <CardDescription className="text-slate-400 mt-1">Regions flagged by the Proactive Prediction Service.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
                            <div className="divide-y divide-slate-800/60 max-h-[420px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                                {liveAlerts.length > 0 ? (
                                    liveAlerts.map((alert, i) => (
                                        <motion.div
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.1 }}
                                            key={alert.id}
                                            className={`flex items-start gap-4 p-5 transition-colors hover:bg-slate-800/40 relative overflow-hidden ${alert.severity === 'High' ? 'bg-red-500/5' : ''}`}
                                        >
                                            {alert.severity === 'High' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-500/80 to-red-600/20" />}
                                            <ShieldAlert className={`h-5 w-5 mt-0.5 shrink-0 ${alert.severity === 'High' ? 'text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]' : 'text-amber-400'}`} />
                                            <div className="flex-1 space-y-1.5 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-sm font-semibold text-white truncate">Region {alert.id} Forecast</p>
                                                    <Badge className={alert.severity === 'High' ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 shrink-0" : "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30 shrink-0"}>
                                                        {alert.severity}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                                                    <Droplets className="h-3.5 w-3.5 fill-red-500/20 text-red-500 drop-shadow-sm" /> {alert.predictedShortage} Units {alert.bloodType} Needed
                                                </p>
                                                <div className="text-xs text-slate-400 bg-slate-950/50 p-3 rounded-md border border-slate-800 mt-3 shadow-inner leading-relaxed">
                                                    <strong className="text-emerald-400/90 tracking-wide uppercase text-[10px]">AI Logic Path</strong> <br />
                                                    <span className="mt-1 block">{alert.reason}</span>
                                                </div>
                                                {/* XAI Bar Chart */}
                                                <div className="mt-3">
                                                    <button
                                                        className="text-xs font-semibold text-emerald-400/80 hover:text-emerald-400 flex items-center gap-1.5"
                                                        onClick={() => setExpandedXAI(expandedXAI === alert.id ? null : alert.id)}
                                                    >
                                                        <span>★</span> {expandedXAI === alert.id ? 'Hide Breakdown' : 'Why This Prediction?'}
                                                    </button>
                                                    {expandedXAI === alert.id && (
                                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 space-y-2">
                                                            {Object.entries((alert as any).localScores || {}).sort(([, a]: any, [, b]: any) => b - a).map(([feat, score]: [string, any]) => (
                                                                <div key={feat}>
                                                                    <div className="flex justify-between text-[11px] mb-1">
                                                                        <span className="text-slate-400">{feat}</span>
                                                                        <span className="text-slate-300 font-bold">{score}%</span>
                                                                    </div>
                                                                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                                                        <motion.div
                                                                            initial={{ width: 0 }}
                                                                            animate={{ width: `${score}%` }}
                                                                            transition={{ duration: 0.6, ease: 'easeOut' }}
                                                                            className={`h-full rounded-full ${score > 70 ? 'bg-red-500' : score > 40 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            <p className="text-[10px] text-slate-600 mt-1 italic">Sources: UCI Blood Transfusion DB + Jaipur contextual signals</p>
                                                        </motion.div>
                                                    )}
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className={`w-full mt-3 h-8 text-xs font-semibold shadow-sm transition-all ${warnedRegions.has(alert.id.toString()) ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-800 hover:bg-red-500/20 hover:text-red-400 border-slate-700 hover:border-red-500/30 text-slate-300'}`}
                                                    onClick={() => handleBroadcastWarning(alert)}
                                                    disabled={warnedRegions.has(alert.id.toString())}
                                                >
                                                    {warnedRegions.has(alert.id.toString()) ? "Warning Broadcasted" : "Broadcast Warning to Hospitals"}
                                                </Button>
                                            </div>
                                        </motion.div>
                                    ))
                                ) : (
                                    <div className="p-12 text-center text-sm text-slate-500 flex flex-col items-center justify-center h-full">
                                        <Activity className="h-10 w-10 mx-auto text-slate-700 mb-3 opacity-50" />
                                        No active shortages predicted<br />at this time.
                                    </div>
                                )}
                            </div>

                            {!liveRequests.length && liveAlerts.length > 0 && (
                                <div className="p-4 border-t border-slate-800/60 bg-slate-900/40 mt-auto shrink-0">
                                    <Button variant="ghost" className="w-full text-xs text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700/50 transition-colors border border-slate-700/50 shadow-sm rounded-lg py-5">
                                        View All Predictions <ArrowRight className="h-4 w-4 ml-1.5" />
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}

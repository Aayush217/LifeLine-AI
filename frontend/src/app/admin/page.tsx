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
        <div className="mx-auto px-6 lg:px-10 py-12 max-w-[1600px] bg-white min-h-screen text-black">            
                <div className="flex flex-col items-start gap-2 md:flex-row md:justify-between md:items-center">
                <div>
                <h1 className="text-6xl sm:text-8xl font-extrabold uppercase tracking-[-0.06em] leading-[0.9]">                       System Overview
                    </h1>

                    <p className="text-neutral-500 mt-4 text-sm uppercase tracking-widest">                     Live metrics from the AI prediction hub and global matching engine.
                  </p>
                </div>
                </div>

                {/* Top KPI Cards */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ staggerChildren: 0.1 }}
                    className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-4"
                >
                    <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.3 }}
>
                    <Card className="group border border-black/10 bg-white rounded-none transition-all duration-500 hover:bg-neutral-900 hover:border-neutral-900 hover:-translate-y-1 cursor-pointer overflow-hidden">
                            
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-black transition-colors duration-500 group-hover:text-white">Available Donors (20km)</CardTitle>
                                <Users className="h-4 w-4 text-black transition-colors duration-500 group-hover:text-white" />
                            </CardHeader>
                            <CardContent>
                            <div className="text-5xl font-black tracking-tight text-black transition-colors duration-500 group-hover:text-white">1,248</div>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 mt-3 transition-colors duration-500 group-hover:text-neutral-300">+12 joined today</p>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.4 }}
>
                    <Card className="group border border-black/10 bg-white rounded-none transition-all duration-500 hover:bg-neutral-900 hover:border-neutral-900 hover:-translate-y-1 cursor-pointer overflow-hidden">
                            
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-black transition-colors duration-500 group-hover:text-white">Pending Matches</CardTitle>
                            <Activity className="h-4 w-4 text-black transition-colors duration-500 group-hover:text-white" />
                            </CardHeader>
                            <CardContent>
                            <div className="text-5xl font-black tracking-tight text-black transition-colors duration-500 group-hover:text-white">{liveRequests.length}</div>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 mt-3 transition-colors duration-500 group-hover:text-neutral-300">Running Hopcroft-Karp...</p>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.1 }}
>
                        <Card className="group border border-black/10 bg-white rounded-none transition-all duration-500 hover:bg-neutral-900 hover:border-neutral-900 hover:-translate-y-1 cursor-pointer overflow-hidden">
                            
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-black transition-colors duration-500 group-hover:text-white">Predicted Shortages</CardTitle>
                            <ShieldAlert className="h-4 w-4 text-black transition-colors duration-500 group-hover:text-white" />
                            </CardHeader>
                            <CardContent>
                            <div className="text-5xl font-black tracking-tight text-black transition-colors duration-500 group-hover:text-white">{liveAlerts.length} Regions</div>
                                <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 mt-3 transition-colors duration-500 group-hover:text-neutral-300">Last updated 2 mins ago</p>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.2 }}
>
                    <Card className="group border border-black/10 bg-white rounded-none transition-all duration-500 hover:bg-neutral-900 hover:border-neutral-900 hover:-translate-y-1 cursor-pointer overflow-hidden">
                            
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-black transition-colors duration-500 group-hover:text-white">Total Blood Units</CardTitle>
                            <Droplets className="h-4 w-4 text-black transition-colors duration-500 group-hover:text-white" />
                            </CardHeader>
                            <CardContent>
                            <div className="text-5xl font-black tracking-tight text-black transition-colors duration-500 group-hover:text-white">8,402</div>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 mt-3 transition-colors duration-500 group-hover:text-neutral-300">98% tracked via Cold Chain FIFO</p>
                            </CardContent>
                        </Card>
                    </motion.div>
                </motion.div>

                {/* Main Content Area */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="grid gap-6 grid-cols-1 lg:grid-cols-7"
                >

                    {/* Map spans 4 columns on desktop, full width on mobile */}
                    <Card className="col-span-1 lg:col-span-4 flex flex-col bg-[#f5f5f5] border border-gray-200 rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-md">
                        <CardHeader className="pb-4 border-b border-slate-800/60 bg-[#f5f5f5]">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-black">AI Prediction Map</CardTitle>
                                    <CardDescription className="text-gray-500 mt-1">Live forecasting of regional shortages powered by SVM & XGBoost.</CardDescription>
                                </div>
                                <Badge variant="outline" className="bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-1 flex items-center gap-2 font-medium">
                                    <span className="relative flex h-2.5 w-2.5">
                                        <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                                    </span>
                                    Live Stream
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 p-0 relative z-0 min-h-[300px] sm:min-h-[420px]">
                            <div className="absolute inset-0 ring-slate-800/30 pointer-events-none z-[400]" />
                            {/* Leaflet Component Wrapper */}
                            <AIPredictionMap predictions={liveAlerts} activeRequests={liveRequests} />
                        </CardContent>
                    </Card>

                    {/* AI Alerts Sidebar spans 3 columns on desktop, full width on mobile */}
                    <Card className="col-span-1 lg:col-span-3 flex flex-col bg-[#f5f5f5] border-gray-200 overflow-hidden">
                        <CardHeader className="pb-4 border-b border-slate-800/60 bg-[#f5f5f5] shrink-0">
                            <CardTitle className="text-black">Urgent Shortage Alerts</CardTitle>
                            <CardDescription className="text-gray-500 mt-1">Regions flagged by the Proactive Prediction Service.</CardDescription>
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
                                            <ShieldAlert className={`h-5 w-5 mt-0.5 shrink-0 ${alert.severity === 'High' ? 'text-red-400 -[0_0_8px_rgba(239,68,68,0.6)]' : 'text-amber-400'}`} />
                                            <div className="flex-1 space-y-1.5 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-sm font-semibold text-black truncate">Region {alert.id} Forecast</p>
                                                    <Badge className={alert.severity === 'High' ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 shrink-0" : "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30 shrink-0"}>
                                                        {alert.severity}
                                                    </Badge>
                                                </div>
                                                <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-gray-700 flex items-center gap-1.5">
                                                    <Droplets className="h-3.5 w-3.5 fill-red-500/20 text-red-500 " /> {alert.predictedShortage} Units {alert.bloodType} Needed
                                                </p>
                                                <div className="text-[10px] uppercase tracking-[0.2em] text-gray-500 bg-slate-950/50 p-3 rounded-md border border-slate-800 mt-3 shadow-inner leading-relaxed">
                                                    <strong className="text-emerald-400/90 tracking-wide uppercase text-[10px]">AI Logic Path</strong> <br />
                                                    <span className="mt-1 block">{alert.reason}</span>
                                                </div>
                                                {/* XAI Bar Chart */}
                                                <div className="mt-3">
                                                    <button
                                                        className="text-[10px] uppercase tracking-[0.2em] font-semibold text-emerald-400/80 hover:text-emerald-400 flex items-center gap-1.5"
                                                        onClick={() => setExpandedXAI(expandedXAI === alert.id ? null : alert.id)}
                                                    >
                                                        <span>★</span> {expandedXAI === alert.id ? 'Hide Breakdown' : 'Why This Prediction?'}
                                                    </button>
                                                    {expandedXAI === alert.id && (
                                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 space-y-2">
                                                            {Object.entries((alert as any).localScores || {}).sort(([, a]: any, [, b]: any) => b - a).map(([feat, score]: [string, any]) => (
                                                                <div key={feat}>
                                                                    <div className="flex justify-between text-[11px] mb-1">
                                                                        <span className="text-gray-500">{feat}</span>
                                                                        <span className="text-gray-700 font-bold">{score}%</span>
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
                                                    className={`w-full mt-3 h-8 text-[10px] uppercase tracking-[0.2em] font-semibold transition-all ${warnedRegions.has(alert.id.toString()) ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-800 hover:bg-red-500/20 hover:text-red-400 border-slate-700 hover:border-red-500/30 text-gray-700'}`}
                                                    onClick={() => handleBroadcastWarning(alert)}
                                                    disabled={warnedRegions.has(alert.id.toString())}
                                                >
                                                    {warnedRegions.has(alert.id.toString()) ? "Warning Broadcasted" : "Broadcast Warning to Hospitals"}
                                                </Button>
                                            </div>
                                        </motion.div>
                                    ))
                                ) : (
                                    <div className="p-12 text-center text-sm text-gray-500 flex flex-col items-center justify-center h-full">
                                        <Activity className="h-10 w-10 mx-auto text-slate-700 mb-3 opacity-50" />
                                        No active shortages predicted<br />at this time.
                                    </div>
                                )}
                            </div>

                            {!liveRequests.length && liveAlerts.length > 0 && (
                                <div className="p-4 border-t border-slate-800/60 bg-[#f5f5f5] mt-auto shrink-0">
                                    <Button variant="ghost" className="w-full text-[10px] uppercase tracking-[0.2em] text-gray-500 hover:text-black bg-slate-800/50 hover:bg-slate-700/50 transition-colors border border-slate-700/50 rounded-lg py-5">
                                        View All Predictions <ArrowRight className="h-4 w-4 ml-1.5" />
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        );
}
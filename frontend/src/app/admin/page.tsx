"use client";

import AIPredictionMap, { PredictionData } from "@/components/AIPredictionMap";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, Droplets, MapPin, Search, Users, ShieldAlert, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

export default function Home() {
    const [liveAlerts, setLiveAlerts] = useState<PredictionData[]>([]);
    const [liveRequests, setLiveRequests] = useState<any[]>([]);

    useEffect(() => {
        const fetchPredictions = async () => {
            try {
                const res = await fetch("http://localhost:8000/api/predictions");
                if (res.ok) setLiveAlerts(await res.json());
            } catch (error) {
                console.error("Failed to fetch ML alerts for sidebar:", error);
            }
        };

        const fetchRequests = async () => {
            try {
                const res = await fetch("http://localhost:8000/api/requests/active");
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
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <div className="flex flex-col gap-8">
                {/* Header Section */}
                <div className="flex flex-col items-start gap-2 md:flex-row md:justify-between md:items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">System Overview</h1>
                        <p className="text-muted-foreground mt-1">Live metrics from the AI prediction hub and global matching engine.</p>
                    </div>
                </div>

                {/* Top KPI Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Available Donors (20km)</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">1,248</div>
                            <p className="text-xs text-emerald-600 font-medium mt-1">
                                +12 joined today
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Pending Matches</CardTitle>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">14</div>
                            <p className="text-xs text-amber-600 font-medium mt-1">
                                Running Hopcroft-Karp...
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Predicted Shortages</CardTitle>
                            <ShieldAlert className="h-4 w-4 text-red-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">{liveAlerts.length} Regions</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Last updated 2 mins ago
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Total Blood Units</CardTitle>
                            <Droplets className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">8,402</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                98% tracked via Cold Chain FIFO
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content Area */}
                <div className="grid gap-6 md:grid-cols-7">

                    {/* Map spans 4 columns on desktop */}
                    <Card className="md:col-span-4 flex flex-col">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>AI Prediction Map</CardTitle>
                                    <CardDescription>Live forecasting of regional shortages powered by SVM & XGBoost.</CardDescription>
                                </div>
                                <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 gap-1.5 flex items-center shadow-none">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                    </span>
                                    Live Stream
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 p-0 px-6 pb-6 mt-2 relative z-0">
                            {/* Leaflet Component Wrapper */}
                            <AIPredictionMap predictions={liveAlerts} activeRequests={liveRequests} />
                        </CardContent>
                    </Card>

                    {/* AI Alerts Sidebar spans 3 columns on desktop */}
                    <Card className="md:col-span-3 overflow-hidden">
                        <CardHeader className="bg-slate-50 border-b">
                            <CardTitle>Urgent Shortage Alerts</CardTitle>
                            <CardDescription>Regions flagged by the Proactive Prediction Service.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y max-h-[420px] overflow-y-auto">
                                {liveAlerts.length > 0 ? (
                                    liveAlerts.map(alert => (
                                        <div key={alert.id} className={`flex items-start gap-4 p-5 transition-colors hover:bg-slate-50 ${alert.severity === 'High' ? 'bg-red-50/20' : ''}`}>
                                            <ShieldAlert className={`h-5 w-5 mt-0.5 shrink-0 ${alert.severity === 'High' ? 'text-red-600' : 'text-amber-600'}`} />
                                            <div className="flex-1 space-y-1.5 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-sm font-semibold text-slate-900 truncate">Region {alert.id} Forecast</p>
                                                    <Badge className={alert.severity === 'High' ? "bg-red-100 text-red-700 hover:bg-red-200 border-none shrink-0" : "bg-amber-100 text-amber-700 hover:bg-amber-200 border-none shrink-0"}>
                                                        {alert.severity}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                                                    <Droplets className="h-3.5 w-3.5 fill-red-200 text-red-600" /> {alert.predictedShortage} Units {alert.bloodType} Needed
                                                </p>
                                                <div className="text-xs text-slate-600 bg-white p-2.5 rounded border border-slate-100 mt-2 shadow-sm">
                                                    <strong className="text-slate-900">AI Logic Path:</strong> <br />{alert.reason}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-8 text-center text-sm text-slate-500">
                                        <Activity className="h-8 w-8 mx-auto text-slate-200 mb-2" />
                                        No active shortages predicted at this time.
                                    </div>
                                )}
                            </div>

                            {!liveRequests.length && liveAlerts.length > 0 && (
                                <div className="p-4 border-t bg-slate-50">
                                    <Button variant="ghost" className="w-full text-xs text-slate-500 hover:text-slate-900 bg-white border shadow-sm">
                                        View All Predictions <ArrowRight className="h-3 w-3 ml-1" />
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                </div>
            </div>
        </div>
    );
}

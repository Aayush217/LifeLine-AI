"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, Droplets, Snowflake, AlertCircle, Clock, Send, CheckCircle2, ShieldAlert } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import { api } from "@/lib/api";

// Mock initial data
const initialInventory = [
    { id: "4092A", type: "O-", expires: 2, priority: "Critical" },
    { id: "4095B", type: "A+", expires: 14, priority: "Stable" },
    { id: "4102C", type: "B-", expires: 21, priority: "Stable" },
];

export default function HospitalDashboard() {
    const { user } = useAuth();
    const [isMatching, setIsMatching] = useState(false);

    // Stateful tracking
    const [inventory, setInventory] = useState(initialInventory);
    const [activeRequests, setActiveRequests] = useState<any[]>([]);
    const [warnings, setWarnings] = useState<any[]>([]);

    useEffect(() => {
        if (!user) return;

        const fetchActiveRequests = async () => {
            try {
                const res = await fetch(api.activeRequests);
                if (res.ok) {
                    const data = await res.json();
                    // Filter down to only requests created by this hospital
                    setActiveRequests(data.filter((req: any) => req.hospital_id === user.id));
                }
            } catch (error) {
                console.error("Failed to fetch active requests:", error);
            }
        };

        const fetchWarnings = async () => {
            try {
                const res = await fetch(api.warnings);
                if (res.ok) {
                    setWarnings(await res.json());
                }
            } catch (error) {
                console.error("Failed to fetch warnings:", error);
            }
        };

        fetchActiveRequests();
        fetchWarnings();

        const interval = setInterval(() => {
            fetchActiveRequests();
            fetchWarnings();
        }, 5000);
        return () => clearInterval(interval);
    }, [user]);

    // Form states
    const [bloodType, setBloodType] = useState('O-');
    const [unitsNeeded, setUnitsNeeded] = useState(1);
    const [urgency, setUrgency] = useState('Critical');

    const handleSimulateRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setIsMatching(true);

        // Dispatch the request using the form parameters and dynamic user location
        const payload = {
            hospital_id: user.id,
            lat: user.location?.lat || 26.9124,
            lng: user.location?.lng || 75.7873,
            bloodType: bloodType,
            unitsNeeded: unitsNeeded,
            urgency: urgency
        };

        try {
            const res = await fetch(api.requests, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const data = await res.json();

                // Add the new request to our active state tracker from backend response
                const newRequest = data.request_ticket;

                // Keep local UI synced instantly (the polling hook will sync the rest)
                setActiveRequests(prev => [newRequest, ...prev]);

                // Reset specific form fields
                setUnitsNeeded(1);
            }
        } catch (error) {
            console.error("Failed to trigger match:", error);
        } finally {
            setIsMatching(false);
        }
    };

    const handleCloseRequest = async (requestId: string) => {
        const closedReq = activeRequests.find(r => r.id === requestId);
        if (!closedReq) return;

        try {
            // Tell backend to close this request, assuming donor #1 arrived for MVP scope
            const assumedDonorId = closedReq.routingDetails?.[0]?.donor_id || "mock_d1";
            await fetch(api.closeRequest(requestId), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ donor_id: assumedDonorId })
            });

            // Generate new inventory batches based on the received units
            const newBatches = Array.from({ length: closedReq.unitsNeeded }).map((_, i) => ({
                id: `${closedReq.id.substring(4)}-${i + 1}`,
                type: closedReq.bloodType,
                expires: 42, // Standard red blood cell shelf life
                priority: "Stable"
            }));

            setInventory(prev => [...newBatches, ...prev]);
            setActiveRequests(prev => prev.filter(r => r.id !== requestId));
        } catch (error) {
            console.error("Failed to close request:", error);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl relative">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />
            <div className="absolute top-40 left-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />

            <div className="flex flex-col gap-8">

                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-start gap-2 md:flex-row md:justify-between md:items-center">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Hospital Control Center</h1>
                        <p className="text-slate-400 mt-1 text-sm sm:text-base">Manage Cold Chain Logistics and Emergency Match Requests.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(52,211,153,0.1)] px-3 py-1">
                            <span className="relative flex h-2 w-2 mr-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            System Online
                        </Badge>
                    </div>
                </motion.div>

                {warnings.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3">
                        {warnings.map((warn) => (
                            <div key={warn.id} className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-4 shadow-[0_4px_20px_rgba(239,68,68,0.1)]">
                                <ShieldAlert className="h-6 w-6 text-red-500 mt-1 shrink-0 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                                <div>
                                    <h3 className="text-red-400 font-bold tracking-tight">System Admin Warning: {warn.severity} Risk</h3>
                                    <p className="text-slate-300 text-sm mt-1">{warn.message}</p>
                                    <p className="text-xs text-red-500/70 mt-2 font-medium">{new Date(warn.timestamp).toLocaleTimeString()}</p>
                                </div>
                            </div>
                        ))}
                    </motion.div>
                )}

                <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">

                    {/* Request Controls */}
                    <Card className="col-span-1 flex flex-col bg-slate-900/60 backdrop-blur-xl border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.15)] h-fit overflow-hidden">
                        <CardHeader className="bg-slate-900/40 border-b border-slate-800/60 pb-4 relative">
                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-500/80 to-red-500/10" />
                            <CardTitle className="flex items-center gap-2 text-white">
                                <AlertCircle className="h-5 w-5 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                                Dispatch Request
                            </CardTitle>
                            <CardDescription className="text-slate-400">Launch a targeted request into the regional donor network.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 flex-1 flex flex-col">

                            <form onSubmit={handleSimulateRequest} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-300">Blood Type Required</label>
                                    <select
                                        className="w-full p-2.5 border border-slate-700/50 rounded-md text-sm bg-slate-800/50 text-white focus:outline-none focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 transition-all font-medium"
                                        value={bloodType}
                                        onChange={(e) => setBloodType(e.target.value)}
                                    >
                                        <option className="bg-slate-900 text-white" value="O-">O Negative (Universal)</option>
                                        <option className="bg-slate-900 text-white" value="O+">O Positive</option>
                                        <option className="bg-slate-900 text-white" value="A-">A Negative</option>
                                        <option className="bg-slate-900 text-white" value="A+">A Positive</option>
                                        <option className="bg-slate-900 text-white" value="B-">B Negative</option>
                                        <option className="bg-slate-900 text-white" value="B+">B Positive</option>
                                        <option className="bg-slate-900 text-white" value="AB-">AB Negative</option>
                                        <option className="bg-slate-900 text-white" value="AB+">AB Positive</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-slate-300">Units Needed</label>
                                        <input
                                            type="number"
                                            min="1" max="50"
                                            className="w-full p-2.5 border border-slate-700/50 rounded-md text-sm bg-slate-800/50 text-white focus:outline-none focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 transition-all font-medium"
                                            value={unitsNeeded}
                                            onChange={(e) => setUnitsNeeded(parseInt(e.target.value))}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-slate-300">Urgency</label>
                                        <select
                                            className="w-full p-2.5 border border-slate-700/50 rounded-md text-sm bg-slate-800/50 text-white focus:outline-none focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 transition-all font-medium"
                                            value={urgency}
                                            onChange={(e) => setUrgency(e.target.value)}
                                        >
                                            <option className="bg-slate-900 text-white" value="Standard">Standard</option>
                                            <option className="bg-slate-900 text-white" value="Urgent">Urgent</option>
                                            <option className="bg-slate-900 text-white" value="Critical">Critical</option>
                                        </select>
                                    </div>
                                </div>

                                <Button type="submit" size="lg" className="w-full bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)] transition-all mt-4 font-semibold tracking-wide" disabled={isMatching}>
                                    {isMatching ? "Routing via Hopcroft-Karp..." : <><Send className="h-4 w-4 mr-2" /> Broadcast Request</>}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <div className="col-span-1 lg:col-span-2 flex flex-col gap-6">

                        {/* Active Requests Status Box */}
                        <Card className="bg-slate-900/60 backdrop-blur-xl border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.15)] overflow-hidden">
                            <CardHeader className="bg-slate-900/40 border-b border-slate-800/60 pb-4 relative">
                                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500/80 to-emerald-500/10" />
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="flex items-center gap-2 text-white">
                                            <Activity className="h-5 w-5 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                                            Active Dispatch Radar
                                        </CardTitle>
                                        <CardDescription className="text-slate-400 mt-1">Live tracking of donors routed via Hopcroft-Karp.</CardDescription>
                                    </div>
                                    <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">{activeRequests.length} Active</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-slate-800/60 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                                    {activeRequests.length > 0 ? (
                                        activeRequests.map((req, i) => (
                                            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} key={req.id} className="p-5 hover:bg-slate-800/40 transition-colors">
                                                <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-bold text-white text-lg tracking-tight">{req.id}</span>
                                                        <Badge variant="outline" className={req.urgency === 'Critical' ? 'border-red-500/30 text-red-400 bg-red-500/10' : 'border-amber-500/30 text-amber-400 bg-amber-500/10'}>
                                                            {req.unitsNeeded} Units {req.bloodType}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs text-slate-500 font-medium">{new Date(req.timestamp).toLocaleTimeString()}</span>
                                                        <Button size="sm" variant="outline" className="h-8 text-xs font-semibold border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white transition-all shadow-sm" onClick={() => handleCloseRequest(req.id)}>
                                                            Mark Received
                                                        </Button>
                                                    </div>
                                                </div>
                                                <p className="text-sm font-medium text-emerald-400/90 mb-4 flex items-center gap-2 bg-emerald-950/30 p-2.5 rounded border border-emerald-900/50">
                                                    <CheckCircle2 className="h-4 w-4" /> {req.accepted_donors?.length || 0} donors have accepted and are en route (out of {req.matches} matched)
                                                </p>
                                                <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-3">
                                                    {req.routingDetails?.map((donor: any, idx: number) => (
                                                        <div key={idx} className="bg-slate-950/50 border border-slate-800 rounded-md p-3 text-xs shadow-inner">
                                                            <p className="font-semibold text-slate-300">Donor {donor.donor_id}</p>
                                                            <p className="text-slate-400 flex items-center gap-1.5 mt-1 font-medium"><Clock className="h-3.5 w-3.5 text-emerald-500/70" /> {donor.travel_time_mins}m ETA</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        ))
                                    ) : (
                                        <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center">
                                            <Activity className="h-8 w-8 mx-auto text-slate-700 mb-3 opacity-50" />
                                            No active dispatch requests running right now.
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Cold Chain Inventory */}
                        <Card className="bg-slate-900/60 backdrop-blur-xl border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.15)] overflow-hidden">
                            <CardHeader className="bg-slate-900/40 border-b border-slate-800/60 pb-4 relative">
                                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500/80 to-blue-500/10" />
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="flex items-center gap-2 text-white">
                                            <Snowflake className="h-5 w-5 text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                            Cold Chain Inventory (FIFO)
                                        </CardTitle>
                                        <CardDescription className="text-slate-400 mt-1">Units sorted by closest expiration date to prevent waste.</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-slate-800/60 relative max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                                    {inventory.map((item) => (
                                        <div key={item.id} className="p-5 flex items-center justify-between hover:bg-slate-800/40 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className={`h-12 w-12 font-bold flex items-center justify-center rounded-lg shadow-inner border tracking-tight ${item.priority === 'Critical' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-slate-800/80 text-white border-slate-700'}`}>
                                                    {item.type}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-white tracking-wide">Batch #{item.id}</p>
                                                    <p className="text-sm text-slate-400 flex items-center gap-1.5 mt-0.5 font-medium">
                                                        <Clock className="h-3.5 w-3.5 text-blue-400/70" /> Expires in {item.expires} days
                                                    </p>
                                                </div>
                                            </div>
                                            <Badge variant={item.priority === 'Critical' ? 'destructive' : 'outline'} className={item.priority === 'Critical' ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border-none' : 'text-slate-400 border-slate-700 bg-slate-950/50'}>
                                                {item.priority === 'Critical' ? 'Critical Priority' : 'Stable'}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                    </div>
                </div>
            </div>
        </div>
    );
}

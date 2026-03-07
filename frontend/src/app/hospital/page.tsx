"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, Droplets, Snowflake, AlertCircle, Clock, MapPin, Send, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

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

    useEffect(() => {
        if (!user) return;

        const fetchActiveRequests = async () => {
            try {
                const res = await fetch("http://localhost:8000/api/requests/active");
                if (res.ok) {
                    const data = await res.json();
                    // Filter down to only requests created by this hospital
                    setActiveRequests(data.filter((req: any) => req.hospital_id === user.id));
                }
            } catch (error) {
                console.error("Failed to fetch active requests:", error);
            }
        };

        fetchActiveRequests();
        const interval = setInterval(fetchActiveRequests, 5000);
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
            const res = await fetch("http://localhost:8000/api/requests", {
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
            await fetch(`http://localhost:8000/api/requests/${requestId}/close`, {
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
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <div className="flex flex-col gap-8">

                <div className="flex flex-col items-start gap-2 md:flex-row md:justify-between md:items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Hospital Control Center</h1>
                        <p className="text-muted-foreground mt-1">Manage Cold Chain Logistics and Emergency Match Requests.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> System Online
                        </Badge>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-3">

                    {/* Request Controls */}
                    <Card className="md:col-span-1 flex flex-col shadow-sm border-red-100 h-fit">
                        <CardHeader className="bg-red-50/50 border-b pb-4">
                            <CardTitle className="flex items-center gap-2">
                                <AlertCircle className="h-5 w-5 text-red-600" />
                                Dispatch Request
                            </CardTitle>
                            <CardDescription>Launch a targeted request into the regional donor network.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 flex-1 flex flex-col">

                            <form onSubmit={handleSimulateRequest} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-700">Blood Type Required</label>
                                    <select
                                        className="w-full p-2.5 border border-slate-200 rounded-md text-sm bg-white"
                                        value={bloodType}
                                        onChange={(e) => setBloodType(e.target.value)}
                                    >
                                        <option value="O-">O Negative (Universal)</option>
                                        <option value="O+">O Positive</option>
                                        <option value="A-">A Negative</option>
                                        <option value="A+">A Positive</option>
                                        <option value="B-">B Negative</option>
                                        <option value="B+">B Positive</option>
                                        <option value="AB-">AB Negative</option>
                                        <option value="AB+">AB Positive</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-slate-700">Units Needed</label>
                                        <input
                                            type="number"
                                            min="1" max="50"
                                            className="w-full p-2.5 border border-slate-200 rounded-md text-sm bg-white"
                                            value={unitsNeeded}
                                            onChange={(e) => setUnitsNeeded(parseInt(e.target.value))}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-slate-700">Urgency</label>
                                        <select
                                            className="w-full p-2.5 border border-slate-200 rounded-md text-sm bg-white"
                                            value={urgency}
                                            onChange={(e) => setUrgency(e.target.value)}
                                        >
                                            <option value="Standard">Standard</option>
                                            <option value="Urgent">Urgent</option>
                                            <option value="Critical">Critical</option>
                                        </select>
                                    </div>
                                </div>

                                <Button type="submit" size="lg" className="w-full bg-red-600 hover:bg-red-700 shadow-sm mt-4" disabled={isMatching}>
                                    {isMatching ? "Routing via Hopcroft-Karp..." : <><Send className="h-4 w-4 mr-2" /> Broadcast Request</>}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <div className="md:col-span-2 flex flex-col gap-6">

                        {/* Active Requests Status Box */}
                        <Card className="shadow-sm border-emerald-100">
                            <CardHeader className="bg-slate-50 border-b pb-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            <Activity className="h-5 w-5 text-emerald-600" />
                                            Active Dispatch Radar
                                        </CardTitle>
                                        <CardDescription>Live tracking of donors routed via Hopcroft-Karp.</CardDescription>
                                    </div>
                                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200">{activeRequests.length} Active</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y max-h-[300px] overflow-y-auto">
                                    {activeRequests.length > 0 ? (
                                        activeRequests.map((req) => (
                                            <div key={req.id} className="p-4 bg-white hover:bg-slate-50 transition-colors">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-900">{req.id}</span>
                                                        <Badge variant="outline" className={req.urgency === 'Critical' ? 'border-red-200 text-red-700 bg-red-50' : 'border-amber-200 text-amber-700 bg-amber-50'}>
                                                            {req.unitsNeeded} Units {req.bloodType}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-slate-500 mr-2">{new Date(req.timestamp).toLocaleTimeString()}</span>
                                                        <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800" onClick={() => handleCloseRequest(req.id)}>
                                                            Mark Received
                                                        </Button>
                                                    </div>
                                                </div>
                                                <p className="text-sm font-medium text-emerald-700 mb-3 flex items-center gap-1.5">
                                                    <CheckCircle2 className="h-4 w-4" /> {req.accepted_donors?.length || 0} donors have accepted and are en route (out of {req.matches} matched)
                                                </p>
                                                <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
                                                    {req.routingDetails?.map((donor: any, idx: number) => (
                                                        <div key={idx} className="bg-slate-50 border border-slate-100 rounded p-2 text-xs">
                                                            <p className="font-semibold text-slate-700">Donor {donor.donor_id}</p>
                                                            <p className="text-slate-500 flex items-center gap-1 mt-0.5"><Clock className="h-3 w-3" /> {donor.travel_time_mins}m ETA</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-8 text-center text-slate-500 text-sm">
                                            No active dispatch requests running right now.
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Cold Chain Inventory */}
                        <Card className="shadow-sm">
                            <CardHeader className="bg-slate-50 border-b pb-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            <Snowflake className="h-5 w-5 text-blue-500" />
                                            Cold Chain Inventory (FIFO)
                                        </CardTitle>
                                        <CardDescription>Units sorted by closest expiration date to prevent waste.</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y relative max-h-[300px] overflow-y-auto">
                                    {inventory.map((item) => (
                                        <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                                            <div className="flex items-center gap-4">
                                                <div className={`h-10 w-10 font-bold flex items-center justify-center rounded ${item.priority === 'Critical' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                                                    {item.type}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900">Batch #{item.id}</p>
                                                    <p className="text-sm text-slate-500 flex items-center gap-1">
                                                        <Clock className="h-3 w-3" /> Expires in {item.expires} days
                                                    </p>
                                                </div>
                                            </div>
                                            <Badge variant={item.priority === 'Critical' ? 'destructive' : 'outline'} className={item.priority === 'Critical' ? 'bg-red-100 text-red-800 hover:bg-red-200' : 'text-slate-500'}>
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

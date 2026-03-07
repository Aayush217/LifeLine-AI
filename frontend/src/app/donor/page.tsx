"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, ShieldAlert, Navigation, Medal, Award, Star, HeartPulse, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function DonorDashboard() {
    const { user } = useAuth();
    const [liveRequests, setLiveRequests] = useState<any[]>([]);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [isAccepting, setIsAccepting] = useState<string | null>(null);

    useEffect(() => {
        // Fetch active requests triggered by hospitals
        const fetchRequests = async () => {
            try {
                const res = await fetch("http://localhost:8000/api/requests/active");
                if (res.ok) {
                    const data = await res.json();
                    setLiveRequests(data);
                }
            } catch (error) {
                console.error("Failed to fetch active requests:", error);
            }
        };

        const fetchLeaderboard = async () => {
            try {
                const res = await fetch("http://localhost:8000/api/leaderboard");
                if (res.ok) {
                    const data = await res.json();
                    setLeaderboard(data);
                }
            } catch (error) {
                console.error("Failed to fetch leaderboard:", error);
            }
        };

        fetchRequests();
        fetchLeaderboard();

        // Polling effect for a true live feel
        const interval = setInterval(() => {
            fetchRequests();
            fetchLeaderboard();
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    const handleAcceptMatch = async (requestId: string) => {
        if (!user) return;
        setIsAccepting(requestId);
        try {
            const res = await fetch(`http://localhost:8000/api/requests/${requestId}/accept`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ donor_id: user.id })
            });
            if (res.ok) {
                // Instantly update the local state for faster UI feedback
                setLiveRequests(prev => prev.map(req => {
                    if (req.id === requestId) {
                        return {
                            ...req,
                            accepted_donors: [...(req.accepted_donors || []), user.id]
                        };
                    }
                    return req;
                }));
            }
        } catch (error) {
            console.error("Failed to accept match:", error);
        } finally {
            setIsAccepting(null);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <div className="flex flex-col gap-8">

                <div className="flex flex-col items-start gap-2 md:flex-row md:justify-between md:items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Welcome Back{user ? `, ${user.name}` : ''}</h1>
                        <p className="text-muted-foreground mt-1">Your blood type <strong className="text-red-600">{user?.bloodType}</strong> is needed to save lives.</p>
                    </div>
                    {user?.points && user.points > 1000 && (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none px-4 py-1.5 text-sm gap-2">
                            <Star className="h-4 w-4 fill-emerald-600 text-emerald-600" />
                            Top Responder
                        </Badge>
                    )}
                </div>

                {/* Gamification Stats */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="bg-gradient-to-br from-red-600 to-red-800 text-white border-none shadow-md">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-red-100">Total Lives Saved</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{user?.livesSaved || 0}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500">Reputation Points</CardTitle>
                            <Medal className="h-4 w-4 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{user?.points || 0}</div>
                            <p className="text-xs font-medium text-slate-500 mt-1">
                                Every donation counts
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500">Collected Badges</CardTitle>
                            <Award className="h-4 w-4 text-purple-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-2 flex-wrap">
                                {user?.badges && user.badges.length > 0 ? (
                                    user.badges.map((badge, idx) => (
                                        <Badge key={idx} variant="secondary" className="bg-purple-100 text-purple-700">{badge}</Badge>
                                    ))
                                ) : (
                                    <span className="text-sm text-slate-400">Save lives to earn badges</span>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Alerts targeting this donor */}
                <div className="grid gap-6 md:grid-cols-3">
                    {/* Main left column: Active Requests map */}
                    <div className="md:col-span-2">
                        <h2 className="text-xl font-bold tracking-tight text-slate-900 mb-4 flex items-center gap-2">
                            <ShieldAlert className="h-5 w-5 text-red-600" /> Urgent Dispatches in Jaipur
                        </h2>

                        <div className="grid gap-4">
                            {liveRequests.length > 0 ? (
                                liveRequests.map((alert) => (
                                    <Card key={alert.id} className="border-red-100 shadow-sm overflow-hidden">
                                        <div className="bg-red-50 p-4 border-b border-red-100 flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <Activity className="h-4 w-4 text-red-600" />
                                                <span className="font-semibold text-red-900">Request {alert.id}</span>
                                            </div>
                                            <Badge className={alert.urgency === 'Critical' ? 'bg-red-600' : 'bg-amber-500'}>{alert.urgency} Need</Badge>
                                        </div>
                                        <CardContent className="p-5">
                                            <p className="text-sm text-slate-600 mb-4">
                                                A hospital nearby is broadcasting an urgent request for <strong>{alert.unitsNeeded} units</strong> of <strong>{alert.bloodType}</strong> blood. {user?.bloodType === alert.bloodType ? <span className="text-emerald-600 font-bold ml-1">You are a confirmed match.</span> : ''}
                                            </p>
                                            <div className="flex items-center justify-between bg-slate-50 p-3 rounded text-sm border">
                                                <span className="text-slate-500">Est. Routing ETA (via OSRM):</span>
                                                <span className="font-bold flex items-center gap-1.5"><Navigation className="h-4 w-4 text-slate-400" /> ~{alert.eta || 15} mins away</span>
                                            </div>

                                            {alert.accepted_donors?.includes(user?.id) ? (
                                                <div className="w-full mt-4 bg-emerald-50 border border-emerald-200 text-emerald-700 py-2.5 px-4 rounded-md text-sm font-medium flex items-center justify-center gap-2 shadow-sm">
                                                    <HeartPulse className="h-4 w-4" /> Hospital Notified! You are en route.
                                                </div>
                                            ) : (
                                                <Button
                                                    className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white shadow-sm"
                                                    disabled={(user?.bloodType !== alert.bloodType && alert.bloodType !== 'Any') || isAccepting === alert.id}
                                                    onClick={() => handleAcceptMatch(alert.id)}
                                                >
                                                    {isAccepting === alert.id ? "Accepting..." : "Accept Match & Route to Center"}
                                                </Button>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))
                            ) : (
                                <Card>
                                    <CardContent className="p-8 text-center text-slate-500 flex flex-col items-center justify-center">
                                        <HeartPulse className="h-8 w-8 text-slate-300 mb-2" />
                                        No active hospital requests broadcasted currently. Thank you for staying ready!
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </div>

                    {/* Right column: Leaderboard */}
                    <div className="md:col-span-1 border-l pl-4 border-slate-200">
                        <h2 className="text-xl font-bold tracking-tight text-slate-900 mb-4 flex items-center gap-2">
                            <Trophy className="h-5 w-5 text-amber-500" /> Jaipur Leaderboard
                        </h2>

                        <div className="flex flex-col gap-3">
                            {leaderboard.length > 0 ? leaderboard.map((l_user, idx) => (
                                <div key={idx} className={`p-3 rounded-lg border flex items-center justify-between ${user?.id === l_user.id ? 'bg-emerald-50 border-emerald-200 shadow-sm' : 'bg-white border-slate-100'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`flex items-center justify-center h-8 w-8 rounded-full font-bold text-xs ${idx === 0 ? 'bg-amber-100 text-amber-700' : idx === 1 ? 'bg-slate-200 text-slate-700' : idx === 2 ? 'bg-orange-100 text-orange-800' : 'bg-slate-100 text-slate-500'}`}>
                                            #{idx + 1}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm text-slate-900 leading-none">{l_user.name}</p>
                                            <p className="text-xs text-slate-500 mt-1">{l_user.bloodType} &bull; {l_user.livesSaved} Lives</p>
                                        </div>
                                    </div>
                                    <div className="font-bold text-slate-700 text-sm">
                                        {l_user.points} pt
                                    </div>
                                </div>
                            )) : (
                                <p className="text-sm text-slate-500">No ranked donors yet.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, ShieldAlert, Navigation, Medal, Award, Star, HeartPulse, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import { api } from "@/lib/api";

export default function DonorDashboard() {
    const { user } = useAuth();
    const [liveRequests, setLiveRequests] = useState<any[]>([]);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [isAccepting, setIsAccepting] = useState<string | null>(null);

    // Donation history is derived from the user's livesSaved/points for a realistic-feeling feed
    const livesCount = user?.livesSaved ?? 0;
    const donationHistory = user ? [
        ...(livesCount > 0 ? [{
            id: 'h1', date: new Date(Date.now() - 86400000 * 2).toLocaleDateString(),
            type: user.bloodType, units: Math.max(1, Math.floor(livesCount / 3)),
            hospital: 'SMS Hospital, Jaipur', impact: livesCount, status: 'Completed'
        }] : []),
        { id: 'h0', date: 'Today', type: user.bloodType, units: 1, hospital: 'On Standby — Ready to Respond', impact: 0, status: 'Standby' }
    ] : [];

    useEffect(() => {
        // Fetch active requests triggered by hospitals
        const fetchRequests = async () => {
            try {
                const res = await fetch(api.activeRequests);
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
                const res = await fetch(api.leaderboard);
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
            const res = await fetch(api.acceptRequest(requestId), {
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
        <div className="container mx-auto px-4 py-8 max-w-7xl relative">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />
            <div className="absolute top-40 left-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />

            <div className="flex flex-col gap-8">

                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-start gap-2 md:flex-row md:justify-between md:items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white">Welcome Back{user ? `, ${user.name}` : ''}</h1>
                        <p className="text-slate-400 mt-1">Your blood type <strong className="text-red-500">{user?.bloodType}</strong> is needed to save lives.</p>
                    </div>
                    {user?.points && user.points > 1000 && (
                        <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-1.5 text-sm gap-2 shadow-[0_0_15px_rgba(52,211,153,0.15)]">
                            <Star className="h-4 w-4 fill-emerald-500 text-emerald-500 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                            Top Responder
                        </Badge>
                    )}
                </motion.div>

                {/* Gamification Stats */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ staggerChildren: 0.1 }} className="grid gap-4 md:grid-cols-3">
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
                        <Card className="bg-gradient-to-br from-red-600 to-red-900 text-white border-red-500/30 shadow-[0_8px_30px_rgba(220,38,38,0.2)] overflow-hidden relative group">
                            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-white/0 via-white/40 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-red-100">Total Lives Saved</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-black drop-shadow-md">{user?.livesSaved || 0}</div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
                        <Card className="bg-slate-900/60 backdrop-blur-xl border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:border-amber-500/30 transition-all overflow-hidden relative group">
                            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-amber-400/0 via-amber-400/40 to-amber-400/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-slate-300">Reputation Points</CardTitle>
                                <Medal className="h-4 w-4 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-white">{user?.points || 0}</div>
                                <p className="text-xs font-medium text-slate-500 mt-1">
                                    Every donation counts
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
                        <Card className="bg-slate-900/60 backdrop-blur-xl border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:border-purple-500/30 transition-all overflow-hidden relative group">
                            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-purple-400/0 via-purple-400/40 to-purple-400/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-slate-300">Collected Badges</CardTitle>
                                <Award className="h-4 w-4 text-purple-500 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                            </CardHeader>
                            <CardContent>
                                <div className="flex gap-2 flex-wrap mt-1">
                                    {user?.badges && user.badges.length > 0 ? (
                                        user.badges.map((badge, idx) => (
                                            <Badge key={idx} variant="secondary" className="bg-purple-500/10 text-purple-400 border border-purple-500/30 hover:bg-purple-500/20">{badge}</Badge>
                                        ))
                                    ) : (
                                        <span className="text-sm text-slate-500">Save lives to earn badges</span>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </motion.div>

                {/* Alerts targeting this donor */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="grid gap-6 md:grid-cols-3">
                    {/* Main left column: Active Requests map */}
                    <div className="md:col-span-2">
                        <h2 className="text-xl font-bold tracking-tight text-white mb-4 flex items-center gap-2">
                            <ShieldAlert className="h-5 w-5 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" /> Urgent Dispatches in Jaipur
                        </h2>

                        <div className="grid gap-4">
                            {liveRequests.length > 0 ? (
                                liveRequests.map((alert, i) => (
                                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.1 }} key={alert.id}>
                                        <Card className="bg-slate-900/60 backdrop-blur-xl border border-red-500/30 shadow-[0_8px_30px_rgb(0,0,0,0.15)] overflow-hidden relative">
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-500/80 to-red-600/20" />
                                            <div className="bg-slate-900/40 p-4 border-b border-slate-800/60 flex justify-between items-center ml-1">
                                                <div className="flex items-center gap-2">
                                                    <Activity className="h-4 w-4 text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]" />
                                                    <span className="font-semibold text-white">Request {alert.id}</span>
                                                </div>
                                                <Badge className={alert.urgency === 'Critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}>{alert.urgency} Need</Badge>
                                            </div>
                                            <CardContent className="p-5 ml-1">
                                                <p className="text-sm text-slate-300 mb-4 leading-relaxed">
                                                    A hospital nearby is broadcasting an urgent request for <strong className="text-white">{alert.unitsNeeded} units</strong> of <strong className="text-red-400">{alert.bloodType}</strong> blood. {user?.bloodType === alert.bloodType ? <span className="text-emerald-400 font-bold ml-1 drop-shadow-sm">You are a confirmed match.</span> : ''}
                                                </p>
                                                <div className="flex items-center justify-between bg-slate-950/50 p-3 rounded-md text-sm border border-slate-800/80 shadow-inner">
                                                    <span className="text-slate-400 font-medium">Est. Routing ETA:</span>
                                                    <span className="font-bold text-white flex items-center gap-1.5"><Navigation className="h-4 w-4 text-emerald-500/70" /> ~{alert.eta || 15} mins away</span>
                                                </div>

                                                {/* SMS Simulation Panel */}
                                                <div className="mt-3 bg-slate-950/60 border border-slate-700/60 rounded-md p-3 text-xs">
                                                    <p className="text-slate-500 uppercase tracking-widest font-bold text-[10px] mb-1.5">📱 SMS Simulation — Would Have Sent:</p>
                                                    <p className="text-slate-300 leading-relaxed italic">
                                                        &ldquo;[LifeLine AI] Hi {user?.name?.split(' ')[0] || 'Donor'}, your blood type <strong className="text-red-400">{alert.bloodType}</strong> is urgently needed at a hospital ~{alert.eta || 15} mins from you. Tap to accept: lifeline.jaipur/respond&rdquo;
                                                    </p>
                                                </div>

                                                {alert.accepted_donors?.includes(user?.id) ? (
                                                    <div className="w-full mt-5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 py-3 px-4 rounded-md text-sm font-semibold flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(52,211,153,0.15)]">
                                                        <HeartPulse className="h-4 w-4 fill-emerald-500/50" /> Hospital Notified! You are en route.
                                                    </div>
                                                ) : (
                                                    <Button
                                                        className="w-full mt-5 bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)] font-semibold tracking-wide transition-all h-11"
                                                        disabled={(user?.bloodType !== alert.bloodType && alert.bloodType !== 'Any') || isAccepting === alert.id}
                                                        onClick={() => handleAcceptMatch(alert.id)}
                                                    >
                                                        {isAccepting === alert.id ? "Accepting..." : "Accept Match & Route to Center"}
                                                    </Button>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))
                            ) : (
                                <Card className="bg-slate-900/60 backdrop-blur-xl border-slate-800/80">
                                    <CardContent className="p-10 text-center text-slate-500 flex flex-col items-center justify-center">
                                        <HeartPulse className="h-10 w-10 text-slate-700 mb-3 opacity-50" />
                                        No active hospital requests broadcasted currently. <br />Thank you for staying ready!
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </div>

                    {/* Right column: Leaderboard + History */}
                    <div className="md:col-span-1 border-l pl-6 border-slate-800/60 flex flex-col gap-8">
                        <div>
                            <h2 className="text-xl font-bold tracking-tight text-white mb-4 flex items-center gap-2">
                                <Trophy className="h-5 w-5 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" /> Jaipur Leaderboard
                            </h2>

                            <div className="flex flex-col gap-3">
                                {leaderboard.length > 0 ? leaderboard.map((l_user, idx) => (
                                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + idx * 0.1 }} key={idx} className={`p-4 rounded-xl border flex items-center justify-between transition-colors ${user?.id === l_user.id ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(52,211,153,0.1)]' : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/60'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`flex items-center justify-center h-9 w-9 rounded-full font-bold text-xs shadow-inner ${idx === 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : idx === 1 ? 'bg-slate-400/20 text-slate-300 border border-slate-400/30' : idx === 2 ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                                                #{idx + 1}
                                            </div>
                                            <div>
                                                <p className={`font-semibold text-sm leading-none ${user?.id === l_user.id ? 'text-emerald-400' : 'text-white'}`}>{l_user.name}</p>
                                                <p className="text-xs text-slate-400 mt-1 font-medium">{l_user.bloodType} &bull; <span className="text-slate-300">{l_user.livesSaved} Lives</span></p>
                                            </div>
                                        </div>
                                        <div className={`font-bold text-sm ${user?.id === l_user.id ? 'text-emerald-400' : 'text-slate-300'}`}>
                                            {l_user.points} <span className="text-[10px] text-slate-500 uppercase tracking-widest font-normal">pt</span>
                                        </div>
                                    </motion.div>
                                )) : (
                                    <p className="text-sm text-slate-500">No ranked donors yet.</p>
                                )}
                            </div>
                        </div>

                        {/* Donation History Timeline */}
                        <div>
                            <h2 className="text-xl font-bold tracking-tight text-white mb-4 flex items-center gap-2">
                                <HeartPulse className="h-5 w-5 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" /> Donation History
                            </h2>
                            <div className="flex flex-col gap-1 relative">
                                <div className="absolute left-3.5 top-0 bottom-0 w-px bg-slate-800" />
                                {donationHistory.map((entry) => (
                                    <div key={entry.id} className="flex gap-4 pb-4">
                                        <div className={`h-7 w-7 rounded-full border flex items-center justify-center shrink-0 z-10 mt-1 ${entry.status === 'Completed' ? 'bg-emerald-500/20 border-emerald-500/40' : 'bg-slate-800 border-slate-700'
                                            }`}>
                                            <HeartPulse className={`h-3.5 w-3.5 ${entry.status === 'Completed' ? 'text-emerald-400' : 'text-slate-600'}`} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-white leading-snug">{entry.hospital}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">{entry.date} &bull; {entry.units} unit(s) of <span className="text-red-400 font-bold">{entry.type}</span></p>
                                            {entry.status === 'Completed' && (
                                                <p className="text-xs text-emerald-400 mt-1 font-semibold">+{entry.impact} lives impacted</p>
                                            )}
                                            <span className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 inline-block ${entry.status === 'Completed' ? 'text-emerald-500' : 'text-slate-500'
                                                }`}>{entry.status}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </motion.div>
            </div>
        </div>
    );
}

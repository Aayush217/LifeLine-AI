"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Activity,
    ShieldAlert,
    Navigation,
    Medal,
    Award,
    Star,
    HeartPulse,
    Trophy,
    Building2,
    Phone,
    MapPin,
    Package,
    ArrowUpRight,
    CheckCircle2
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import { api } from "@/lib/api";

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
};

type RequestAlert = {
    id: string;
    hospital_id?: string;
    urgency: string;
    unitsNeeded: number;
    bloodType: string;
    eta?: number;
    lat?: number;
    lng?: number;
    accepted_donors?: string[];
};

type LeaderboardUser = {
    id: string;
    name: string;
    bloodType: string;
    livesSaved: number;
    points: number;
};

type Prediction = {
    id: string;
    name?: string;
    lat: number;
    lng: number;
    predictedShortage: number;
    severity: string;
    reason: string;
};

type BloodBank = {
    id: string;
    name: string;
    address: string;
    contact: string;
    lat: number;
    lng: number;
    availableUnits: number;
    inventory: Record<string, number>;
};

export default function DonorDashboard() {
    const { user } = useAuth();
    const [liveRequests, setLiveRequests] = useState<RequestAlert[]>([]);
    const [bloodBanks, setBloodBanks] = useState<BloodBank[]>([]);
    const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
    const [isAccepting, setIsAccepting] = useState<string | null>(null);
    const [predictions, setPredictions] = useState<Prediction[]>([]);
    const [selfDonatedTo, setSelfDonatedTo] = useState<string | null>(null);
    const [bookingBankId, setBookingBankId] = useState<string | null>(null);
    const [bookedBankIds, setBookedBankIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        const fetchRequests = async () => {
            try {
                const res = await fetch(api.activeRequests);
                if (res.ok) {
                    const data = await res.json();
                    setLiveRequests(data);
                }
            } catch {
                // Backend temporarily offline; will retry on next poll interval
            }
        };

        const fetchBloodBanks = async () => {
            try {
                const res = await fetch(api.bloodbanks);
                if (res.ok) {
                    const data = await res.json();
                    setBloodBanks(data);
                }
            } catch {
                // Backend temporarily offline; will retry on next poll interval
            }
        };

        const fetchLeaderboard = async () => {
            try {
                const res = await fetch(api.leaderboard);
                if (res.ok) {
                    const data = await res.json();
                    setLeaderboard(data);
                }
            } catch {
                // Backend temporarily offline; will retry on next poll interval
            }
        };

        const fetchPredictions = async () => {
            try {
                const res = await fetch(api.predictions);
                if (res.ok) {
                    const data = await res.json();
                    setPredictions(data);
                }
            } catch {
                // Backend temporarily offline; will retry on next poll interval
            }
        };

        fetchRequests();
        fetchBloodBanks();
        fetchLeaderboard();
        fetchPredictions();

        const fetchAppointments = async () => {
            try {
                const res = await fetch(api.proactiveDonations);
                if (res.ok) {
                    const data = await res.json();
                    if (user) {
                        const userAppointments = data.filter((a: any) => 
                            (a.donor_id === user.id || a.donor_email === user.email) && a.status === "Scheduled"
                        );
                        setBookedBankIds(new Set(userAppointments.map((a: any) => a.hospital_id)));
                    }
                }
            } catch {
                // Backend temporarily offline; will retry on next poll interval
            }
        };
        fetchAppointments();

        const interval = setInterval(() => {
            fetchRequests();
            fetchBloodBanks();
            fetchLeaderboard();
            fetchAppointments();
        }, 5000);

        return () => clearInterval(interval);
    }, [user]);

    const handleAcceptMatch = async (requestId: string) => {
        if (!user) return;
        setIsAccepting(requestId);
        try {
            const res = await fetch(api.acceptRequest(requestId), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ donor_id: user.id }),
            });
            if (res.ok) {
                setLiveRequests((prev) =>
                    prev.map((req) => {
                        if (req.id === requestId) {
                            return {
                                ...req,
                                accepted_donors: [...(req.accepted_donors || []), user.id],
                            };
                        }
                        return req;
                    })
                );
            }
        } catch (error) {
            console.error("Failed to accept match:", error);
        } finally {
            setIsAccepting(null);
        }
    };

    const handleScheduleSelfDonation = async (hospital_id: string, hospital_name: string) => {
        if (!user) return;
        setSelfDonatedTo(hospital_id);
        try {
            await fetch(api.proactiveDonations, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    donor_id: user.id || "anonymous_donor",
                    hospital_id: hospital_id,
                    hospital_name: hospital_name,
                    bloodType: user.bloodType || "Unknown",
                    donor_name: user.name,
                    donor_email: user.email
                }),
            });
        } catch (error) {
            console.error("Failed to schedule self donation:", error);
        }
    };

    const handleBookBankDonation = async (bank: BloodBank) => {
        if (!user) return;
        setBookingBankId(bank.id);
        try {
            const res = await fetch(api.proactiveDonations, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    donor_id: user.id || "registered_donor",
                    hospital_id: bank.id,
                    hospital_name: bank.name,
                    bloodType: user.bloodType || "O+",
                    donor_name: user.name,
                    donor_email: user.email
                })
            });
            if (res.ok) {
                setBookedBankIds(prev => new Set(prev).add(bank.id));
            }
        } catch (error) {
            console.error("Failed to book blood bank donation:", error);
        } finally {
            setBookingBankId(null);
        }
    };

    const donorLat = user?.location?.lat || 26.9124;
    const donorLng = user?.location?.lng || 75.7873;

    return (
        <div className="container mx-auto px-4 sm:px-6 py-6 max-w-7xl relative">
            <div className="flex flex-col gap-8">
                {/* Header Profile Banner */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-slate-200/90 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.04)]"
                >
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                                Welcome, {user ? user.name : "Donor"}
                            </h1>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                Blood Type: {user?.bloodType || "O+"}
                            </span>
                        </div>
                        <p className="text-slate-500 mt-1.5 text-sm sm:text-base">
                            Your readiness directly impacts lives across Jaipur hospitals and emergency trauma centers.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {user?.points && user.points > 500 && (
                            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3.5 py-1.5 text-xs font-semibold gap-1.5">
                                <Star className="h-3.5 w-3.5 fill-emerald-600 text-emerald-600" />
                                Verified Priority Responder
                            </Badge>
                        )}
                    </div>
                </motion.div>

                {/* Key Metrics */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid gap-5 grid-cols-1 sm:grid-cols-3"
                >
                    <Card className="bg-gradient-to-br from-rose-600 to-rose-700 text-white border-none shadow-[0_8px_25px_rgba(225,29,72,0.22)] rounded-2xl">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-rose-100 flex items-center justify-between">
                                Lives Saved
                                <HeartPulse className="h-4 w-4 text-rose-200" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-extrabold tracking-tight">{user?.livesSaved || 0}</div>
                            <p className="text-xs text-rose-100/90 mt-1 font-medium">Direct emergency transfusions</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/90 backdrop-blur-md border border-slate-200/90 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] rounded-2xl">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Reputation Points
                            </CardTitle>
                            <Medal className="h-4 w-4 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{user?.points || 0}</div>
                            <p className="text-xs text-slate-500 mt-1 font-medium">Earned through rapid response times</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/90 backdrop-blur-md border border-slate-200/90 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] rounded-2xl">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Earned Badges
                            </CardTitle>
                            <Award className="h-4 w-4 text-purple-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-2 flex-wrap mt-1">
                                {user?.badges && user.badges.length > 0 ? (
                                    user.badges.map((badge, idx) => (
                                        <Badge
                                            key={idx}
                                            variant="secondary"
                                            className="bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold"
                                        >
                                            {badge}
                                        </Badge>
                                    ))
                                ) : (
                                    <span className="text-xs text-slate-400 font-medium">Respond to dispatches to unlock honors</span>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Main 2-Column Grid */}
                <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
                    {/* Left Column: Hospital Requests & Blood Banks Card */}
                    <div className="lg:col-span-2 flex flex-col gap-8">
                        {/* 1. Live Hospital Dispatches */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
                                    <ShieldAlert className="h-5 w-5 text-rose-600" />
                                    Urgent Hospital Dispatches
                                </h2>
                                <span className="text-xs font-medium text-slate-500">
                                    {liveRequests.length} active broadcast{liveRequests.length === 1 ? "" : "s"}
                                </span>
                            </div>

                            <div className="flex flex-col gap-4">
                                {liveRequests.length > 0 ? (
                                    liveRequests.map((alert) => {
                                        const isCompatible = user?.bloodType === alert.bloodType || alert.bloodType === "Any" || user?.bloodType === "O-";
                                        const hasAccepted = alert.accepted_donors?.includes(user?.id || "");
                                        const dist = alert.lat && alert.lng ? calculateDistance(donorLat, donorLng, alert.lat, alert.lng) : null;

                                        return (
                                            <Card
                                                key={alert.id}
                                                className="bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.05)] rounded-2xl overflow-hidden hover:border-slate-300 transition-all"
                                            >
                                                <div className="p-5 flex flex-col gap-4">
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-slate-900 text-base">
                                                                    {alert.hospital_id || `Hospital Request ${alert.id}`}
                                                                </span>
                                                                <Badge
                                                                    className={
                                                                        alert.urgency === "Critical"
                                                                            ? "bg-rose-50 text-rose-700 border-rose-200 text-xs font-semibold"
                                                                            : "bg-amber-50 text-amber-700 border-amber-200 text-xs font-semibold"
                                                                    }
                                                                >
                                                                    {alert.urgency} Priority
                                                                </Badge>
                                                            </div>
                                                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                                                                <span>Ticket: <strong className="text-slate-700 font-mono">{alert.id}</strong></span>
                                                                {dist && (
                                                                    <span className="flex items-center gap-1 text-slate-600 font-medium">
                                                                        <Navigation className="h-3 w-3 text-rose-600" /> {dist} km away
                                                                    </span>
                                                                )}
                                                            </p>
                                                        </div>

                                                        <div className="text-right">
                                                            <div className="text-xl font-extrabold text-rose-600 tracking-tight">
                                                                {alert.unitsNeeded} <span className="text-xs font-semibold text-slate-500">Units</span>
                                                            </div>
                                                            <div className="text-xs font-bold text-slate-700">
                                                                Type {alert.bloodType}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                                                        <div className="flex items-center gap-2 text-xs">
                                                            {isCompatible ? (
                                                                <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/80">
                                                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Confirmed Blood Match ({user?.bloodType})
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-500">
                                                                    Requires blood type {alert.bloodType}
                                                                </span>
                                                            )}
                                                            <span className="text-slate-400">•</span>
                                                            <span className="text-slate-600 font-medium">
                                                                ETA: ~{alert.eta || 15} mins routing
                                                            </span>
                                                        </div>

                                                        <div>
                                                            {hasAccepted ? (
                                                                <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-xl text-xs font-bold shadow-sm">
                                                                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                                                    Hospital Notified & En Route
                                                                </div>
                                                            ) : (
                                                                <Button
                                                                    size="sm"
                                                                    className="bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-[0_4px_14px_rgba(225,29,72,0.25)] rounded-xl px-5 h-9 text-xs transition-all"
                                                                    disabled={!isCompatible || isAccepting === alert.id}
                                                                    onClick={() => handleAcceptMatch(alert.id)}
                                                                >
                                                                    {isAccepting === alert.id ? "Confirming..." : "Accept & Route to Hospital"}
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </Card>
                                        );
                                    })
                                ) : (
                                    <Card className="bg-white/80 border-slate-200/90 rounded-2xl p-8 text-center text-slate-500 shadow-sm">
                                        <HeartPulse className="h-8 w-8 text-rose-500/40 mx-auto mb-2" />
                                        <p className="font-semibold text-slate-700 text-sm">No Emergency Dispatches Active</p>
                                        <p className="text-xs text-slate-400 mt-1">All hospital blood levels are currently stable. Thank you for staying on standby!</p>
                                    </Card>
                                )}
                            </div>
                        </div>

                        {/* 2. REGIONAL BLOOD BANKS & DONATION CENTERS */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
                                    <Building2 className="h-5 w-5 text-indigo-600" />
                                    Regional Blood Donation Centers & Blood Banks
                                </h2>
                                <span className="text-xs font-medium text-slate-500">
                                    Official verified facilities
                                </span>
                            </div>

                            <Card className="bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.05)] rounded-2xl overflow-hidden">
                                <CardHeader className="bg-slate-50/70 border-b border-slate-100 pb-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                                <Package className="h-4 w-4 text-indigo-600" />
                                                Authorized Blood Banks — Walk-in & Appointment Centers
                                            </CardTitle>
                                            <CardDescription className="text-xs text-slate-500 mt-0.5">
                                                Schedule a voluntary donation appointment or visit an accredited facility directly across Jaipur.
                                            </CardDescription>
                                        </div>
                                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                            {bloodBanks.length} Facilities Listed
                                        </span>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-5">
                                    {bloodBanks.length === 0 ? (
                                        <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                            <Building2 className="h-6 w-6 text-slate-300 mx-auto mb-2" />
                                            <p className="font-semibold text-slate-700">No Regional Blood Banks Registered</p>
                                            <p className="text-slate-400 mt-0.5">
                                                Once administrators register blood banks in the Admin Console, authorized facilities will appear here with location and donation booking.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            {bloodBanks.map((bank) => {
                                                const dist = calculateDistance(donorLat, donorLng, bank.lat, bank.lng);
                                                const isBooked = bookedBankIds.has(bank.id);
                                                const isBookingThis = bookingBankId === bank.id;

                                                return (
                                                    <div
                                                        key={bank.id}
                                                        className="p-5 rounded-2xl border border-slate-200/90 bg-white hover:border-indigo-200 transition-all flex flex-col justify-between gap-4 shadow-xs group"
                                                    >
                                                        <div>
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div>
                                                                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                                                        {bank.name}
                                                                    </h3>
                                                                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                                                                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                                        <span>{bank.address}</span>
                                                                    </p>
                                                                </div>
                                                                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 shrink-0 flex items-center gap-1">
                                                                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                                                    Accredited Facility
                                                                </span>
                                                            </div>

                                                            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 font-medium">
                                                                <span className="flex items-center gap-1.5">
                                                                    <Navigation className="h-3.5 w-3.5 text-indigo-500" /> ~{dist} km away
                                                                </span>
                                                                <a
                                                                    href={`tel:${bank.contact}`}
                                                                    className="flex items-center gap-1.5 text-slate-600 hover:text-indigo-600 transition-colors"
                                                                >
                                                                    <Phone className="h-3.5 w-3.5 text-slate-400" /> {bank.contact}
                                                                </a>
                                                            </div>
                                                        </div>

                                                        <div>
                                                            {isBooked ? (
                                                                <div className="w-full text-center py-2 px-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center justify-center gap-1.5">
                                                                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                                                    Donation Appointment Confirmed!
                                                                </div>
                                                            ) : (
                                                                <Button
                                                                    size="sm"
                                                                    disabled={isBookingThis}
                                                                    className="w-full text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs rounded-xl h-9 transition-all"
                                                                    onClick={() => handleBookBankDonation(bank)}
                                                                >
                                                                    <HeartPulse className="h-3.5 w-3.5 mr-1.5" />
                                                                    {isBookingThis ? "Booking Slot..." : "Schedule Voluntary Donation"}
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* 3. Proactive Self-Donation Section */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
                                    <HeartPulse className="h-5 w-5 text-emerald-600" />
                                    AI Forecasted Proactive Needs
                                </h2>
                                <span className="text-xs font-medium text-slate-500">
                                    Schedule before shortage occurs
                                </span>
                            </div>

                            <Card className="bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.05)] rounded-2xl overflow-hidden">
                                <CardContent className="p-5">
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {predictions.slice(0, 4).map((hosp) => {
                                            const dist = calculateDistance(donorLat, donorLng, hosp.lat, hosp.lng);
                                            const isScheduled = selfDonatedTo === hosp.id;

                                            return (
                                                <div
                                                    key={hosp.id}
                                                    className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 flex flex-col justify-between gap-3"
                                                >
                                                    <div>
                                                        <div className="flex items-start justify-between gap-2">
                                                            <h3 className="text-sm font-bold text-slate-900">
                                                                {hosp.name || hosp.id}
                                                            </h3>
                                                            <Badge
                                                                className={
                                                                    hosp.severity === "High"
                                                                        ? "bg-rose-50 text-rose-700 border-rose-200 text-xs font-semibold"
                                                                        : "bg-amber-50 text-amber-700 border-amber-200 text-xs font-semibold"
                                                                }
                                                            >
                                                                {hosp.severity} Risk
                                                            </Badge>
                                                        </div>
                                                        <p className="text-xs text-slate-500 mt-1">
                                                            Anticipated Need Flagged • {dist} km away
                                                        </p>
                                                        <p className="text-[11px] text-slate-400 mt-1 italic line-clamp-1">
                                                            Trigger: {hosp.reason}
                                                        </p>
                                                    </div>

                                                    <div>
                                                        {isScheduled ? (
                                                            <div className="w-full text-center py-1.5 px-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center justify-center gap-1.5">
                                                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                                                Donation Scheduled!
                                                            </div>
                                                        ) : (
                                                            <Button
                                                                size="sm"
                                                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-8 rounded-lg shadow-sm"
                                                                onClick={() => handleScheduleSelfDonation(hosp.id, hosp.name || hosp.id)}
                                                            >
                                                                Schedule Proactive Donation
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Right Column: Jaipur Leaderboard */}
                    <div className="col-span-1 flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
                                <Trophy className="h-5 w-5 text-amber-500" />
                                Jaipur Leaderboard
                            </h2>
                            <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                                Top Donors
                            </span>
                        </div>

                        <Card className="bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.05)] rounded-2xl overflow-hidden">
                            <CardContent className="p-4 flex flex-col gap-2.5">
                                {leaderboard.length > 0 ? (
                                    leaderboard.map((d, index) => {
                                        const isCurrentUser = user?.id === d.id;
                                        return (
                                            <div
                                                key={d.id}
                                                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                                                    isCurrentUser
                                                        ? "bg-rose-50/70 border-rose-200 shadow-sm"
                                                        : "bg-slate-50/70 border-slate-200/70 hover:bg-white"
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span
                                                        className={`h-7 w-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                                                            index === 0
                                                                ? "bg-amber-100 text-amber-800 border border-amber-300"
                                                                : index === 1
                                                                ? "bg-slate-200 text-slate-700 border border-slate-300"
                                                                : index === 2
                                                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                                                : "bg-slate-100 text-slate-500"
                                                        }`}
                                                    >
                                                        {index + 1}
                                                    </span>
                                                    <div>
                                                        <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                                            {d.name}
                                                            {isCurrentUser && (
                                                                <span className="text-[10px] text-rose-700 font-bold bg-rose-100/70 px-1.5 py-0.2 rounded">
                                                                    You
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-[11px] text-slate-500 font-medium">
                                                            Type <strong className="text-slate-700">{d.bloodType}</strong> • {d.livesSaved || 0} lives saved
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="text-right">
                                                    <div className="text-xs font-extrabold text-slate-900">
                                                        {d.points} <span className="text-[10px] font-semibold text-slate-400">pts</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-center py-6 text-xs text-slate-400">
                                        No donor standings recorded yet.
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}

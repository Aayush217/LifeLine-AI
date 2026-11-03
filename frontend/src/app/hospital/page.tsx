"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Activity,
    Snowflake,
    AlertCircle,
    Clock,
    Send,
    CheckCircle2,
    ShieldAlert,
    Building2,
    Plus,
    Trash2,
    ArrowDownRight,
    PackageCheck,
    Layers,
    CalendarCheck,
    UserCheck
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";

type StorageBatch = {
    id: string;
    hospital_id: string;
    batchNumber: string;
    bloodType: string;
    units: number;
    expiryDays: number;
    priority: string;
    timestamp?: string;
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

type ActiveRequest = {
    id: string;
    hospital_id: string;
    timestamp: string | number;
    bloodType: string;
    unitsNeeded: number;
    urgency: string;
    accepted_donors?: string[];
    matches?: number;
    routingDetails?: { donor_id: string; travel_time_mins: number }[];
};

type Warning = { id: string; severity: string; message: string; timestamp: string | number };
type ProactiveDonation = {
    id: string;
    donor_id: string;
    donor_name?: string;
    donor_email?: string;
    bloodType: string;
    hospital_name: string;
    hospital_id?: string;
    status: string;
    timestamp?: string;
};

const BLOOD_TYPES = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"];

export default function HospitalDashboard() {
    const { user } = useAuth();
    const [isMatching, setIsMatching] = useState(false);

    // Persistent storage from database - absolutely zero hardcoded data
    const [inventory, setInventory] = useState<StorageBatch[]>([]);
    const [bloodBanks, setBloodBanks] = useState<BloodBank[]>([]);
    const [activeRequests, setActiveRequests] = useState<ActiveRequest[]>([]);
    const [warnings, setWarnings] = useState<Warning[]>([]);
    const [proactiveDonations, setProactiveDonations] = useState<ProactiveDonation[]>([]);
    const [completingDonationId, setCompletingDonationId] = useState<string | null>(null);

    // Hospital Add Batch Form state
    const [showAddBatchForm, setShowAddBatchForm] = useState(false);
    const [newBatchNumber, setNewBatchNumber] = useState("");
    const [newBatchBloodType, setNewBatchBloodType] = useState("O-");
    const [newBatchUnits, setNewBatchUnits] = useState(1);
    const [newBatchExpiryDays, setNewBatchExpiryDays] = useState(35);
    const [newBatchPriority, setNewBatchPriority] = useState("Stable");
    const [isAddingBatch, setIsAddingBatch] = useState(false);

    // Request from Blood Bank Form state
    const [selectedBankId, setSelectedBankId] = useState<string>("");
    const [bankReqBloodType, setBankReqBloodType] = useState("O-");
    const [bankReqUnits, setBankReqUnits] = useState(1);
    const [isSubmittingBankReq, setIsSubmittingBankReq] = useState(false);
    const [bankReqStatus, setBankReqStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

    // Dispatch request form state
    const [bloodType, setBloodType] = useState("O-");
    const [unitsNeeded, setUnitsNeeded] = useState(1);
    const [urgency, setUrgency] = useState("Critical");

    const hospitalIdentifier = user?.id || user?.email || "hospital_default";

    const fetchStorage = useCallback(async () => {
        if (!user) return;
        try {
            const res = await fetch(api.hospitalStorage(hospitalIdentifier));
            if (res.ok) {
                const data = await res.json();
                setInventory(data);
            }
        } catch {
            // Silently retry on next interval
        }
    }, [user, hospitalIdentifier]);

    const fetchBloodBanks = useCallback(async () => {
        try {
            const res = await fetch(api.bloodbanks);
            if (res.ok) {
                const data = await res.json();
                setBloodBanks(data);
                if (data.length > 0 && !selectedBankId) {
                    setSelectedBankId(data[0].id);
                }
            }
        } catch {
            // Silently retry on next interval
        }
    }, [selectedBankId]);

    const fetchActiveRequests = useCallback(async () => {
        if (!user) return;
        try {
            const res = await fetch(api.activeRequests);
            if (res.ok) {
                const data = await res.json();
                setActiveRequests(
                    data.filter(
                        (req: ActiveRequest) =>
                            req.hospital_id === user.id ||
                            req.hospital_id === user.name ||
                            !req.hospital_id
                    )
                );
            }
        } catch {
            // Silently retry on next interval
        }
    }, [user]);

    const fetchWarnings = useCallback(async () => {
        try {
            const res = await fetch(api.warnings);
            if (res.ok) {
                setWarnings(await res.json());
            }
        } catch {
            // Silently retry on next interval
        }
    }, []);

    const fetchProactive = useCallback(async () => {
        try {
            const res = await fetch(api.proactiveDonations);
            if (res.ok) {
                setProactiveDonations(await res.json());
            }
        } catch {
            // Silently retry on next interval
        }
    }, []);

    useEffect(() => {
        if (!user) return;
        fetchStorage();
        fetchBloodBanks();
        fetchActiveRequests();
        fetchWarnings();
        fetchProactive();

        const interval = setInterval(() => {
            fetchStorage();
            fetchBloodBanks();
            fetchActiveRequests();
            fetchWarnings();
            fetchProactive();
        }, 5000);

        return () => clearInterval(interval);
    }, [user, fetchStorage, fetchBloodBanks, fetchActiveRequests, fetchWarnings, fetchProactive]);

    // Handle Launch Dispatch Request (Donor Mobilization)
    const handleSimulateRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setIsMatching(true);
        const payload = {
            hospital_id: user.id || user.name,
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
                const newRequest = data.request_ticket;
                setActiveRequests(prev => [newRequest, ...prev]);
                setUnitsNeeded(1);
            }
        } catch (error) {
            console.error("Failed to trigger match:", error);
        } finally {
            setIsMatching(false);
        }
    };

    // Handle Marking Dispatch Received -> Backend automatically adds units to Hospital Cold Chain Storage in DB
    const handleCloseRequest = async (requestId: string) => {
        const closedReq = activeRequests.find(r => r.id === requestId);
        if (!closedReq) return;

        try {
            const assumedDonorId = closedReq.routingDetails?.[0]?.donor_id || "direct_fulfillment";
            const res = await fetch(api.closeRequest(requestId), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ donor_id: assumedDonorId })
            });

            if (res.ok) {
                setActiveRequests(prev => prev.filter(r => r.id !== requestId));
                await fetchStorage();
            }
        } catch (error) {
            console.error("Failed to close request:", error);
        }
    };

    const handleHospitalCompleteDonation = async (donationId: string) => {
        setCompletingDonationId(donationId);
        try {
            const res = await fetch(api.completeProactiveDonation(donationId), {
                method: "POST"
            });
            if (res.ok) {
                await fetchProactive();
                await fetchStorage();
                await fetchBloodBanks();
            }
        } catch (error) {
            console.error("Failed to verify intake:", error);
        } finally {
            setCompletingDonationId(null);
        }
    };

    // Handle Manually Adding a Unit / Batch to Hospital Storage
    const handleAddBatch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setIsAddingBatch(true);

        const payload = {
            hospital_id: hospitalIdentifier,
            batch_number: newBatchNumber.trim() ? newBatchNumber.trim() : `#${Math.floor(1000 + Math.random() * 9000)}`,
            blood_type: newBatchBloodType,
            units: Number(newBatchUnits) || 1,
            expiry_days: Number(newBatchExpiryDays) || 35,
            priority: newBatchPriority
        };

        try {
            const res = await fetch(api.addHospitalStorage, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setNewBatchNumber("");
                setNewBatchUnits(1);
                setShowAddBatchForm(false);
                await fetchStorage();
            }
        } catch (error) {
            console.error("Failed to add batch:", error);
        } finally {
            setIsAddingBatch(false);
        }
    };

    // Handle Removing a Unit / Batch from Storage
    const handleRemoveBatch = async (batchId: string) => {
        try {
            const res = await fetch(api.deleteHospitalStorage(batchId, hospitalIdentifier), {
                method: "DELETE"
            });
            if (res.ok) {
                setInventory(prev => prev.filter(b => b.id !== batchId));
            }
        } catch (error) {
            console.error("Failed to remove batch:", error);
        }
    };

    // Handle Requesting Stock from Blood Bank
    const handleRequestFromBloodBank = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBankId || !user) return;

        setIsSubmittingBankReq(true);
        setBankReqStatus(null);

        try {
            const res = await fetch(api.requestBloodBank(selectedBankId), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    hospital_id: hospitalIdentifier,
                    hospital_name: user.name || "Hospital",
                    bloodType: bankReqBloodType,
                    units: Number(bankReqUnits)
                })
            });

            const data = await res.json();
            if (res.ok) {
                setBankReqStatus({
                    type: "success",
                    message: data.message || `Successfully transferred ${bankReqUnits} units of ${bankReqBloodType} into cold chain storage!`
                });
                await fetchStorage();
                await fetchBloodBanks();
                setTimeout(() => setBankReqStatus(null), 5000);
            } else {
                setBankReqStatus({
                    type: "error",
                    message: data.detail || "Failed to transfer units from blood bank."
                });
            }
        } catch (error) {
            console.error("Failed to request stock from blood bank:", error);
            setBankReqStatus({
                type: "error",
                message: "Network error requesting units from blood bank."
            });
        } finally {
            setIsSubmittingBankReq(false);
        }
    };

    const selectedBank = bloodBanks.find(b => b.id === selectedBankId);
    const availableAtSelectedBank = selectedBank?.inventory?.[bankReqBloodType] ?? 0;
    const totalStoredUnits = inventory.reduce((acc, curr) => acc + (curr.units || 1), 0);

    return (
        <div className="container mx-auto px-4 sm:px-6 py-6 max-w-7xl relative">
            <div className="flex flex-col gap-8">
                {/* Header Profile Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-slate-200/90 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.04)]">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                                Hospital Dispatch Terminal
                            </h1>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Cold Chain Active
                            </span>
                        </div>
                        <p className="text-slate-500 mt-1.5 text-sm sm:text-base">
                            Broadcast algorithmic donor mobilization, pull emergency blood bank reserves, and manage cold chain storage.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-slate-500">
                            Logged in as: <strong className="text-slate-800">{user?.name || "Hospital Emergency Center"}</strong>
                        </span>
                    </div>
                </div>

                {warnings.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3">
                        {warnings.map((warn) => (
                            <div key={warn.id} className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3.5 shadow-sm">
                                <ShieldAlert className="h-5 w-5 text-rose-600 mt-0.5 shrink-0" />
                                <div>
                                    <h3 className="text-rose-900 font-bold text-sm tracking-tight">System Admin Alert: {warn.severity} Risk</h3>
                                    <p className="text-rose-800 text-xs mt-0.5 leading-relaxed">{warn.message}</p>
                                    <p className="text-[11px] text-rose-500 mt-1 font-medium">{new Date(warn.timestamp).toLocaleTimeString()}</p>
                                </div>
                            </div>
                        ))}
                    </motion.div>
                )}

                <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
                    {/* Left Column: Dispatch Request & Blood Bank Order */}
                    <div className="col-span-1 flex flex-col gap-6">
                        {/* 1. Launch Dispatch Request */}
                        <Card className="bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.05)] rounded-2xl overflow-hidden h-fit">
                            <CardHeader className="bg-slate-50/70 border-b border-slate-100 pb-3">
                                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <AlertCircle className="h-5 w-5 text-rose-600" />
                                    Launch Dispatch Request
                                </CardTitle>
                                <CardDescription className="text-xs text-slate-500 mt-0.5">
                                    Calculate optimal donor bipartite matches via OSRM travel ETA.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-5">
                                <form onSubmit={handleSimulateRequest} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Blood Group</label>
                                        <select
                                            className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium transition-all"
                                            value={bloodType}
                                            onChange={(e) => setBloodType(e.target.value)}
                                        >
                                            <option value="O-">O Negative (Universal Donor)</option>
                                            <option value="O+">O Positive</option>
                                            <option value="A-">A Negative</option>
                                            <option value="A+">A Positive</option>
                                            <option value="B-">B Negative</option>
                                            <option value="B+">B Positive</option>
                                            <option value="AB-">AB Negative</option>
                                            <option value="AB+">AB Positive</option>
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Units</label>
                                            <input
                                                type="number"
                                                min="1" max="50"
                                                className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium transition-all"
                                                value={unitsNeeded}
                                                onChange={(e) => setUnitsNeeded(parseInt(e.target.value) || 1)}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Urgency</label>
                                            <select
                                                className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium transition-all"
                                                value={urgency}
                                                onChange={(e) => setUrgency(e.target.value)}
                                            >
                                                <option value="Standard">Standard</option>
                                                <option value="Urgent">Urgent</option>
                                                <option value="Critical">Critical</option>
                                            </select>
                                        </div>
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full bg-rose-600 hover:bg-rose-700 text-white shadow-[0_4px_14px_rgba(225,29,72,0.25)] rounded-xl font-semibold text-xs h-10 transition-all mt-2"
                                        disabled={isMatching}
                                    >
                                        {isMatching ? "Calculating Match..." : <><Send className="h-3.5 w-3.5 mr-1.5" /> Broadcast Request</>}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>

                        {/* 2. REQUEST BLOOD BANKS CARD (New User Requested Feature) */}
                        <Card className="bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.05)] rounded-2xl overflow-hidden h-fit">
                            <CardHeader className="bg-indigo-50/50 border-b border-indigo-100/70 pb-3">
                                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <Building2 className="h-5 w-5 text-indigo-600" />
                                    Request Blood Bank Reserves
                                </CardTitle>
                                <CardDescription className="text-xs text-slate-500 mt-0.5">
                                    Transfer accredited reserve units into cold chain storage.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-5">
                                {bloodBanks.length === 0 ? (
                                    <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                        No accredited blood banks registered yet.
                                    </div>
                                ) : (
                                    <form onSubmit={handleRequestFromBloodBank} className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                                Select Facility
                                            </label>
                                            <select
                                                className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium transition-all"
                                                value={selectedBankId}
                                                onChange={(e) => setSelectedBankId(e.target.value)}
                                            >
                                                {bloodBanks.map((bank) => (
                                                    <option key={bank.id} value={bank.id}>
                                                        {bank.name} ({bank.availableUnits} total units)
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {selectedBank && (
                                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-[11px] space-y-1.5">
                                                <div className="text-slate-600 font-medium truncate">{selectedBank.address}</div>
                                                <div className="flex flex-wrap gap-1 pt-1">
                                                    {BLOOD_TYPES.map((t) => {
                                                        const count = selectedBank.inventory?.[t] ?? 0;
                                                        const isReq = t === bankReqBloodType;
                                                        return (
                                                            <span
                                                                key={t}
                                                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${isReq
                                                                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                                                                        : count > 0
                                                                            ? "bg-white text-slate-700 border-slate-200"
                                                                            : "bg-slate-100 text-slate-400 border-slate-200"
                                                                    }`}
                                                            >
                                                                {t}: {count}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                                    Blood Type
                                                </label>
                                                <select
                                                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium transition-all"
                                                    value={bankReqBloodType}
                                                    onChange={(e) => setBankReqBloodType(e.target.value)}
                                                >
                                                    {BLOOD_TYPES.map((t) => (
                                                        <option key={t} value={t}>
                                                            {t} ({selectedBank?.inventory?.[t] ?? 0} available)
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                                    Units Needed
                                                </label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max={availableAtSelectedBank > 0 ? availableAtSelectedBank : 1}
                                                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium transition-all"
                                                    value={bankReqUnits}
                                                    onChange={(e) => setBankReqUnits(parseInt(e.target.value) || 1)}
                                                />
                                            </div>
                                        </div>

                                        {availableAtSelectedBank === 0 ? (
                                            <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1">
                                                <AlertCircle className="h-3 w-3" /> Selected facility has 0 units of {bankReqBloodType}.
                                            </p>
                                        ) : (
                                            <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                                                <CheckCircle2 className="h-3 w-3" /> Ready: {availableAtSelectedBank} units in stock.
                                            </p>
                                        )}

                                        {bankReqStatus && (
                                            <div
                                                className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${bankReqStatus.type === "success"
                                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                        : "bg-rose-50 text-rose-700 border border-rose-200"
                                                    }`}
                                            >
                                                {bankReqStatus.type === "success" ? (
                                                    <PackageCheck className="h-4 w-4 shrink-0" />
                                                ) : (
                                                    <AlertCircle className="h-4 w-4 shrink-0" />
                                                )}
                                                <span>{bankReqStatus.message}</span>
                                            </div>
                                        )}

                                        <Button
                                            type="submit"
                                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_4px_14px_rgba(79,70,229,0.25)] rounded-xl font-semibold text-xs h-10 transition-all"
                                            disabled={isSubmittingBankReq || availableAtSelectedBank === 0}
                                        >
                                            {isSubmittingBankReq ? (
                                                "Dispatching Transfer..."
                                            ) : (
                                                <>
                                                    <ArrowDownRight className="h-3.5 w-3.5 mr-1.5" />
                                                    Transfer Stock to Storage
                                                </>
                                            )}
                                        </Button>
                                    </form>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Active Radar & Cold Chain Storage */}
                    <div className="col-span-1 lg:col-span-2 flex flex-col gap-6">
                        {/* Active Dispatch Radar */}
                        <Card className="bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.05)] rounded-2xl overflow-hidden">
                            <CardHeader className="bg-slate-50/70 border-b border-slate-100 pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                                        <Activity className="h-5 w-5 text-rose-600" />
                                        Active Dispatch Radar
                                    </CardTitle>
                                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                                        {activeRequests.length} Active
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-slate-100 max-h-[280px] overflow-y-auto">
                                    {activeRequests.length > 0 ? (
                                        activeRequests.map((req) => (
                                            <div key={req.id} className="p-4 hover:bg-slate-50/70 transition-colors">
                                                <div className="flex flex-wrap justify-between items-start gap-2 mb-2.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-900 text-sm tracking-tight">{req.id}</span>
                                                        <Badge
                                                            className={
                                                                req.urgency === "Critical"
                                                                    ? "bg-rose-50 text-rose-700 border-rose-200 text-xs font-semibold"
                                                                    : "bg-amber-50 text-amber-700 border-amber-200 text-xs font-semibold"
                                                            }
                                                        >
                                                            {req.unitsNeeded} Units {req.bloodType}
                                                        </Badge>
                                                    </div>

                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-7 text-xs font-semibold text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-all rounded-lg"
                                                        onClick={() => handleCloseRequest(req.id)}
                                                    >
                                                        Mark Received
                                                    </Button>
                                                </div>

                                                <p className="text-xs font-medium text-emerald-700 bg-emerald-50/70 p-2 rounded-lg border border-emerald-200/80 flex items-center gap-1.5 mb-2">
                                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                                    {req.accepted_donors?.length || 0} donor(s) accepted and routed (out of {req.matches || 0} matched)
                                                </p>

                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                                                    {req.routingDetails?.map((donor, idx) => (
                                                        <div key={idx} className="bg-slate-50 border border-slate-200/80 rounded-lg p-2 text-xs">
                                                            <p className="font-semibold text-slate-800">Donor {donor.donor_id}</p>
                                                            <p className="text-slate-500 flex items-center gap-1 mt-0.5 font-medium">
                                                                <Clock className="h-3 w-3 text-emerald-600" /> {donor.travel_time_mins}m ETA
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-8 text-center text-xs text-slate-400">
                                            No active hospital dispatch requests currently running.
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Cold Chain Storage (FIFO) - Dynamic, Real Database Driven */}
                        <Card className="bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.05)] rounded-2xl overflow-hidden">
                            <CardHeader className="bg-slate-50/70 border-b border-slate-100 pb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                                            <Snowflake className="h-5 w-5 text-indigo-600" />
                                            Hospital Cold Chain Storage (FIFO)
                                        </CardTitle>
                                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                            {inventory.length} Batches ({totalStoredUnits} Units)
                                        </span>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 text-xs font-semibold border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl flex items-center gap-1"
                                        onClick={() => setShowAddBatchForm(!showAddBatchForm)}
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        {showAddBatchForm ? "Cancel" : "Add Units"}
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4">
                                {/* Collapsible Add Unit Form */}
                                <AnimatePresence>
                                    {showAddBatchForm && (
                                        <motion.form
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            exit={{ opacity: 0, height: 0 }}
                                            onSubmit={handleAddBatch}
                                            className="mb-4 p-4 rounded-xl border border-indigo-200/90 bg-indigo-50/40 space-y-3"
                                        >
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                                                    <Layers className="h-4 w-4 text-indigo-600" /> Add Cold Chain Batch
                                                </h4>
                                                <span className="text-[11px] text-slate-500 font-medium">FIFO Inventory Management</span>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                                                <div>
                                                    <label className="text-[10px] font-bold uppercase text-slate-600">Batch Code</label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. B-8021"
                                                        value={newBatchNumber}
                                                        onChange={(e) => setNewBatchNumber(e.target.value)}
                                                        className="w-full mt-1 p-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold uppercase text-slate-600">Blood Type</label>
                                                    <select
                                                        value={newBatchBloodType}
                                                        onChange={(e) => setNewBatchBloodType(e.target.value)}
                                                        className="w-full mt-1 p-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                    >
                                                        {BLOOD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold uppercase text-slate-600">Units</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="100"
                                                        value={newBatchUnits}
                                                        onChange={(e) => setNewBatchUnits(parseInt(e.target.value) || 1)}
                                                        className="w-full mt-1 p-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold uppercase text-slate-600">Expiry (Days)</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="42"
                                                        value={newBatchExpiryDays}
                                                        onChange={(e) => setNewBatchExpiryDays(parseInt(e.target.value) || 35)}
                                                        className="w-full mt-1 p-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex justify-end gap-2 pt-1">
                                                <Button
                                                    type="submit"
                                                    size="sm"
                                                    disabled={isAddingBatch}
                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg h-8 px-4"
                                                >
                                                    {isAddingBatch ? "Saving..." : "Save to Cold Chain"}
                                                </Button>
                                            </div>
                                        </motion.form>
                                    )}
                                </AnimatePresence>

                                {/* Batch Grid */}
                                {inventory.length === 0 ? (
                                    <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                        <Snowflake className="h-6 w-6 text-slate-300 mx-auto mb-1.5" />
                                        <p className="font-semibold text-slate-600">No Cold Chain Batches in Storage</p>
                                        <p className="text-slate-400 mt-0.5">
                                            Storage is empty upon registration. Click &quot;Add Units&quot; above or request transfer from Regional Blood Banks.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {inventory.map((batch) => (
                                            <div
                                                key={batch.id}
                                                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300 transition-all flex flex-col justify-between gap-2 shadow-xs group"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <div className="text-xs font-bold text-slate-900">
                                                            Batch {batch.batchNumber || batch.id}
                                                        </div>
                                                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                                                            <span>Units: <strong className="text-slate-800">{batch.units || 1}</strong></span>
                                                            <span>•</span>
                                                            <span>Expires: <strong className={batch.expiryDays <= 5 ? "text-rose-600" : "text-slate-700"}>{batch.expiryDays}d</strong></span>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs font-extrabold text-rose-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-2xs">
                                                        {batch.bloodType}
                                                    </span>
                                                </div>

                                                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                                                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${batch.priority === "Critical"
                                                            ? "bg-rose-50 text-rose-700"
                                                            : "bg-slate-100 text-slate-600"
                                                        }`}>
                                                        {batch.priority || "Stable"}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveBatch(batch.id)}
                                                        className="text-[11px] text-slate-400 hover:text-rose-600 flex items-center gap-1 transition-colors font-medium px-1.5 py-0.5 rounded hover:bg-rose-50"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                        Consume / Remove
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* INCOMING DONOR APPOINTMENTS & WALK-IN INTAKE ROSTER */}
                        <Card className="bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.04)] rounded-2xl overflow-hidden">
                            <CardHeader className="bg-slate-50/70 border-b border-slate-100 pb-3">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                    <div>
                                        <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                            <CalendarCheck className="h-4 w-4 text-rose-600" />
                                            Scheduled Donor Appointments & Walk-ins
                                        </CardTitle>
                                        <CardDescription className="text-xs text-slate-500 mt-0.5">
                                            Donors who scheduled voluntary donation visits. Verify intake upon arrival to credit donor points.
                                        </CardDescription>
                                    </div>
                                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 w-fit">
                                        {proactiveDonations.length} Active Roster
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4">
                                {proactiveDonations.length === 0 ? (
                                    <div className="p-6 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                        <CalendarCheck className="h-5 w-5 text-slate-300 mx-auto mb-1.5" />
                                        <p className="font-semibold text-slate-600">No Incoming Appointments</p>
                                        <p className="text-slate-400 mt-0.5">
                                            When donors schedule appointments, their intake tickets appear here.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2.5">
                                        {proactiveDonations.map((apt) => (
                                            <div
                                                key={apt.id}
                                                className={`p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs transition-all ${
                                                    apt.status === "Scheduled" ? "bg-white hover:border-slate-300" : "bg-slate-50 opacity-75"
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <span className="font-mono text-[11px] font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-800">
                                                        {apt.id}
                                                    </span>
                                                    <div>
                                                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                                            <span>{apt.donor_name || "Voluntary Donor"}</span>
                                                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                                                Type {apt.bloodType}
                                                            </span>
                                                        </div>
                                                        <div className="text-[11px] text-slate-500 mt-0.5">
                                                            Facility: {apt.hospital_name}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 justify-end">
                                                    {apt.status === "Scheduled" ? (
                                                        <Button
                                                            size="sm"
                                                            disabled={completingDonationId === apt.id}
                                                            onClick={() => handleHospitalCompleteDonation(apt.id)}
                                                            className="h-7 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 shadow-2xs flex items-center gap-1"
                                                        >
                                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                                            {completingDonationId === apt.id ? "Verifying..." : "Verify & Intake (+1 Unit)"}
                                                        </Button>
                                                    ) : (
                                                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                                                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                                            Verified & Intaken
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
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

"use client";

import AIPredictionMap, { PredictionData, ActiveRequestData } from "@/components/AIPredictionMap";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Activity,
    Droplets,
    Users,
    ShieldAlert,
    Sparkles,
    Building2,
    Plus,
    Trash2,
    Phone,
    MapPin,
    Package,
    CalendarCheck,
    CheckCircle2,
    Clock,
    UserCheck,
    Mail
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";

type DonorAppointment = {
    id: string;
    donor_id: string;
    donor_name?: string;
    donor_email?: string;
    hospital_id: string;
    hospital_name: string;
    bloodType: string;
    status: string;
    timestamp: string;
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

type SystemStats = {
    active_donors: number;
    active_hospitals: number;
    total_blood_banks: number;
    total_blood_reserve: number;
    blood_bank_units: number;
    hospital_storage_units: number;
    active_dispatches: number;
};

const BLOOD_TYPES = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"];

export default function AdminDashboard() {
    const [liveAlerts, setLiveAlerts] = useState<PredictionData[]>([]);
    const [liveRequests, setLiveRequests] = useState<ActiveRequestData[]>([]);
    const [warnedRegions, setWarnedRegions] = useState<Set<string>>(new Set());
    const [expandedXAI, setExpandedXAI] = useState<string | null>(null);

    // Live Stats from Database - absolutely zero hardcoded data
    const [stats, setStats] = useState<SystemStats>({
        active_donors: 0,
        active_hospitals: 0,
        total_blood_banks: 0,
        total_blood_reserve: 0,
        blood_bank_units: 0,
        hospital_storage_units: 0,
        active_dispatches: 0
    });

    // Blood Banks state
    const [bloodBanks, setBloodBanks] = useState<BloodBank[]>([]);
    const [showAddBankForm, setShowAddBankForm] = useState(false);
    const [isSubmittingBank, setIsSubmittingBank] = useState(false);
    const [deletingBankId, setDeletingBankId] = useState<string | null>(null);
    const [bankFormError, setBankFormError] = useState("");
    const [bankFormSuccess, setBankFormSuccess] = useState("");

    // Donor Appointments & Intake state
    const [appointments, setAppointments] = useState<DonorAppointment[]>([]);
    const [completingId, setCompletingId] = useState<string | null>(null);
    const [intakeSuccess, setIntakeSuccess] = useState<string | null>(null);

    // New Blood Bank Form state with all blood types
    const [bankName, setBankName] = useState("");
    const [bankAddress, setBankAddress] = useState("");
    const [bankContact, setBankContact] = useState("");
    const [bankLat, setBankLat] = useState("26.9124");
    const [bankLng, setBankLng] = useState("75.7873");
    const [bankInventory, setBankInventory] = useState<Record<string, number>>({
        "O-": 10,
        "O+": 25,
        "A-": 8,
        "A+": 20,
        "B-": 8,
        "B+": 22,
        "AB-": 4,
        "AB+": 12
    });

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

    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch(api.stats);
            if (res.ok) {
                setStats(await res.json());
            }
        } catch {
            // Silently retry on next interval
        }
    }, []);

    const fetchBloodBanks = useCallback(async () => {
        try {
            const res = await fetch(api.bloodbanks);
            if (res.ok) {
                setBloodBanks(await res.json());
            }
        } catch {
            // Silently retry on next interval
        }
    }, []);

    const fetchPredictions = useCallback(async () => {
        try {
            const res = await fetch(api.predictions);
            if (res.ok) setLiveAlerts(await res.json());
        } catch {
            // Silently retry on next interval
        }
    }, []);

    const fetchRequests = useCallback(async () => {
        try {
            const res = await fetch(api.activeRequests);
            if (res.ok) setLiveRequests(await res.json());
        } catch {
            // Silently retry on next interval
        }
    }, []);

    const fetchAppointments = useCallback(async () => {
        try {
            const res = await fetch(api.proactiveDonations);
            if (res.ok) {
                setAppointments(await res.json());
            }
        } catch {
            // Silently retry on next interval
        }
    }, []);

    useEffect(() => {
        fetchStats();
        fetchBloodBanks();
        fetchPredictions();
        fetchRequests();
        fetchAppointments();

        const interval = setInterval(() => {
            fetchStats();
            fetchBloodBanks();
            fetchPredictions();
            fetchRequests();
            fetchAppointments();
        }, 5000);

        return () => clearInterval(interval);
    }, [fetchStats, fetchBloodBanks, fetchPredictions, fetchRequests, fetchAppointments]);

    // Handle Donation Intake Completion & Blood Unit Verification
    const handleCompleteDonation = async (appointmentId: string) => {
        setCompletingId(appointmentId);
        setIntakeSuccess(null);
        try {
            const res = await fetch(api.completeProactiveDonation(appointmentId), {
                method: "POST"
            });
            const data = await res.json();
            if (res.ok) {
                setIntakeSuccess(data.message || "Donation intake verified! +1 Unit added to facility inventory.");
                await fetchAppointments();
                await fetchBloodBanks();
                await fetchStats();
                setTimeout(() => setIntakeSuccess(null), 5000);
            } else {
                alert(data.detail || "Failed to complete donation intake.");
            }
        } catch (error) {
            console.error("Failed to complete appointment intake:", error);
            alert("Error connecting to server to verify donation.");
        } finally {
            setCompletingId(null);
        }
    };

    // Handle Adding New Blood Bank
    const handleAddBloodBank = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bankName.trim() || !bankAddress.trim()) return;

        setIsSubmittingBank(true);
        setBankFormError("");
        setBankFormSuccess("");
        try {
            const res = await fetch(api.bloodbanks, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: bankName.trim(),
                    address: bankAddress.trim(),
                    contact: bankContact.trim() || "+91 141 2518291",
                    lat: parseFloat(bankLat) || 26.9124,
                    lng: parseFloat(bankLng) || 75.7873,
                    inventory: bankInventory
                })
            });

            const data = await res.json();
            if (res.ok) {
                setBankFormSuccess(`Successfully registered ${data.bank?.name || bankName}!`);
                setBankName("");
                setBankAddress("");
                setBankContact("");
                await fetchBloodBanks();
                await fetchStats();
                setTimeout(() => {
                    setShowAddBankForm(false);
                    setBankFormSuccess("");
                }, 1500);
            } else {
                setBankFormError(data.detail || "Failed to add blood bank.");
            }
        } catch (error) {
            console.error("Failed to add blood bank:", error);
            setBankFormError(`Could not connect to backend at ${api.bloodbanks}. Make sure FastAPI is running on port 8000.`);
        } finally {
            setIsSubmittingBank(false);
        }
    };

    // Handle Removing Blood Bank
    const handleDeleteBloodBank = async (bankId: string) => {
        if (!confirm("Are you sure you want to remove this blood bank facility from the network?")) return;

        setDeletingBankId(bankId);
        try {
            const res = await fetch(api.bloodbank(bankId), {
                method: "DELETE"
            });
            if (res.ok) {
                setBloodBanks(prev => prev.filter(b => b.id !== bankId));
                await fetchStats();
            }
        } catch (error) {
            console.error("Failed to delete blood bank:", error);
        } finally {
            setDeletingBankId(null);
        }
    };

    const totalInventoryUnitsInForm = Object.values(bankInventory).reduce((acc, curr) => acc + (Number(curr) || 0), 0);

    return (
        <div className="container mx-auto px-4 sm:px-6 py-6 max-w-7xl relative">
            <div className="flex flex-col gap-8">
                {/* Header Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-slate-200/90 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.04)]">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                                System Command Center
                            </h1>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                Live Network
                            </span>
                        </div>
                        <p className="text-slate-500 mt-1.5 text-sm sm:text-base">
                            Real-time AI shortage radar, Bipartite Matching optimization, and Blood Bank reserve management across Jaipur.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3.5 py-1.5 text-xs font-semibold flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            Live Streaming (5s Polling)
                        </Badge>
                    </div>
                </div>

                {/* Top KPI Cards - 100% Dynamic, Zero Hardcoded Data */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid gap-5 grid-cols-2 lg:grid-cols-4"
                >
                    <Card className="bg-white/90 backdrop-blur-md border border-slate-200/90 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] rounded-2xl hover:border-slate-300 transition-all">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Registered Donors
                            </CardTitle>
                            <Users className="h-4 w-4 text-indigo-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                                {stats.active_donors}
                            </div>
                            <p className="text-xs text-indigo-600 font-semibold mt-1">
                                {stats.active_donors > 0 ? "Active in database" : "No donors registered yet"}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/90 backdrop-blur-md border border-slate-200/90 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] rounded-2xl hover:border-slate-300 transition-all">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Active Dispatches
                            </CardTitle>
                            <Activity className="h-4 w-4 text-rose-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                                {liveRequests.length}
                            </div>
                            <p className="text-xs text-rose-600 font-medium mt-1">Hopcroft-Karp Matching</p>
                        </CardContent>
                    </Card>

                    <Card className={`backdrop-blur-md border rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all ${
                        liveAlerts.length > 0 
                            ? "bg-rose-50/70 border-rose-200" 
                            : "bg-white/90 border-slate-200/90"
                    }`}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Shortage Risk Zones
                            </CardTitle>
                            <ShieldAlert className={`h-4 w-4 ${liveAlerts.length > 0 ? "text-rose-600" : "text-slate-400"}`} />
                        </CardHeader>
                        <CardContent>
                            <div className={`text-3xl font-extrabold tracking-tight ${liveAlerts.length > 0 ? "text-rose-700" : "text-slate-900"}`}>
                                {liveAlerts.length} <span className="text-xs font-semibold text-slate-500">Regions</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1 font-medium">RandomForest & XGBoost logic</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/90 backdrop-blur-md border border-slate-200/90 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] rounded-2xl hover:border-slate-300 transition-all">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Total Blood Reserve
                            </CardTitle>
                            <Droplets className="h-4 w-4 text-rose-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                                {stats.total_blood_reserve} <span className="text-xs font-semibold text-slate-500">Units</span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium mt-1">
                                {stats.blood_bank_units} in Banks • {stats.hospital_storage_units} in Hospitals
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* BLOOD BANK NETWORK MANAGEMENT SECTION (User Requested) */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card className="bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.05)] rounded-2xl overflow-hidden">
                        <CardHeader className="bg-slate-50/70 border-b border-slate-100 pb-3">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div>
                                    <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                                        <Building2 className="h-5 w-5 text-indigo-600" />
                                        Regional Blood Bank Network Management
                                    </CardTitle>
                                    <CardDescription className="text-xs text-slate-500 mt-0.5">
                                        Register, inventory-track, and remove accredited blood banks and their blood type reserves.
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                        {bloodBanks.length} Facilities Operational
                                    </span>
                                    <Button
                                        size="sm"
                                        className="h-8 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center gap-1.5 shadow-sm"
                                        onClick={() => setShowAddBankForm(!showAddBankForm)}
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        {showAddBankForm ? "Close Form" : "Add Blood Bank"}
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="p-5">
                            {/* Expandable Add Blood Bank Form */}
                            <AnimatePresence>
                                {showAddBankForm && (
                                    <motion.form
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        onSubmit={handleAddBloodBank}
                                        className="mb-6 p-5 rounded-2xl border border-indigo-200 bg-indigo-50/30 space-y-4"
                                    >
                                        <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                                            <h3 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
                                                <Package className="h-4 w-4 text-indigo-600" />
                                                Register New Blood Bank Facility
                                            </h3>
                                            <span className="text-xs font-semibold text-indigo-700 bg-indigo-100/60 px-2.5 py-0.5 rounded-full">
                                                Total Units: {totalInventoryUnitsInForm}
                                            </span>
                                        </div>

                                        {bankFormError && (
                                            <div className="p-3 bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-200 rounded-xl">
                                                {bankFormError}
                                            </div>
                                        )}

                                        {bankFormSuccess && (
                                            <div className="p-3 bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200 rounded-xl">
                                                {bankFormSuccess}
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Facility Name</label>
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="e.g. Fortis Blood Bank"
                                                    value={bankName}
                                                    onChange={(e) => setBankName(e.target.value)}
                                                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Street Address</label>
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="e.g. JLN Marg, Jaipur"
                                                    value={bankAddress}
                                                    onChange={(e) => setBankAddress(e.target.value)}
                                                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Contact Number</label>
                                                <input
                                                    type="text"
                                                    placeholder="+91 141 2560291"
                                                    value={bankContact}
                                                    onChange={(e) => setBankContact(e.target.value)}
                                                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Latitude</label>
                                                <input
                                                    type="number"
                                                    step="0.0001"
                                                    value={bankLat}
                                                    onChange={(e) => setBankLat(e.target.value)}
                                                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Longitude</label>
                                                <input
                                                    type="number"
                                                    step="0.0001"
                                                    value={bankLng}
                                                    onChange={(e) => setBankLng(e.target.value)}
                                                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                                                />
                                            </div>
                                        </div>

                                        {/* Blood Types Inventory Form (All 8 Blood Types) */}
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">
                                                Blood Type Storage Units (All 8 Groups)
                                            </label>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                                                {BLOOD_TYPES.map((type) => (
                                                    <div key={type} className="bg-white p-2 rounded-xl border border-slate-200 text-center shadow-2xs">
                                                        <span className="text-xs font-bold text-rose-600 block">{type}</span>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="500"
                                                            value={bankInventory[type] ?? 0}
                                                            onChange={(e) => {
                                                                const val = parseInt(e.target.value) || 0;
                                                                setBankInventory(prev => ({ ...prev, [type]: val }));
                                                            }}
                                                            className="w-full mt-1 p-1 text-center font-bold text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex justify-end gap-3 pt-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setShowAddBankForm(false)}
                                                className="text-xs font-semibold rounded-xl h-9"
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                type="submit"
                                                size="sm"
                                                disabled={isSubmittingBank}
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl h-9 px-5 shadow-sm"
                                            >
                                                {isSubmittingBank ? "Registering..." : "Save Blood Bank"}
                                            </Button>
                                        </div>
                                    </motion.form>
                                )}
                            </AnimatePresence>

                            {/* Blood Banks Cards Grid */}
                            {bloodBanks.length === 0 ? (
                                <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                    <Building2 className="h-6 w-6 text-slate-300 mx-auto mb-2" />
                                    <p className="font-semibold text-slate-700">No Blood Banks Registered</p>
                                    <p className="text-slate-400 mt-0.5">Click &quot;Add Blood Bank&quot; above to register accredited storage centers.</p>
                                </div>
                            ) : (
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {bloodBanks.map((bank) => (
                                        <div
                                            key={bank.id}
                                            className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-white transition-all flex flex-col justify-between gap-3 shadow-xs"
                                        >
                                            <div>
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <h3 className="text-sm font-bold text-slate-900">{bank.name}</h3>
                                                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                                            <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                                                            <span className="truncate">{bank.address}</span>
                                                        </p>
                                                    </div>
                                                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 shrink-0">
                                                        {bank.availableUnits} Units
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                                                    <Phone className="h-3 w-3 text-slate-400" />
                                                    <span>{bank.contact}</span>
                                                </div>

                                                {/* Inventory Breakdown for all blood types */}
                                                <div className="flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t border-slate-200/70">
                                                    {BLOOD_TYPES.map((type) => {
                                                        const count = bank.inventory?.[type] ?? 0;
                                                        return (
                                                            <span
                                                                key={type}
                                                                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                                                                    count > 0
                                                                        ? "bg-white text-slate-700 border-slate-200"
                                                                        : "bg-slate-100 text-slate-400 border-slate-200"
                                                                }`}
                                                            >
                                                                <strong className="text-rose-600">{type}:</strong> {count}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-2 border-t border-slate-200/50">
                                                <span className="text-[11px] text-slate-400 font-mono">ID: {bank.id}</span>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={deletingBankId === bank.id}
                                                    onClick={() => handleDeleteBloodBank(bank.id)}
                                                    className="h-7 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 rounded-lg flex items-center gap-1"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                    {deletingBankId === bank.id ? "Removing..." : "Remove"}
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>

                {/* SCHEDULED DONOR APPOINTMENTS & WALK-IN INTAKE ROSTER */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                >
                    <Card className="bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.05)] rounded-2xl overflow-hidden">
                        <CardHeader className="bg-slate-50/70 border-b border-slate-100 pb-3">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div>
                                    <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                                        <CalendarCheck className="h-5 w-5 text-rose-600" />
                                        Scheduled Donor Appointments & Walk-in Intake
                                    </CardTitle>
                                    <CardDescription className="text-xs text-slate-500 mt-0.5">
                                        Incoming donor appointments for accredited facilities. Verify donor arrival upon donation to add blood units to reserve and award donor points.
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                        {appointments.filter(a => a.status === "Scheduled").length} Pending Walk-ins
                                    </span>
                                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        {appointments.filter(a => a.status === "Completed").length} Verified & Collected
                                    </span>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="p-5">
                            {intakeSuccess && (
                                <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200 rounded-xl flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                    <span>{intakeSuccess}</span>
                                </div>
                            )}

                            {appointments.length === 0 ? (
                                <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                    <CalendarCheck className="h-6 w-6 text-slate-300 mx-auto mb-2" />
                                    <p className="font-semibold text-slate-700">No Donor Appointments Scheduled Yet</p>
                                    <p className="text-slate-400 mt-0.5">
                                        When donors schedule voluntary donation appointments through the Donor Portal, their arrival tickets appear here for facility intake verification.
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200/80 bg-white overflow-hidden shadow-2xs">
                                    {appointments.map((apt) => (
                                        <div
                                            key={apt.id}
                                            className={`p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-colors ${
                                                apt.status === "Scheduled" ? "hover:bg-slate-50/80" : "bg-slate-50/40 opacity-80"
                                            }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border ${
                                                    apt.status === "Completed"
                                                        ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                        : "bg-rose-50 text-rose-600 border-rose-100"
                                                }`}>
                                                    {apt.status === "Completed" ? (
                                                        <CheckCircle2 className="h-5 w-5" />
                                                    ) : (
                                                        <UserCheck className="h-5 w-5" />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                                            {apt.id}
                                                        </span>
                                                        <h4 className="text-sm font-bold text-slate-900">
                                                            {apt.donor_name || "Valued Donor"}
                                                        </h4>
                                                        <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[11px] font-bold">
                                                            Type {apt.bloodType}
                                                        </Badge>
                                                        {apt.status === "Scheduled" ? (
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                                                ● Awaiting Intake
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                ✓ Collected (+1 Unit)
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-4 text-xs text-slate-500 mt-1.5 flex-wrap">
                                                        <span className="flex items-center gap-1">
                                                            <Mail className="h-3 w-3 text-slate-400" />
                                                            {apt.donor_email || "N/A"}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Building2 className="h-3 w-3 text-slate-400" />
                                                            {apt.hospital_name}
                                                        </span>
                                                        <span className="flex items-center gap-1 font-mono text-[11px]">
                                                            <Clock className="h-3 w-3 text-slate-400" />
                                                            {apt.timestamp ? new Date(apt.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Recent"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="shrink-0 flex items-center justify-end">
                                                {apt.status === "Scheduled" ? (
                                                    <Button
                                                        size="sm"
                                                        disabled={completingId === apt.id}
                                                        onClick={() => handleCompleteDonation(apt.id)}
                                                        className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
                                                    >
                                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                                        {completingId === apt.id ? "Verifying..." : "Verify & Intake (+1 Unit)"}
                                                    </Button>
                                                ) : (
                                                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-100 flex items-center gap-1">
                                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                                        Credited to Reserve
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Main Content Area: Map + AI Shortage Alerts */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="grid gap-6 grid-cols-1 lg:grid-cols-7"
                >
                    {/* Map: 4 columns */}
                    <Card className="col-span-1 lg:col-span-4 flex flex-col bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.05)] rounded-2xl overflow-hidden">
                        <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-base font-bold text-slate-900">AI Geo-Prediction Map</CardTitle>
                                    <CardDescription className="text-xs text-slate-500 mt-0.5">
                                        Live radar of regional shortages mapped with active dispatch pins.
                                    </CardDescription>
                                </div>
                                <span className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                                    Jaipur Grid
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 p-0 relative z-0 min-h-[420px]">
                            <AIPredictionMap predictions={liveAlerts} activeRequests={liveRequests} />
                        </CardContent>
                    </Card>

                    {/* AI Alerts Sidebar: 3 columns */}
                    <Card className="col-span-1 lg:col-span-3 flex flex-col bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.05)] rounded-2xl overflow-hidden">
                        <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 shrink-0">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base font-bold text-slate-900">
                                    Urgent Shortage Alerts
                                </CardTitle>
                                <span className="text-xs font-semibold text-slate-500">
                                    {liveAlerts.length} Flagged
                                </span>
                            </div>
                            <CardDescription className="text-xs text-slate-500 mt-0.5">
                                Real-time classification engine triggers.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
                            <div className="divide-y divide-slate-100 max-h-[440px] overflow-y-auto pr-1">
                                {liveAlerts.length > 0 ? (
                                    liveAlerts.map((alert) => (
                                        <div
                                            key={alert.id}
                                            className={`p-4 transition-colors hover:bg-slate-50/80 ${
                                                alert.severity === "High" ? "bg-rose-50/30" : ""
                                            }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <ShieldAlert
                                                    className={`h-5 w-5 mt-0.5 shrink-0 ${
                                                        alert.severity === "High" ? "text-rose-600" : "text-amber-500"
                                                    }`}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <h3 className="text-sm font-bold text-slate-900 truncate">
                                                            Region {alert.id} Forecast
                                                        </h3>
                                                        <Badge
                                                            className={
                                                                alert.severity === "High"
                                                                    ? "bg-rose-50 text-rose-700 border-rose-200 text-xs font-semibold shrink-0"
                                                                    : "bg-amber-50 text-amber-700 border-amber-200 text-xs font-semibold shrink-0"
                                                            }
                                                        >
                                                            {alert.severity} Risk
                                                        </Badge>
                                                    </div>

                                                    <p className="text-xs font-semibold text-slate-700 mt-1 flex items-center gap-1.5">
                                                        <Droplets className="h-3.5 w-3.5 text-rose-600" />
                                                        <span>
                                                            Needs <strong className="text-rose-600">{alert.predictedShortage} Units</strong> of {alert.bloodType}
                                                        </span>
                                                    </p>

                                                    <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200/80 p-2.5 rounded-lg mt-2 leading-relaxed">
                                                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-0.5">
                                                            AI Trigger Vector
                                                        </span>
                                                        {alert.reason}
                                                    </div>

                                                    {/* Explainable AI breakdown */}
                                                    <div className="mt-2.5">
                                                        <button
                                                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
                                                            onClick={() =>
                                                                setExpandedXAI(expandedXAI === alert.id ? null : alert.id)
                                                            }
                                                        >
                                                            <Sparkles className="h-3 w-3" />
                                                            {expandedXAI === alert.id ? "Hide XAI Factors" : "View Feature Weights (XAI)"}
                                                        </button>

                                                        {expandedXAI === alert.id && (
                                                            <motion.div
                                                                initial={{ opacity: 0, height: 0 }}
                                                                animate={{ opacity: 1, height: "auto" }}
                                                                className="mt-2.5 space-y-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 text-xs"
                                                            >
                                                                {Object.entries(alert.localScores || {})
                                                                    .sort(([, a], [, b]) => b - a)
                                                                    .map(([feat, score]) => (
                                                                        <div key={feat}>
                                                                            <div className="flex justify-between text-[11px] mb-0.5 text-slate-600 font-medium">
                                                                                <span>{feat}</span>
                                                                                <span className="font-bold text-slate-900">{score}%</span>
                                                                            </div>
                                                                            <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                                                                <div
                                                                                    style={{ width: `${score}%` }}
                                                                                    className={`h-full rounded-full ${
                                                                                        score > 60 ? "bg-rose-500" : score > 35 ? "bg-amber-500" : "bg-emerald-500"
                                                                                    }`}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                            </motion.div>
                                                        )}
                                                    </div>

                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className={`w-full mt-3 h-8 text-xs font-semibold transition-all ${
                                                            warnedRegions.has(alert.id.toString())
                                                                ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                                                : "border-slate-200 text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300"
                                                        }`}
                                                        onClick={() => handleBroadcastWarning(alert)}
                                                        disabled={warnedRegions.has(alert.id.toString())}
                                                    >
                                                        {warnedRegions.has(alert.id.toString())
                                                            ? "Warning Dispatched to Hospitals"
                                                            : "Broadcast Warning to Local Hubs"}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-10 text-center text-xs text-slate-400 flex flex-col items-center justify-center h-full">
                                        <Activity className="h-8 w-8 text-slate-300 mb-2" />
                                        No active shortage risks flagged in Jaipur.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}

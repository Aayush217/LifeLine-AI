// ADD THESE IMPORTS
import { useCallback, useMemo } from "react";

// ADD THESE TYPES ABOVE COMPONENT
interface LiveRequest {
    id: string;
    urgency: string;
    unitsNeeded: number;
    bloodType: string;
    eta?: number;
    accepted_donors?: string[];
}

interface LeaderboardUser {
    id: string;
    name: string;
    bloodType: string;
    livesSaved: number;
    points: number;
}

interface Prediction {
    id: string;
    name?: string;
    predictedShortage: number;
    severity: string;
    reason: string;
    lat: number;
    lng: number;
}

// REPLACE THESE STATES
const [liveRequests, setLiveRequests] = useState<LiveRequest[]>([]);
const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
const [predictions, setPredictions] = useState<Prediction[]>([]);

const [loading, setLoading] = useState(true);
const [error, setError] = useState(false);

// MEMOIZED HISTORY
const donationHistory = useMemo(() => {
    const livesCount = user?.livesSaved ?? 0;

    return user ? [
        ...(livesCount > 0 ? [{
            id: 'h1',
            date: new Date(Date.now() - 86400000 * 2).toLocaleDateString(),
            type: user.bloodType,
            units: Math.max(1, Math.floor(livesCount / 3)),
            hospital: 'SMS Hospital, Jaipur',
            impact: livesCount,
            status: 'Completed'
        }] : []),
        {
            id: 'h0',
            date: 'Today',
            type: user.bloodType,
            units: 1,
            hospital: 'On Standby — Ready to Respond',
            impact: 0,
            status: 'Standby'
        }
    ] : [];
}, [user]);

// REPLACE ENTIRE useEffect WITH THIS
const fetchDashboardData = useCallback(async (signal?: AbortSignal) => {
    try {
        setError(false);

        const [requestsRes, leaderboardRes, predictionsRes] = await Promise.all([
            fetch(api.activeRequests, { signal }),
            fetch(api.leaderboard, { signal }),
            fetch(api.predictions, { signal })
        ]);

        if (requestsRes.ok) {
            setLiveRequests(await requestsRes.json());
        }

        if (leaderboardRes.ok) {
            setLeaderboard(await leaderboardRes.json());
        }

        if (predictionsRes.ok) {
            setPredictions(await predictionsRes.json());
        }

    } catch (error: any) {
        if (error.name !== "AbortError") {
            console.error("Dashboard fetch failed:", error);
            setError(true);
        }
    } finally {
        setLoading(false);
    }
}, []);

useEffect(() => {
    const controller = new AbortController();

    fetchDashboardData(controller.signal);

    const interval = setInterval(() => {
        fetchDashboardData(controller.signal);
    }, 5000);

    return () => {
        controller.abort();
        clearInterval(interval);
    };
}, [fetchDashboardData]);

// ADD THIS BEFORE RETURN
if (loading) {
    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                    <div
                        key={i}
                        className="h-36 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse"
                    />
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                <div className="lg:col-span-2 h-[500px] rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
                <div className="h-[500px] rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
            </div>
        </div>
    );
}

if (error) {
    return (
        <div className="container mx-auto px-4 py-20 max-w-7xl">
            <Card className="bg-slate-900/70 border border-red-500/20 max-w-lg mx-auto">
                <CardContent className="p-10 text-center">
                    <ShieldAlert className="h-12 w-12 text-red-400 mx-auto mb-4" />

                    <h2 className="text-2xl font-bold text-white">
                        Failed to Load Dashboard
                    </h2>

                    <p className="text-slate-400 mt-2">
                        Unable to connect to the live donation services.
                    </p>

                    <Button
                        onClick={() => window.location.reload()}
                        className="mt-6 bg-cyan-500 hover:bg-cyan-400 text-black"
                    >
                        Retry
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

// REPLACE MAIN CONTAINER CLASS
<div className="container mx-auto px-4 py-8 max-w-7xl relative isolate">

// REPLACE BACKGROUND BLOBS
<div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />
<div className="absolute top-40 left-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />

// REPLACE WELCOME TITLE
<h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
    Welcome Back{user ? `, ${user.name.split(' ')[0]}` : ''}
</h1>

// REPLACE SUBTITLE
<p className="text-slate-400 mt-2 text-sm sm:text-base">
    Your blood type{" "}
    <strong className="text-cyan-400">
        {user?.bloodType}
    </strong>{" "}
    can help save lives today.
</p>

// REPLACE TOP RESPONDER BADGE
<Badge className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-4 py-1.5 text-sm gap-2 shadow-lg shadow-cyan-500/10">
    <Star className="h-4 w-4 fill-cyan-400 text-cyan-400" />
    Top Responder
</Badge>

// REPLACE MAIN RED CARD
<Card className="bg-gradient-to-br from-cyan-600 to-blue-900 text-white border-cyan-500/20 shadow-[0_8px_30px_rgba(6,182,212,0.2)] overflow-hidden relative group">

// REPLACE GREEN BUTTONS
className="w-full bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.25)] font-semibold tracking-wide transition-all h-11"

// REPLACE RED ACTION BUTTON
className="w-full mt-5 bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.25)] font-semibold tracking-wide transition-all h-11"

// REPLACE CARD STYLE GLOBALLY
bg-slate-900/60 backdrop-blur-xl border-slate-800/80

// WITH
bg-slate-900/50 backdrop-blur-2xl border-slate-800/60

// REPLACE SECTION TITLES ICON COLORS
text-red-500

// WITH
text-cyan-400

// REPLACE SCROLL AREA
className="grid gap-4 mt-4 max-h-[400px] overflow-y-auto pr-2"

// REPLACE LEADERBOARD ACTIVE USER STYLE
bg-cyan-500/10 border-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.08)]

// REPLACE ACTIVE USER TEXT
text-cyan-400

// ADD THIS TO MAJOR CARDS
hover:-translate-y-1 transition-all duration-300

// ADD THIS TO BUTTONS
active:scale-[0.98]

// REPLACE HEARTPULSE SUCCESS STATE
bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-lg shadow-emerald-500/10

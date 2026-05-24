"use client";


import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

// Dynamically import Leaflet components so they only load on the client side
const MapContainer = dynamic(
    () => import("react-leaflet").then((mod) => mod.MapContainer),
    { ssr: false }
);
const TileLayer = dynamic(
    () => import("react-leaflet").then((mod) => mod.TileLayer),
    { ssr: false }
);
const CircleMarker = dynamic(
    () => import("react-leaflet").then((mod) => mod.CircleMarker),
    { ssr: false }
);
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), {
    ssr: false,
});

export type PredictionData = {
    id: string;
    lat: number;
    lng: number;
    severity: "High" | "Medium" | "Low";
    reason: string;
    predictedShortage: number;
    bloodType: string;
    localScores?: Record<string, number>;
};

export type ActiveRequestData = {
    id: string;
    lat: number;
    lng: number;
    unitsNeeded: number;
    bloodType: string;
    matches: number;
};

export default function AIPredictionMap({
    predictions = [],
    activeRequests = []
}: {
    predictions?: PredictionData[],
    activeRequests?: ActiveRequestData[]
}) {
    // Standard center point for Jaipur
    const centerPosition: [number, number] = [26.9124, 75.7873];

    const getColor = (severity: string) => {
        switch (severity) {
            case "High":
                return "#ef4444"; // red-500
            case "Medium":
                return "#f59e0b"; // amber-500
            case "Low":
                return "#10b981"; // emerald-500
            default:
                return "#3b82f6"; // blue-500
        }
    };

    return (
        <div className="h-[400px] w-full rounded-lg overflow-hidden border shadow-sm relative z-0">
            <MapContainer
                center={centerPosition}
                zoom={12}
                scrollWheelZoom={false}
                className="h-full w-full"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                />

                {/* Layer 1: ML Prediction Zones (Accidents, Weather, etc.) */}
                {predictions.map((pred) => (
                    <CircleMarker
                        key={pred.id}
                        center={[pred.lat, pred.lng]}
                        pathOptions={{
                            color: getColor(pred.severity),
                            fillColor: getColor(pred.severity),
                            fillOpacity: 0.6,
                        }}
                        radius={pred.severity === "High" ? 15 : 10}
                    >
                        <Popup>
                            <div className="p-1">
                                <h3 className="font-bold text-red-600 mb-1">
                                    {pred.severity} Severity Alert
                                </h3>
                                <p className="text-sm mb-1">
                                    <strong>Type Needed:</strong> {pred.bloodType} (
                                    {pred.predictedShortage} units)
                                </p>
                                <div className="text-xs bg-slate-100 p-2 rounded">
                                    <span className="font-semibold block mb-1">AI Radar Detection:</span>
                                    {pred.reason}
                                </div>
                            </div>
                        </Popup>
                    </CircleMarker>
                ))}

                {/* Layer 2: Live Hospital Dispatch Requests */}
                {activeRequests.map((req) => (
                    <CircleMarker
                        key={req.id}
                        center={[req.lat, req.lng]}
                        pathOptions={{
                            color: "#0f172a", // slate-900 border
                            fillColor: "#3b82f6", // blue-500 fill
                            fillOpacity: 0.9,
                            weight: 2
                        }}
                        radius={7}
                    >
                        <Popup>
                            <div className="p-1">
                                <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-1">
                                    Live Dispatch: {req.id}
                                </h3>
                                <p className="text-sm">
                                    <strong>Needs:</strong> {req.unitsNeeded} Units of {req.bloodType}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                    {req.matches} Donors Matched
                                </p>
                                <div className="mt-2 text-[10px] bg-blue-50 text-blue-800 px-2 py-1 rounded font-semibold inline-block">
                                    Hopcroft-Karp Routed
                                </div>
                            </div>
                        </Popup>
                    </CircleMarker>
                ))}
            </MapContainer>
        </div>
    );
}

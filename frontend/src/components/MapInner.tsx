"use client";

import React, { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

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

// Component to force Leaflet to recalculate its viewport size upon mounting
function InvalidateMapSize() {
    const map = useMap();
    useEffect(() => {
        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 150);
        return () => clearTimeout(timer);
    }, [map]);
    return null;
}

export default function MapInner({
    predictions = [],
    activeRequests = []
}: {
    predictions?: PredictionData[];
    activeRequests?: ActiveRequestData[];
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
        <div className="h-full min-h-[420px] w-full rounded-xl overflow-hidden relative z-0">
            <MapContainer
                center={centerPosition}
                zoom={12}
                scrollWheelZoom={false}
                style={{ height: "100%", width: "100%", minHeight: "420px" }}
            >
                <InvalidateMapSize />
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Layer 1: ML Prediction Shortage Zones */}
                {predictions.map((pred) => (
                    <CircleMarker
                        key={`pred-${pred.id}`}
                        center={[pred.lat, pred.lng]}
                        pathOptions={{
                            color: getColor(pred.severity),
                            fillColor: getColor(pred.severity),
                            fillOpacity: 0.65,
                            weight: 2
                        }}
                        radius={pred.severity === "High" ? 16 : 11}
                    >
                        <Popup>
                            <div className="p-2 font-sans text-slate-800 text-xs">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span
                                        className="h-2 w-2 rounded-full"
                                        style={{ backgroundColor: getColor(pred.severity) }}
                                    />
                                    <strong className="text-sm text-slate-900 font-semibold">
                                        {pred.severity} Severity Alert
                                    </strong>
                                </div>
                                <p className="mb-1 text-slate-700">
                                    <span className="font-semibold text-slate-900">Type Needed:</span>{" "}
                                    <span className="font-bold text-red-600">{pred.bloodType}</span> ({pred.predictedShortage} units)
                                </p>
                                <div className="mt-2 bg-slate-50 border border-slate-200/80 p-2 rounded-md">
                                    <span className="font-semibold block text-[11px] text-slate-600 mb-0.5">AI Radar Trigger:</span>
                                    <span className="text-slate-600">{pred.reason}</span>
                                </div>
                            </div>
                        </Popup>
                    </CircleMarker>
                ))}

                {/* Layer 2: Live Hospital Dispatch Requests */}
                {activeRequests.map((req) => (
                    <CircleMarker
                        key={`req-${req.id}`}
                        center={[req.lat, req.lng]}
                        pathOptions={{
                            color: "#1e293b",
                            fillColor: "#3b82f6",
                            fillOpacity: 0.9,
                            weight: 2
                        }}
                        radius={8}
                    >
                        <Popup>
                            <div className="p-2 font-sans text-slate-800 text-xs">
                                <h3 className="font-bold text-slate-900 text-sm mb-1">
                                    Hospital Dispatch: {req.id}
                                </h3>
                                <p className="text-slate-700 mb-1">
                                    <strong>Demanding:</strong> {req.unitsNeeded} Units of {req.bloodType}
                                </p>
                                <p className="text-slate-500">
                                    {req.matches} Donors Dispatched
                                </p>
                                <div className="mt-2 text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-semibold inline-block border border-blue-200">
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

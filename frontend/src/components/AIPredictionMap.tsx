"use client";

import dynamic from "next/dynamic";
import React from "react";
import type { PredictionData, ActiveRequestData } from "./MapInner";

export type { PredictionData, ActiveRequestData };

const MapInner = dynamic(() => import("./MapInner"), {
    ssr: false,
    loading: () => (
        <div className="h-full min-h-[420px] w-full rounded-xl bg-slate-100 flex flex-col items-center justify-center text-slate-400 gap-3 animate-pulse border border-slate-200">
            <div className="h-8 w-8 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
            <span className="text-xs font-medium tracking-wide">Loading LifeLine AI Geo-Radar...</span>
        </div>
    )
});

export default function AIPredictionMap({
    predictions = [],
    activeRequests = []
}: {
    predictions?: PredictionData[];
    activeRequests?: ActiveRequestData[];
}) {
    return <MapInner predictions={predictions} activeRequests={activeRequests} />;
}

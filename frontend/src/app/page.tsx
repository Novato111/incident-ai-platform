// frontend/src/app/page.tsx
"use client";

import { useEffect } from "react";

import ReactMarkdown from "react-markdown";
import { useIncidentStore } from "./store/useIncidentStore";

export default function WarRoom() {
  // Grab our state and the new requestAiRunbook function from Zustand
  const { connect, isConnected, logs, incidents, requestAiRunbook } =
    useIncidentStore();

  // Connect to the WebSocket when the page loads
  useEffect(() => {
    connect();
  }, [connect]);

  return (
    <div className="min-h-screen bg-black text-zinc-300 font-sans selection:bg-white selection:text-black">
      {/* EDITORIAL HEADER */}
      <header className="border-b border-zinc-800 p-6 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-white uppercase">
            AIOps <span className="text-zinc-500 font-light">War_Room</span>
          </h1>
          <p className="text-xs tracking-widest uppercase mt-2 text-zinc-500">
            Real-time Telemetry & Generative Diagnostics
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs tracking-widest uppercase">
          <span className={isConnected ? "text-white" : "text-zinc-600"}>
            {isConnected ? "System Live" : "Offline"}
          </span>
          <div
            className={`w-2 h-2 rounded-full ${isConnected ? "bg-white animate-pulse" : "bg-red-600"}`}
          />
        </div>
      </header>

      {/* RIGID GRID LAYOUT */}
      <div className="grid grid-cols-12 min-h-[calc(100vh-100px)]">
        {/* LEFT COLUMN: THE RAW FIREHOSE (3 Columns Wide) */}
        <div className="col-span-3 border-r border-zinc-800 flex flex-col bg-[#050505]">
          <div className="p-4 border-b border-zinc-800 text-xs tracking-widest uppercase text-white font-bold bg-black">
            Raw Firehose // {logs.length}
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-[10px] leading-relaxed">
            {logs.map((log) => (
              <div
                key={log.id}
                className={
                  log.level === "ERROR" ? "text-red-500" : "text-zinc-500"
                }
              >
                <span className="opacity-40 pr-2">
                  {new Date(log.timestamp)
                    .toISOString()
                    .split("T")[1]
                    .replace("Z", "")}
                </span>
                <span className={log.level === "ERROR" ? "font-bold" : ""}>
                  {log.service.replace("-service", "")}
                </span>
                <span className="opacity-50"> — {log.message}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIVE INCIDENTS & AI RUNBOOKS (9 Columns Wide) */}
        <div className="col-span-9 p-8 bg-black overflow-y-auto">
          <div className="mb-8 text-xs tracking-widest uppercase text-zinc-500 border-b border-zinc-800 pb-2">
            Active Incidents // {incidents.length}
          </div>

          {incidents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 opacity-20">
              <span className="text-4xl font-black tracking-tighter">
                SILENCE
              </span>
              <span className="text-xs tracking-widest uppercase mt-2">
                Zero Active Incidents
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-8">
              {incidents.map((inc) => (
                <div
                  key={inc.id}
                  className="border border-zinc-800 bg-[#050505] flex flex-col shadow-2xl"
                >
                  {/* INCIDENT HEADER */}
                  <div className="p-6 border-b border-zinc-800 bg-black">
                    <div className="flex justify-between items-start mb-4">
                      <span className="px-2 py-1 bg-white text-black text-[10px] font-bold uppercase tracking-widest">
                        {inc.severity}
                      </span>
                      <span className="text-xs text-zinc-500 font-mono">
                        ID: {inc.id.split("-")[0]}
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold text-white leading-tight mb-2">
                      {inc.title}
                    </h2>
                    <p className="text-sm font-mono text-zinc-500">
                      ROOT CAUSE:{" "}
                      <span className="text-red-400">
                        {inc.rootCauseService}
                      </span>
                    </p>
                  </div>

                  {/* AI RUNBOOK AREA (Now with On-Demand Buttons!) */}
                  <div className="p-6 flex-1 text-sm text-zinc-300 min-h-[200px]">
                    {!inc.aiRunbook ? (
                      <div className="flex items-center justify-center h-full">
                        <button
                          onClick={() => requestAiRunbook(inc)}
                          className="px-6 py-3 border border-zinc-700 hover:border-white hover:text-white hover:bg-zinc-900 transition-all text-xs uppercase tracking-widest text-zinc-400 flex items-center gap-2 cursor-pointer"
                        >
                          Ask AI Assistant
                        </button>
                      </div>
                    ) : inc.aiRunbook === "loading" ? (
                      <div className="flex items-center gap-3 text-zinc-500 font-mono text-xs animate-pulse h-full justify-center">
                        <div className="w-2 h-2 bg-zinc-500 rounded-full" />
                        Gemini AI analyzing telemetry...
                      </div>
                    ) : (
                      <div
                        className="prose prose-invert prose-sm max-w-none 
                        prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-white
                        prose-a:text-white prose-strong:text-white prose-code:text-red-400 prose-code:bg-red-950/30 prose-code:px-1
                        prose-ul:border-l border-zinc-800 prose-ul:pl-4"
                      >
                        <ReactMarkdown>{inc.aiRunbook}</ReactMarkdown>
                      </div>
                    )}
                  </div>

                  {/* INCIDENT FOOTER */}
                  <div className="p-4 border-t border-zinc-800 text-[10px] uppercase tracking-widest text-zinc-600 bg-black flex justify-between">
                    <span>
                      Noise Suppressed: {inc.correlatedEventIds.length} Alerts
                    </span>
                    <span>Status: {inc.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// frontend/src/store/useIncidentStore.ts

import { create } from "zustand";
import { io, Socket } from "socket.io-client";

// We duplicate the types here briefly to avoid complex Next.js monorepo config for now
export interface FrontendLog {
  id: string;
  timestamp: number;
  service: string;
  level: "INFO" | "WARN" | "ERROR" | "FATAL";
  message: string;
}
export interface FrontendIncident {
  id: string;
  title: string;
  status: string;
  severity: string;
  timestamp: number;
  rootCauseService: string;
  correlatedEventIds: string[];
}

interface IncidentState {
  logs: FrontendLog[];
  incidents: FrontendIncident[];
  isConnected: boolean;
  connect: () => void;
  requestAiRunbook: (incident: FrontendIncident) => void;
}

let socket: Socket | null = null;

export const useIncidentStore = create<IncidentState>((set) => ({
  logs: [],
  incidents: [],
  isConnected: false,
  requestAiRunbook: (incident) => {
    if (socket) {
      // Send the request to the Gateway
      socket.emit("request-ai-runbook", incident);

      // Optimistically update the UI to show the loading state
      set((state) => ({
        incidents: state.incidents.map((inc) =>
          inc.id === incident.id ? { ...inc, aiRunbook: "loading" } : inc,
        ),
      }));
    }
  },

  connect: () => {
    // Prevent opening multiple WebSocket connections if React re-renders
    if (socket) return;

    // Connect to the API Gateway we built in Phase 5
    socket = io("http://localhost:4000");

    socket.on("connect", () => {
      console.log("🟢 Connected to API Gateway");
      set({ isConnected: true });
    });

    socket.on("disconnect", () => {
      console.log("🔴 Disconnected from API Gateway");
      set({ isConnected: false });
    });

    // When a raw log arrives, add it to the top of the list
    socket.on("live-log", (log: FrontendLog) => {
      set((state) => ({
        // We only keep the latest 100 logs in memory so the browser doesn't crash!
        logs: [log, ...state.logs].slice(0, 100),
      }));
    });
    socket.on(
      "runbook-ready",
      ({ incidentId, runbook }: { incidentId: string; runbook: string }) => {
        set((state) => ({
          incidents: state.incidents.map((inc) =>
            inc.id === incidentId ? { ...inc, aiRunbook: runbook } : inc,
          ),
        }));
      },
    );
    // When a correlated incident arrives, add it to our incidents list
    socket.on("new-incident", (incident: FrontendIncident) => {
      set((state) => ({
        incidents: [incident, ...state.incidents],
      }));
    });
  },
}));

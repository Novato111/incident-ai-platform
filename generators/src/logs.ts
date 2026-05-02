// generators/src/logs.ts

import crypto from "crypto";
// Importing our single source of truth!
import { RawLog } from "../../shared/src/schemas/event.schema";

const SERVICES = [
  "payment-service",
  "checkout-service",
  "user-service",
  "inventory-service",
];

function generateLog(): RawLog {
  // We want mostly good logs, but a 20% chance of something going wrong
  const isError = Math.random() > 0.8;

  const service = SERVICES[Math.floor(Math.random() * SERVICES.length)];
  const level = isError ? "ERROR" : "INFO";

  // Make the messages feel somewhat realistic
  let message = "Request processed successfully";
  if (isError) {
    message =
      service === "payment-service"
        ? "Stripe API connection timeout"
        : "Database query took too long";
  }

  return {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    service: service,
    level: level,
    message: message,
    metadata: {
      latencyMs: Math.floor(Math.random() * 500),
    },
  };
}

console.log("🔥 Starting Log Firehose... (Press Ctrl+C to stop)\n");

// This loop runs every 1 second (1000ms), generates a log, and prints it.
// Add this to the bottom of generators/src/logs.ts (replacing the old setInterval)

console.log(
  "🔥 Starting Log Firehose to Ingestion API... (Press Ctrl+C to stop)\n",
);

setInterval(async () => {
  const log = generateLog();

  try {
    // Send the log over HTTP to our new Fastify server
    const response = await fetch("http://localhost:3000/ingest/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(log),
    });

    if (response.ok) {
      // Print locally so we know it fired
      console.log(`[🚀 SENT] ${log.service} log fired to API.`);
    }
  } catch (error) {
    console.error(
      `[❌ CONNECTION ERROR] Is the backend Fastify server running?`,
    );
  }
}, 1000); // Fires 1 log every second

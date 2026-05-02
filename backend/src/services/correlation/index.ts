// backend/src/services/correlation/index.ts

import { Kafka } from "kafkajs";
import crypto from "crypto";
import {
  StreamEvent,
  Alert,
  Incident,
} from "../../../../shared/src/schemas/event.schema";

const kafka = new Kafka({
  clientId: "correlation-engine",
  brokers: ["localhost:9092"],
});

const consumer = kafka.consumer({ groupId: "correlation-group" });
const producer = kafka.producer();

// This is our temporary memory buffer.
// It holds incidents that are currently "open" and gathering alerts.
const activeIncidents: Record<string, Incident> = {};
const CORRELATION_WINDOW_MS = 15000; // 15 seconds for testing (usually 2-5 mins in prod)

async function startCorrelationEngine() {
  await consumer.connect();
  await producer.connect();

  // Listen specifically to the output of the Anomaly Detector!
  await consumer.subscribe({ topic: "alerts.detected", fromBeginning: false });

  console.log("🧩 Correlation Engine running... waiting to group alerts.");

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;

      const event = JSON.parse(message.value.toString()) as StreamEvent;

      // We only care about Alerts here
      if (event.type === "ALERT") {
        const alert = event.payload as Alert;
        const service = alert.service;

        // Is there already an open incident for this service?
        if (activeIncidents[service]) {
          // YES: Swallow the alert and attach its ID to the existing incident
          activeIncidents[service].correlatedEventIds.push(alert.id);
          console.log(
            `[🧲 CORRELATED] Grouped alert ${alert.id} into existing ${service} incident.`,
          );
        } else {
          // NO: Create a brand new incident
          console.log(
            `[🔥 NEW INCIDENT] Opening correlation window for ${service}...`,
          );

          activeIncidents[service] = {
            id: crypto.randomUUID(),
            title: `High Error Rate detected in ${service}`,
            status: "INVESTIGATING",
            severity: "SEV-2",
            timestamp: Date.now(),
            rootCauseService: service,
            correlatedEventIds: [alert.id], // Start the list with this first alert
          };

          // Start the timer! After 15 seconds, close the incident and publish it.
          setTimeout(async () => {
            const finalIncident = activeIncidents[service];

            console.log(`\n[📦 PUBLISHING INCIDENT] ${finalIncident.title}`);
            console.log(
              `Suppressed ${finalIncident.correlatedEventIds.length - 1} noisy alerts.`,
            );

            // Push the finalized Incident to the 'incidents.enriched' topic
            await producer.send({
              topic: "incidents.enriched",
              messages: [{ value: JSON.stringify(finalIncident) }],
            });

            // Clear it from memory so a future crash creates a new incident
            delete activeIncidents[service];
          }, CORRELATION_WINDOW_MS);
        }
      }
    },
  });
}

startCorrelationEngine().catch(console.error);

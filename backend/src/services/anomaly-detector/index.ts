// backend/src/services/anomaly-detector/index.ts

import { Kafka } from "kafkajs";
import crypto from "crypto";
import {
  StreamEvent,
  Alert,
} from "../../../../shared/src/schemas/event.schema";

const kafka = new Kafka({
  clientId: "anomaly-detector",
  brokers: ["localhost:9092"],
});

// A Consumer to read the logs, and a Producer to send the alerts
const consumer = kafka.consumer({ groupId: "anomaly-detector-group" });
const producer = kafka.producer();

// In-memory state to track how many errors each service has thrown recently.
// (In a production app, you would use Redis for this so it scales across multiple servers).
const errorCounts: Record<string, number> = {};
const THRESHOLD = 3; // If we see 3 errors for a service, we trigger an alert!

async function startDetector() {
  await consumer.connect();
  await producer.connect();

  // Subscribe to the firehose
  await consumer.subscribe({ topic: "raw.events", fromBeginning: false });

  console.log("🕵️ Anomaly Detector listening for chaos on Kafka...");

  // This loop runs every time a new message hits the 'raw.events' topic
  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;

      // Parse the JSON string back into our strict TypeScript object
      const event = JSON.parse(message.value.toString()) as StreamEvent;

      // We only care about logs that are errors
      if (event.type === "LOG" && event.payload.level === "ERROR") {
        const service = event.payload.service;

        // Increment the error count for this specific service
        errorCounts[service] = (errorCounts[service] || 0) + 1;

        console.log(
          `[⚠️ WARNING] Error in ${service}. Count: ${errorCounts[service]}`,
        );

        // Did we trip the threshold?
        if (errorCounts[service] >= THRESHOLD) {
          console.log(
            `\n[🚨 ALERT TRIGGERED] ${service} has exceeded the error threshold!\n`,
          );

          // Create the Alert object matching our shared schema
          const alert: Alert = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            service: service,
            metric: "ERROR_RATE",
            value: errorCounts[service],
            threshold: THRESHOLD,
            status: "FIRING",
          };

          const outEvent: StreamEvent = { type: "ALERT", payload: alert };

          // Push the new Alert back into Kafka on a different topic
          await producer.send({
            topic: "alerts.detected",
            messages: [{ value: JSON.stringify(outEvent) }],
          });

          // Reset the count so we don't spam duplicate alerts
          errorCounts[service] = 0;
        }
      }
    },
  });
}

startDetector().catch(console.error);

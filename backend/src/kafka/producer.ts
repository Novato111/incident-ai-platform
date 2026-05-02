// backend/src/kafka/producer.ts

import { Kafka, Producer } from "kafkajs";
// Importing our shared type so the Producer knows what it's allowed to send!
import { StreamEvent } from "../../../shared/src/schemas/event.schema";

// 1. Connect to the Kafka container running on our machine
const kafka = new Kafka({
  clientId: "incident-ai-ingestion",
  brokers: ["localhost:9092"], // This matches the port in our docker-compose.yml
});

// 2. Create the Producer instance
const producer: Producer = kafka.producer();

export async function connectProducer() {
  await producer.connect();
  console.log("✅ Kafka Producer connected successfully.");
}

// 3. The function that actually pushes data to the topic
export async function produceEvent(topic: string, event: StreamEvent) {
  try {
    await producer.send({
      topic: topic,
      messages: [
        // Kafka only accepts strings or buffers, so we must stringify our JSON object
        { value: JSON.stringify(event) },
      ],
    });
  } catch (error) {
    console.error(
      `[❌ ERROR] Failed to produce message to topic ${topic}:`,
      error,
    );
  }
}

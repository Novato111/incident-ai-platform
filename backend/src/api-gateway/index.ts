// backend/src/api-gateway/index.ts

import Fastify from "fastify";
import cors from "@fastify/cors";
import { Server } from "socket.io";
import { Kafka } from "kafkajs";

const app = Fastify();
app.register(cors, { origin: "*" });

const io = new Server(app.server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

const kafka = new Kafka({
  clientId: "api-gateway",
  brokers: ["localhost:9092"],
});
const consumer = kafka.consumer({ groupId: "websocket-gateway-group" });
const producer = kafka.producer(); // <--- ADDED: We now have a producer!

io.on("connection", (socket) => {
  console.log(`[🔌 SOCKET CONNECTED] UI Dashboard attached: ${socket.id}`);

  // ADDED: Listen for the user clicking the "Ask AI" button
  socket.on("request-ai-runbook", async (incident) => {
    console.log(
      `[👤 USER ACTION] Engineer requested AI for incident: ${incident.title}`,
    );

    // Forward the request to Kafka so the RAG Engine can pick it up
    await producer.send({
      topic: "runbooks.requested",
      messages: [{ value: JSON.stringify(incident) }],
    });
  });

  socket.on("disconnect", () =>
    console.log(`[🔌 SOCKET DISCONNECTED] UI Dashboard left: ${socket.id}`),
  );
});

async function startGateway() {
  await producer.connect(); // <--- ADDED: Connect the producer
  await consumer.connect();

  await consumer.subscribe({ topic: "raw.events", fromBeginning: false });
  await consumer.subscribe({
    topic: "incidents.enriched",
    fromBeginning: false,
  });
  await consumer.subscribe({
    topic: "runbooks.generated",
    fromBeginning: false,
  });

  console.log("🌉 API Gateway bridging Kafka to WebSockets...");

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      if (!message.value) return;
      const parsedData = JSON.parse(message.value.toString());

      if (topic === "raw.events" && parsedData.type === "LOG") {
        io.emit("live-log", parsedData.payload);
      } else if (topic === "incidents.enriched") {
        io.emit("new-incident", parsedData);
      } else if (topic === "runbooks.generated") {
        io.emit("runbook-ready", parsedData);
        console.log(`[🤖 BROADCASTED] Sent AI Runbook to War Room.`);
      }
    },
  });

  await app.listen({ port: 4000, host: "0.0.0.0" });
}

startGateway().catch(console.error);

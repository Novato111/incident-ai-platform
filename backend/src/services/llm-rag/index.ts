// backend/src/services/llm-rag/index.ts

import { Kafka } from "kafkajs";
import { Client } from "pg";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import * as dotenv from "dotenv";
import { Incident } from "../../../../shared/src/schemas/event.schema";

// Load our GOOGLE_API_KEY from the .env file
dotenv.config();

const kafka = new Kafka({
  clientId: "rag-engine",
  brokers: ["localhost:9092"],
});
const consumer = kafka.consumer({ groupId: "rag-engine-group" });
const producer = kafka.producer();

const dbClient = new Client({
  user: "admin",
  password: "admin",
  host: "localhost",
  port: 5432,
  database: "war_room",
});

// Initialize the real Gemini 1.5 Frelash model!
const llm = new ChatGoogleGenerativeAI({
  model: "gemini-3-flash-preview",
  maxOutputTokens: 1024,
  apiKey: process.env.GOOGLE_API_KEY, // <--- ADD THIS LINE
});

async function generateRunbook(
  currentIncident: Incident,
  historicalContext: any,
) {
  console.log(
    `🧠 [AI THINKING] Asking Gemini to analyze ${currentIncident.rootCauseService}...`,
  );

  // We build a highly specific prompt giving Gemini the context it needs
  let prompt = `
    You are an expert DevOps AI Assistant. An incident has just occurred in our microservice architecture.
    
    CURRENT INCIDENT:
    - Title: ${currentIncident.title}
    - Severity: ${currentIncident.severity}
    - Failing Service: ${currentIncident.rootCauseService}
  `;

  if (historicalContext) {
    prompt += `
    HISTORICAL CONTEXT (How we fixed a similar issue in the past):
    - Past Issue: ${historicalContext.title}
    - Past Resolution Steps: ${historicalContext.resolution_steps}
    
    INSTRUCTIONS:
    Write a brief, highly actionable runbook for the on-call engineer. 
    Format it in Markdown. Use bolding and bullet points. 
    Reference the historical context to suggest the exact commands or actions they should take right now.
    Keep it strictly technical. Do not write a generic introduction.
    `;
  } else {
    prompt += `
    INSTRUCTIONS:
    We have no historical data for this. Write a brief, Markdown-formatted checklist of the first 3 standard debugging steps a DevOps engineer should take for a failing microservice.
    `;
  }

  // Call the Gemini API!
  try {
    const response = await llm.invoke(prompt);

    // Return the generated Markdown string
    console.log(response.content.toString());
    return response.content.toString();
  } catch (error: any) {
    console.error("\n❌ [GEMINI ERROR]:", error.message || error);
    return `**AI Generation Failed:** ${error.message}. Escalate to human engineer.`;
  }
}

async function startRAGEngine() {
  await dbClient.connect();
  await consumer.connect();
  await producer.connect();

  await consumer.subscribe({
    topic: "runbooks.requested",
    fromBeginning: false,
  });

  console.log("🧠 Gemini RAG Engine waiting for manual requests...");

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      const incident = JSON.parse(message.value.toString()) as Incident;

      console.log(
        `[🔍 RETRIEVAL] Fetching history for ${incident.rootCauseService}...`,
      );

      // 1. Retrieve historical data from Postgres
      const res = await dbClient.query(
        "SELECT * FROM past_incidents WHERE service = $1 LIMIT 1",
        [incident.rootCauseService],
      );
      const pastIncident = res.rows[0];

      // 2. Generate the real Runbook using Gemini
      const aiRunbook = await generateRunbook(incident, pastIncident);

      // 3. Publish back to Kafka
      await producer.send({
        topic: "runbooks.generated",
        messages: [
          {
            value: JSON.stringify({
              incidentId: incident.id,
              runbook: aiRunbook,
            }),
          },
        ],
      });

      console.log(
        `[✅ RUNBOOK GENERATED] Gemini pushed solution for ${incident.title}.`,
      );
    },
  });
}

startRAGEngine().catch(console.error);

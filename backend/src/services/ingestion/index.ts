// backend/src/services/ingestion/index.ts

import Fastify from "fastify";
import { connectProducer, produceEvent } from "../../kafka/producer";
import { RawLog } from "../../../../shared/src/schemas/event.schema";

const app = Fastify({ logger: false });

// This is the endpoint our generator will hit
app.post("/ingest/logs", async (request, reply) => {
  // 1. Extract the payload. In a production app, we would validate this
  // with a library like Zod to ensure it perfectly matches the RawLog schema.
  const rawLog = request.body as RawLog;

  // 2. Wrap it in our union type so Kafka knows exactly what kind of event this is
  const streamEvent = { type: "LOG", payload: rawLog } as const;

  // 3. Push it to the 'raw.events' topic on Kafka
  await produceEvent("raw.events", streamEvent);

  // 4. Print to our backend console so we can see it working
  console.log(`[📥 INGESTED] Sent log to Kafka: ${rawLog.service}`);

  // 5. Tell the generator we caught it successfully
  return reply.status(200).send({ status: "success" });
});

// Boot up the server
async function startServer() {
  try {
    await connectProducer();
    await app.listen({ port: 3000, host: "0.0.0.0" });
    console.log("🚀 Ingestion API running at http://localhost:3000");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

startServer();

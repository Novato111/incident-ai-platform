// backend/src/db/seed.ts

import { Client } from "pg";

const client = new Client({
  user: "admin",
  password: "admin",
  host: "localhost",
  port: 5432,
  database: "war_room",
});

const HISTORICAL_DATA = [
  {
    service: "payment-service",
    title: "Stripe API connection timeout and high error rate",
    resolution_steps:
      "1. Verified Stripe API status page.\n2. Traffic spiked beyond standard rate limits.\n3. Scaled up payment-service replicas from 3 to 10.\n4. Flushed Redis cache to clear stalled connections.",
  },
  {
    service: "inventory-service",
    title: "Database query took too long and CPU spiked",
    resolution_steps:
      "1. Checked RDS performance insights.\n2. Found missing index on the products table.\n3. Executed CREATE INDEX concurrently on product_id.\n4. Restarted inventory pods.",
  },
  {
    service: "checkout-service",
    title: "High Error Rate detected in checkout-service",
    resolution_steps:
      "1. Traced logs and found checkout-service timing out.\n2. Inventory service was deadlocked.\n3. Temporarily disabled inventory validation flag.\n4. Paged Database team to kill blocking transaction.",
  },
];

async function seedDatabase() {
  await client.connect();
  console.log("🌱 Starting database seed (Using Mock Dev Embeddings)...");

  for (const incident of HISTORICAL_DATA) {
    // DEV MODE: Generate 1,536 random numbers to simulate an OpenAI embedding vector!
    const mockVector = Array.from({ length: 1536 }, () => Math.random());

    await client.query(
      "INSERT INTO past_incidents (service, title, resolution_steps, embedding) VALUES ($1, $2, $3, $4)",
      [
        incident.service,
        incident.title,
        incident.resolution_steps,
        `[${mockVector.join(",")}]`,
      ],
    );
    console.log(`✅ Seeded historical incident for ${incident.service}`);
  }

  await client.end();
  console.log("🏁 Seeding complete.");
}

seedDatabase().catch(console.error);

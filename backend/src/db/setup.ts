// backend/src/db/setup.ts

import { Client } from "pg";

const client = new Client({
  user: "admin",
  password: "admin",
  host: "localhost",
  port: 5432,
  database: "war_room",
});

async function setupDatabase() {
  await client.connect();
  console.log("🔌 Connected to Postgres.");

  try {
    // 1. Enable the vector extension
    await client.query("CREATE EXTENSION IF NOT EXISTS vector;");
    console.log("✅ pgvector extension enabled.");

    // 2. Create the table for our past incidents
    // We use vector(1536) because OpenAI's standard embedding model outputs 1,536 dimensions
    await client.query(`
      CREATE TABLE IF NOT EXISTS past_incidents (
        id SERIAL PRIMARY KEY,
        service VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        resolution_steps TEXT NOT NULL,
        embedding vector(1536)
      );
    `);
    console.log("✅ past_incidents table created.");
  } catch (err) {
    console.error("❌ Error setting up database:", err);
  } finally {
    await client.end();
  }
}

setupDatabase();

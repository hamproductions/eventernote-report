import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../drizzle/schema';

// Database connection string from environment variable
const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/eventernote_reports';

// Create postgres connection
const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10
});

// Initialize Drizzle ORM
export const db = drizzle(client, { schema });

// Helper to close connection (for graceful shutdown)
export async function closeDatabase() {
  await client.end();
}

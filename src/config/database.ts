// src/config/database.ts
import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined');
}

const queryClient = postgres(process.env.DATABASE_URL, {
  max: 20,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(queryClient);

// Test connection function
export async function testConnection() {
  try {
    const result = await queryClient`SELECT current_timestamp, version()`;
    console.log('Database connection successful!');
    console.log('PostgreSQL version:', result[0].version);
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

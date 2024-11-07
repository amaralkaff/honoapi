// src/config/database.config.ts
import * as dotenv from 'dotenv';
import { defineConfig } from 'drizzle-kit';

dotenv.config();

export default defineConfig({
  schema: './src/infrastructure/database/schema.ts',
  out: './src/infrastructure/database/migrations',
  verbose: true,
  strict: true,
  dialect: 'postgresql',
});

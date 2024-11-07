// drizzle.config.ts
import * as dotenv from 'dotenv';
import type { Config } from 'drizzle-kit';

dotenv.config();

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  strict: true,
  dialect: 'postgresql',
} satisfies Config;

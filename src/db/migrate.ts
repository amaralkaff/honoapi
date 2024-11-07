// src/db/migrate.ts
import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

dotenv.config();

const migrationClient = postgres(process.env.DATABASE_URL!, { max: 1 });

async function runMigrations() {
  try {
    const db = drizzle(migrationClient);

    console.log('Running migrations...');

    await migrate(db, {
      migrationsFolder: 'drizzle',
    });

    console.log('Migrations completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await migrationClient.end();
  }
}

runMigrations()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });

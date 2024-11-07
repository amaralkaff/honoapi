// src/db/test.ts
import { eq } from 'drizzle-orm';
import { db, pushSchema, testConnection } from './index';
import { users } from './schema';

async function runTests() {
  try {
    // Test connection
    console.log('Testing database connection...');
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Failed to connect to database');
    }

    // Create schema
    console.log('\nEnsuring database schema exists...');
    const schemaCreated = await pushSchema();
    if (!schemaCreated) {
      throw new Error('Failed to create database schema');
    }

    // Test operations
    console.log('\nTesting database operations...');

    // Clean up any existing test user
    await db.delete(users).where(eq(users.email, 'test@example.com'));

    // Create test user
    console.log('Creating test user...');
    const newUser = await db
      .insert(users)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        password: 'test123',
        role: 'user',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    console.log('Created user:', newUser[0]);

    // Query user
    console.log('\nQuerying test user...');
    const queriedUser = await db
      .select()
      .from(users)
      .where(eq(users.id, newUser[0].id));

    console.log('Queried user:', queriedUser[0]);

    // Clean up
    console.log('\nCleaning up...');
    await db.delete(users).where(eq(users.id, newUser[0].id));

    console.log('\nAll tests passed successfully! ✨');
    process.exit(0);
  } catch (error) {
    console.error(
      '\nTests failed:',
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  }
}

if (import.meta.url === new URL(import.meta.url).href) {
  runTests();
}

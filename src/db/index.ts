// src/db/index.ts
import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined');
}

// Client for general queries with connection pooling
const queryClient = postgres(process.env.DATABASE_URL, {
  max: 20,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(queryClient);

// Create enums and tables
export async function pushSchema() {
  try {
    console.log('Creating database schema...');

    // Create enums
    await queryClient`
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('admin', 'user', 'moderator');
        CREATE TYPE post_status AS ENUM ('draft', 'published', 'archived');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

    // Create users table
    await queryClient`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        role user_role NOT NULL DEFAULT 'user',
        password TEXT NOT NULL,
        avatar_url TEXT,
        bio TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        last_login TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `;

    // Create categories table
    await queryClient`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        parent_id INTEGER REFERENCES categories(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `;

    // Create posts table
    await queryClient`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        content TEXT NOT NULL,
        excerpt TEXT,
        cover_image TEXT,
        author_id INTEGER REFERENCES users(id) NOT NULL,
        status post_status NOT NULL DEFAULT 'draft',
        published_at TIMESTAMP WITH TIME ZONE,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `;

    // Create comments table
    await queryClient`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        author_id INTEGER REFERENCES users(id) NOT NULL,
        post_id INTEGER REFERENCES posts(id) NOT NULL,
        parent_id INTEGER REFERENCES comments(id),
        is_edited BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `;

    // Create post_categories table
    await queryClient`
      CREATE TABLE IF NOT EXISTS post_categories (
        post_id INTEGER REFERENCES posts(id) NOT NULL,
        category_id INTEGER REFERENCES categories(id) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        PRIMARY KEY (post_id, category_id)
      )
    `;

    // Create likes table
    await queryClient`
      CREATE TABLE IF NOT EXISTS likes (
        user_id INTEGER REFERENCES users(id) NOT NULL,
        post_id INTEGER REFERENCES posts(id) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        PRIMARY KEY (user_id, post_id)
      )
    `;

    console.log('Schema created successfully!');
    return true;
  } catch (error) {
    console.error('Failed to create schema:', error);
    return false;
  }
}

// Test connection and schema
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

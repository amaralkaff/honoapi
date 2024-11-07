// Update src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { UserUseCase } from './domain/usecases/user.usecase';
import { PostgresUserRepository } from './infrastructure/database/postgres.repository';
import { UserController } from './presentation/controllers/user.controller';
import { createUserRoutes } from './presentation/routes/user.routes';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors());

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Dependency Injection with PostgreSQL
const userRepository = new PostgresUserRepository();
const userUseCase = new UserUseCase(userRepository);
const userController = new UserController(userUseCase);

// Routes
app.route('/', createUserRoutes(userController));

// Error handling
app.notFound((c) => {
  return c.json({ message: 'Not Found' }, 404);
});

app.onError((err, c) => {
  console.error(`${err}`);
  return c.json({ message: 'Internal Server Error' }, 500);
});

// Start the server
const port = parseInt(process.env.PORT || '3000');
console.log(`Server is running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};

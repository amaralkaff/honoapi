// src/presentation/middlewares/validation.middleware.ts
import { Context, Next } from 'hono';

export const validateCreateUser = async (c: Context, next: Next) => {
  try {
    const body = await c.req.json();
    if (!body.name || typeof body.name !== 'string') {
      return c.json({ error: 'Name is required and must be a string' }, 400);
    }
    if (
      !body.email ||
      typeof body.email !== 'string' ||
      !body.email.includes('@')
    ) {
      return c.json({ error: 'Valid email is required' }, 400);
    }
    await next();
  } catch (error) {
    return c.json({ error: 'Invalid request body' }, 400);
  }
};

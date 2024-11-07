// src/presentation/routes/user.routes.ts
import { Hono } from 'hono';
import { UserController } from '../controllers/user.controller';
import { validateCreateUser } from '../middlewares/validation.middleware';

export const createUserRoutes = (userController: UserController) => {
  const router = new Hono();

  router.get('/users', (c) => userController.getAll(c));
  router.get('/users/:id', (c) => userController.getById(c));
  router.post('/users', validateCreateUser, (c) => userController.create(c));
  router.put('/users/:id', (c) => userController.update(c));
  router.delete('/users/:id', (c) => userController.delete(c));

  return router;
};

// src/presentation/controllers/user.controller.ts
import { Context } from 'hono';
import { CreateUserDTO } from '../../domain/entities/user.entity';
import { UserUseCase } from '../../domain/usecases/user.usecase';

export class UserController {
  constructor(private readonly userUseCase: UserUseCase) {}

  async getAll(c: Context) {
    try {
      const users = await this.userUseCase.getAllUsers();
      return c.json(users);
    } catch (error) {
      return c.json({ error: 'Failed to fetch users' }, 500);
    }
  }

  async getById(c: Context) {
    try {
      const id = parseInt(c.req.param('id'));
      const user = await this.userUseCase.getUserById(id);
      if (!user) return c.json({ error: 'User not found' }, 404);
      return c.json(user);
    } catch (error) {
      return c.json({ error: 'Failed to fetch user' }, 500);
    }
  }

  async create(c: Context) {
    try {
      const body = await c.req.json<CreateUserDTO>();
      const user = await this.userUseCase.createUser(body);
      return c.json(user, 201);
    } catch (error) {
      return c.json({ error: 'Failed to create user' }, 500);
    }
  }

  async update(c: Context) {
    try {
      const id = parseInt(c.req.param('id'));
      const body = await c.req.json();
      const user = await this.userUseCase.updateUser(id, body);
      if (!user) return c.json({ error: 'User not found' }, 404);
      return c.json(user);
    } catch (error) {
      return c.json({ error: 'Failed to update user' }, 500);
    }
  }

  async delete(c: Context) {
    try {
      const id = parseInt(c.req.param('id'));
      const success = await this.userUseCase.deleteUser(id);
      if (!success) return c.json({ error: 'User not found' }, 404);
      return c.json({ message: 'User deleted successfully' });
    } catch (error) {
      return c.json({ error: 'Failed to delete user' }, 500);
    }
  }
}

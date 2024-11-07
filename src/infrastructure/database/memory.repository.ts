// src/infrastructure/database/memory.repository.ts
import { CreateUserDTO, User } from '../../domain/entities/user.entity';
import { UserRepository } from '../../domain/repositories/user.repository';
import {
  PaginatedResult,
  PaginationParams,
} from '../../domain/repositories/base.repository';

export class InMemoryUserRepository implements UserRepository {
  findByEmail(_email: string): Promise<User | null> {
    throw new Error('Method not implemented.');
  }
  getUserStats(
    _userId: number
  ): Promise<{ posts: number; comments: number; likes: number }> {
    throw new Error('Method not implemented.');
  }
  private users: User[] = [];
  private currentId = 1;

  async findAll(
    params: PaginationParams & { search?: string } = {}
  ): Promise<PaginatedResult<User>> {
    const { limit = 10, page = 1 } = params;
    const offset = (page - 1) * limit;

    let filteredUsers = [...this.users];

    if (params.search) {
      const search = params.search.toLowerCase();
      filteredUsers = filteredUsers.filter(
        (user) =>
          user.name.toLowerCase().includes(search) ||
          user.email.toLowerCase().includes(search)
      );
    }

    const paginatedUsers = filteredUsers.slice(offset, offset + limit);

    return {
      data: paginatedUsers,
      meta: {
        total: filteredUsers.length,
        page,
        limit,
      },
    };
  }

  async findById(id: number): Promise<User | null> {
    return this.users.find((user) => user.id === id) || null;
  }

  async create(data: CreateUserDTO): Promise<User> {
    const user: User = {
      id: this.currentId++,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.push(user);
    return user;
  }

  async update(id: number, data: Partial<User>): Promise<User | null> {
    const index = this.users.findIndex((user) => user.id === id);
    if (index === -1) return null;

    const user = this.users[index];
    const updatedUser = {
      ...user,
      ...data,
      updatedAt: new Date(),
    };
    this.users[index] = updatedUser;
    return updatedUser;
  }

  async delete(id: number): Promise<boolean> {
    const index = this.users.findIndex((user) => user.id === id);
    if (index === -1) return false;
    this.users.splice(index, 1);
    return true;
  }
}

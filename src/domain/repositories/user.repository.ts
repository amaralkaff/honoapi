// src/domain/repositories/user.repository.ts
import { NewUser, User } from '../entities/user.entity';
import { PaginatedResult, PaginationParams } from './base.repository';

export interface UserRepository {
  findAll(
    params?: PaginationParams & { search?: string }
  ): Promise<PaginatedResult<User>>;
  findById(id: number): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(data: NewUser): Promise<User>;
  update(id: number, data: Partial<User>): Promise<User | null>;
  delete(id: number): Promise<boolean>;
  getUserStats(
    userId: number
  ): Promise<{ posts: number; comments: number; likes: number }>;
}

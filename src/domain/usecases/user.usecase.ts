// src/domain/usecases/user.usecase.ts
import { CreateUserDTO, User } from '../entities/user.entity';
import { UserRepository } from '../repositories/user.repository';
import { PaginatedResult } from '../repositories/base.repository';

export class UserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async getAllUsers(params?: {
    search?: string;
  }): Promise<PaginatedResult<User>> {
    return this.userRepository.findAll(params);
  }

  async getUserById(id: number): Promise<User | null> {
    return this.userRepository.findById(id);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  async createUser(data: CreateUserDTO): Promise<User> {
    return this.userRepository.create({
      ...data,
      password: data.password || '', // Temporary fix until CreateUserDTO is updated
    });
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | null> {
    return this.userRepository.update(id, data);
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.userRepository.delete(id);
  }

  async getUserStats(
    userId: number
  ): Promise<{ posts: number; comments: number; likes: number }> {
    return this.userRepository.getUserStats(userId);
  }
}

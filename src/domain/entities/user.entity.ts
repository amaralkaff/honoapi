// src/domain/entities/user.entity.ts
export interface User {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDTO {
  password: string;
  name: string;
  email: string;
}

export interface NewUser extends CreateUserDTO {
  password: string;
}

export interface UpdateUserDTO extends Partial<CreateUserDTO> {}

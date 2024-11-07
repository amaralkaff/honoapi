// src/domain/repositories/base.repository.ts
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { PgTable } from 'drizzle-orm/pg-core';

export interface PaginationParams {
  page?: number;
  limit?: number;
  orderBy?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

export abstract class BaseRepository<T> {
  constructor(
    protected readonly db: PostgresJsDatabase,
    protected readonly table: PgTable
  ) {}

  protected buildPagination(params: PaginationParams = {}) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const offset = (page - 1) * limit;

    return {
      limit,
      offset,
      page,
    };
  }
}

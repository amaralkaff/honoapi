// src/infrastructure/database/postgres.repository.ts
import { eq, like, or, sql } from 'drizzle-orm';
import { db } from '../../config/database';
import { comments, likes, posts, users } from '../../db/schema';
import { NewUser, User } from '../../domain/entities/user.entity';
import {
  BaseRepository,
  PaginatedResult,
  PaginationParams,
} from '../../domain/repositories/base.repository';
import { UserRepository } from '../../domain/repositories/user.repository';

export class PostgresUserRepository
  extends BaseRepository<User>
  implements UserRepository
{
  [x: string]: any;
  constructor() {
    super(db, users);
  }

  async findAll(
    params: PaginationParams & { search?: string } = {}
  ): Promise<PaginatedResult<User>> {
    const { limit, offset, page } = this.buildPagination(params);

    const baseQuery = db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users);

    let query = baseQuery;
    if (params.search) {
      query = this.search(query, params.search);
    }

    const [data, countResult] = await Promise.all([
      query.limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)::integer` }).from(users),
    ]);

    return {
      data: data as User[],
      meta: {
        total: countResult[0].count,
        page,
        limit,
      },
    };
  }

  async findById(id: number): Promise<User | null> {
    const result = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return (result[0] as User) || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return (result[0] as User) || null;
  }

  async create(data: NewUser): Promise<User> {
    const result = await db.insert(users).values(data).returning();
    return result[0] as User;
  }

  async update(id: number, data: Partial<User>): Promise<User | null> {
    const result = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    return (result[0] as User) || null;
  }

  async delete(id: number): Promise<boolean> {
    const result = await db
      .delete(users)
      .where(eq(users.id, id))
      .returning({ id: users.id });

    return result.length > 0;
  }

  async getUserStats(
    userId: number
  ): Promise<{ posts: number; comments: number; likes: number }> {
    const [postCount, commentCount, likeCount] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)::integer` })
        .from(posts)
        .where(eq(posts.authorId, userId)),
      db
        .select({ count: sql<number>`count(*)::integer` })
        .from(comments)
        .where(eq(comments.authorId, userId)),
      db
        .select({ count: sql<number>`count(*)::integer` })
        .from(likes)
        .where(eq(likes.userId, userId)),
    ]);

    return {
      posts: postCount[0].count || 0,
      comments: commentCount[0].count || 0,
      likes: likeCount[0].count || 0,
    };
  }
}

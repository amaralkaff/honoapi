// src/repositories/post.repository.ts
import { and, eq, like, or, sql } from 'drizzle-orm';
import { db } from '../../db';
import {
  categories,
  NewPost,
  Post,
  postCategories,
  posts,
  users,
  comments,
  likes,
} from '../../db/schema';
import { BaseRepository, PaginationParams } from './base.repository';

export interface PostSearchParams extends Omit<PaginationParams, 'orderBy'> {
  search?: string;
  authorId?: number;
  categoryId?: number;
  status?: 'draft' | 'published' | 'archived';
  orderBy?: keyof typeof posts;
  order?: 'asc' | 'desc';
}

export class PostRepository extends BaseRepository<Post> {
  constructor() {
    super(db, posts);
  }
  async findAll(params: PaginationParams & PostSearchParams = {}) {
    const { limit, offset, page } = this.buildPagination(params);
    const orderBy = params.orderBy || 'id';
    const order = params.order || 'asc';

    const baseQuery = db
      .select({
        post: posts,
        author: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
        categoryCount: sql<number>`count(distinct ${postCategories.categoryId})`,
        commentCount: sql<number>`count(distinct ${comments.id})`,
        likeCount: sql<number>`count(distinct ${likes.postId})`,
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .leftJoin(postCategories, eq(posts.id, postCategories.postId))
      .leftJoin(comments, eq(posts.id, comments.postId))
      .leftJoin(likes, eq(posts.id, likes.postId));

    // Build conditions array
    const conditions = [];

    if (params.search) {
      conditions.push(
        or(
          like(posts.title, `%${params.search}%`),
          like(posts.content, `%${params.search}%`)
        )
      );
    }

    if (params.authorId) {
      conditions.push(eq(posts.authorId, params.authorId));
    }

    if (params.categoryId) {
      conditions.push(eq(postCategories.categoryId, params.categoryId));
    }

    if (params.status) {
      conditions.push(eq(posts.status, params.status));
    }

    // Apply conditions if any exist
    const query =
      conditions.length > 0
        ? baseQuery.where(
            conditions.length === 1 ? conditions[0] : and(...conditions)
          )
        : baseQuery;

    // Execute query with group by, order by, and pagination
    const finalQuery = query
      .groupBy(posts.id, users.id)
      .orderBy(sql`${posts[orderBy]} ${order === 'asc' ? sql`asc` : sql`desc`}`)
      .limit(limit)
      .offset(offset);

    // Get total count
    const countQuery = db
      .select({ count: sql<number>`count(*)::int` })
      .from(posts);

    if (conditions.length > 0) {
      countQuery.where(
        conditions.length === 1 ? conditions[0] : and(...conditions)
      );
    }

    // Execute both queries
    const [data, countResult] = await Promise.all([finalQuery, countQuery]);

    return {
      data,
      meta: {
        total: countResult[0]?.count ?? 0,
        page,
        limit,
      },
    };
  }

  async findById(id: number) {
    const [post] = await db
      .select({
        post: posts,
        author: users,
        categories: sql<{ id: number; name: string }[]>`
          array_agg(distinct jsonb_build_object('id', ${categories.id}, 'name', ${categories.name}))
        `,
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .leftJoin(postCategories, eq(posts.id, postCategories.postId))
      .leftJoin(categories, eq(postCategories.categoryId, categories.id))
      .where(eq(posts.id, id))
      .groupBy(posts.id, users.id)
      .limit(1);

    return post || null;
  }

  async create(data: NewPost, categoryIds?: number[]) {
    return await db.transaction(async (tx) => {
      const [post] = await tx.insert(posts).values(data).returning();

      if (categoryIds?.length) {
        await tx.insert(postCategories).values(
          categoryIds.map((categoryId) => ({
            postId: post.id,
            categoryId,
          }))
        );
      }

      return post;
    });
  }

  async update(id: number, data: Partial<Post>, categoryIds?: number[]) {
    return await db.transaction(async (tx) => {
      const [post] = await tx
        .update(posts)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(posts.id, id))
        .returning();

      if (categoryIds?.length) {
        await tx.delete(postCategories).where(eq(postCategories.postId, id));
        await tx.insert(postCategories).values(
          categoryIds.map((categoryId) => ({
            postId: id,
            categoryId,
          }))
        );
      }

      return post;
    });
  }

  async delete(id: number) {
    return await db.transaction(async (tx) => {
      await tx.delete(postCategories).where(eq(postCategories.postId, id));
      const [post] = await tx.delete(posts).where(eq(posts.id, id)).returning();
      return post;
    });
  }

  async updateMetadata(id: number, metadata: Partial<Post['metadata']>) {
    const [post] = await db
      .update(posts)
      .set({
        metadata: sql`${posts.metadata}::jsonb || ${JSON.stringify(
          metadata
        )}::jsonb`,
        updatedAt: new Date(),
      })
      .where(eq(posts.id, id))
      .returning();

    return post || null;
  }
}

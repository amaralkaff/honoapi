// src/repositories/comment.repository.ts
import { and, eq, sql } from 'drizzle-orm';
import { db } from '../../db';
import { Comment, comments, NewComment, users } from '../../db/schema';
import { BaseRepository, PaginationParams } from './base.repository';

export interface CommentSearchParams extends PaginationParams {
  postId?: number;
  authorId?: number;
  parentId?: number | null;
  orderBy?: string;
  order?: 'asc' | 'desc';
}

export class CommentRepository extends BaseRepository<Comment> {
  constructor() {
    super(db, comments);
  }

  async findAll(params: CommentSearchParams = {}) {
    const { limit, offset, page } = this.buildPagination(params);
    const orderBy = params.orderBy || 'id';
    const order = params.order || 'asc';

    const baseQuery = db
      .select({
        comment: comments,
        author: {
          id: users.id,
          name: users.name,
        },
        replyCount: sql<number>`count(replies.id)`,
      })
      .from(comments)
      .leftJoin(users, eq(comments.authorId, users.id))
      .leftJoin(
        sql`comments as replies`,
        eq(comments.id, sql`replies.parent_id`)
      );

    // Build conditions array
    const conditions = [];

    if (params.postId) {
      conditions.push(eq(comments.postId, params.postId));
    }

    if (params.authorId) {
      conditions.push(eq(comments.authorId, params.authorId));
    }

    if (params.parentId !== undefined) {
      conditions.push(eq(comments.parentId, params.parentId));
    }

    // Apply conditions if any exist
    const query =
      conditions.length > 0
        ? baseQuery.where(
            conditions.length === 1 ? conditions[0] : and(...conditions)
          )
        : baseQuery;

    const finalQuery = query
      .groupBy(comments.id, users.id)
      .orderBy(
        order === 'asc' ? comments[orderBy] : sql`${comments[orderBy]} desc`
      )
      .limit(limit)
      .offset(offset);

    // Get total count
    const countQuery = db
      .select({ count: sql<number>`count(*)::int` })
      .from(comments);

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
    const [comment] = await db
      .select({
        comment: comments,
        author: users,
        replyCount: sql<number>`count(replies.id)`,
      })
      .from(comments)
      .leftJoin(users, eq(comments.authorId, users.id))
      .leftJoin(
        sql`comments as replies`,
        eq(comments.id, sql`replies.parent_id`)
      )
      .where(eq(comments.id, id))
      .groupBy(comments.id, users.id)
      .limit(1);

    return comment || null;
  }

  async create(data: NewComment) {
    const [comment] = await db.insert(comments).values(data).returning();
    return comment;
  }

  async update(id: number, data: Partial<Comment>) {
    const [comment] = await db
      .update(comments)
      .set({ ...data, updatedAt: new Date(), isEdited: true })
      .where(eq(comments.id, id))
      .returning();

    return comment || null;
  }

  async delete(id: number) {
    // First update all child comments to remove parent reference
    await db
      .update(comments)
      .set({ parentId: null })
      .where(eq(comments.parentId, id));

    const [comment] = await db
      .delete(comments)
      .where(eq(comments.id, id))
      .returning();

    return comment || null;
  }
}

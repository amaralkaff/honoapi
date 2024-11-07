// src/repositories/category.repository.ts
import { and, eq, like, or, sql, type SQL } from 'drizzle-orm';
import { db } from '../../db';
import {
  categories,
  Category,
  NewCategory,
  postCategories,
} from '../../db/schema';
import { BaseRepository, PaginationParams } from './base.repository';

export class CategoryRepository extends BaseRepository<Category> {
  constructor() {
    super(db, categories);
  }

  async findAll(
    params: PaginationParams & {
      search?: string;
      parentId?: number | null;
      orderBy?: keyof typeof categories;
      order?: 'asc' | 'desc';
    } = {}
  ) {
    const { limit, offset, page } = this.buildPagination(params);
    const orderBy = params.orderBy || 'id';
    const order = params.order || 'asc';

    const childrenAlias = sql.identifier('children.id');

    // Build base query
    const baseQuery = db
      .select({
        category: categories,
        postCount: sql<number>`count(distinct ${postCategories.postId})`,
        childCount: sql<number>`count(distinct ${childrenAlias})`,
      })
      .from(categories)
      .leftJoin(postCategories, eq(categories.id, postCategories.categoryId))
      .leftJoin(
        categories as unknown as typeof categories.$inferSelect,
        eq(categories.id, childrenAlias as unknown as SQL)
      );

    // Build conditions array
    const conditions: SQL[] = [];

    if (params.search) {
      return baseQuery.where(
        or(
          like(categories.name, `%${params.search}%`),
          like(categories.description!, `%${params.search}%`)
        )
      );
    }

    if (params.parentId !== undefined) {
      conditions.push(eq(categories.parentId, params.parentId));
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
      .groupBy(categories.id)
      .orderBy(
        order === 'asc' ? categories[orderBy] : sql`${categories[orderBy]} desc`
      )
      .limit(limit)
      .offset(offset);

    // Get total count
    const countQuery = db
      .select({ count: sql<number>`count(*)::int` })
      .from(categories);

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
    const parentAlias = sql.identifier('p.id');
    const childrenAlias = sql.identifier('children.id');

    const query = db
      .select({
        category: categories,
        postCount: sql<number>`count(distinct ${postCategories.postId})`,
        childCount: sql<number>`count(distinct ${childrenAlias})`,
        parent: sql<Category | null>`
          jsonb_build_object(
            'id', ${parentAlias},
            'name', p.name,
            'slug', p.slug
          ) filter (where ${parentAlias} is not null)
        `,
      })
      .from(categories)
      .leftJoin(postCategories, eq(categories.id, postCategories.categoryId))
      .leftJoin(
        categories as unknown as typeof categories.$inferSelect,
        eq(categories.id, childrenAlias as unknown as SQL)
      )
      .leftJoin(
        categories as unknown as typeof categories.$inferSelect,
        eq(categories.parentId, parentAlias as unknown as SQL)
      )
      .where(eq(categories.id, id))
      .groupBy(categories.id, parentAlias as unknown as SQL)
      .limit(1);

    const result = await query;
    return result[0] || null;
  }

  async getHierarchy() {
    const result = (await db.execute(
      sql.raw(`
      WITH RECURSIVE category_tree AS (
        -- Base case: get root categories
        SELECT
          c.*,
          0 as level,
          c.name::text as path
        FROM categories c
        WHERE parent_id IS NULL

        UNION ALL

        -- Recursive case: get child categories
        SELECT
          child.*,
          p.level + 1,
          (p.path || ' > ' || child.name)::text
        FROM categories child
        JOIN category_tree p ON child.parent_id = p.id
      )
      SELECT
        id,
        name,
        slug,
        parent_id as "parentId",
        level,
        path
      FROM category_tree
      ORDER BY path;
    `)
    )) as Array<{
      id: number;
      name: string;
      slug: string;
      parentId: number | null;
      level: number;
      path: string;
    }>;

    return result;
  }

  async create(data: NewCategory): Promise<Category> {
    const [category] = await db.insert(categories).values(data).returning();
    return category;
  }

  async update(id: number, data: Partial<Category>): Promise<Category | null> {
    const [category] = await db
      .update(categories)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();

    return category || null;
  }

  async delete(id: number): Promise<Category | null> {
    return await db.transaction(async (tx) => {
      await tx
        .update(categories)
        .set({ parentId: null })
        .where(eq(categories.parentId, id));

      await tx.delete(postCategories).where(eq(postCategories.categoryId, id));

      const [category] = await tx
        .delete(categories)
        .where(eq(categories.id, id))
        .returning();

      return category || null;
    });
  }
}

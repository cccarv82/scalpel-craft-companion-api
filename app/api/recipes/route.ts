import { and, asc, count, desc, eq, ilike, or, sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db, schema } from '@/db'
import { getUserFromRequest, requireUser } from '@/lib/auth'
import { MAX_RECIPES_PER_USER, recipeCreateSchema, recipeListQuerySchema } from '@/lib/schemas'
import { scanFields } from '@/lib/words'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const parsed = recipeListQuerySchema.safeParse(Object.fromEntries(url.searchParams))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const q = parsed.data

  const viewer = await getUserFromRequest(req)

  const filters = []
  // Default: only published unless caller asks for own drafts
  if (q.status) {
    filters.push(eq(schema.recipes.status, q.status))
    if (q.status !== 'published' && (!viewer || q.authorId !== viewer.id)) {
      // Non-published listings restricted to author
      if (!viewer) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
      filters.push(eq(schema.recipes.authorId, viewer.id))
    }
  } else {
    filters.push(eq(schema.recipes.status, 'published'))
  }

  if (q.slot) filters.push(eq(schema.recipes.slot, q.slot))
  if (q.poeVersion) filters.push(eq(schema.recipes.poeVersion, q.poeVersion))
  if (q.league && q.league !== 'all') {
    filters.push(or(eq(schema.recipes.league, q.league), eq(schema.recipes.league, 'all'))!)
  }
  if (q.authorId) filters.push(eq(schema.recipes.authorId, q.authorId))
  if (q.q) {
    const like = `%${q.q}%`
    filters.push(or(ilike(schema.recipes.title, like), ilike(schema.recipes.goal, like))!)
  }

  const where = filters.length > 0 ? and(...filters) : undefined
  const offset = (q.page - 1) * q.pageSize

  // Sort: top = upvotes desc; recent = createdAt desc; trending = upvotes / age decay
  const orderBy =
    q.sort === 'recent'
      ? [desc(schema.recipes.createdAt)]
      : q.sort === 'trending'
        ? [
            desc(
              sql`(${schema.recipes.upvotes}::float - ${schema.recipes.downvotes}::float) / (1 + extract(epoch from (now() - ${schema.recipes.createdAt})) / 86400)`,
            ),
          ]
        : [desc(sql`${schema.recipes.upvotes} - ${schema.recipes.downvotes}`), asc(schema.recipes.createdAt)]

  const rows = await db
    .select({
      id: schema.recipes.id,
      title: schema.recipes.title,
      slot: schema.recipes.slot,
      poeVersion: schema.recipes.poeVersion,
      league: schema.recipes.league,
      goal: schema.recipes.goal,
      difficulty: schema.recipes.difficulty,
      estimatedCostMin: schema.recipes.estimatedCostMin,
      estimatedCostMax: schema.recipes.estimatedCostMax,
      costCurrency: schema.recipes.costCurrency,
      baseRequirements: schema.recipes.baseRequirements,
      upvotes: schema.recipes.upvotes,
      downvotes: schema.recipes.downvotes,
      successCount: schema.recipes.successCount,
      viewCount: schema.recipes.viewCount,
      status: schema.recipes.status,
      createdAt: schema.recipes.createdAt,
      author: {
        id: schema.users.id,
        displayName: schema.users.displayName,
      },
    })
    .from(schema.recipes)
    .leftJoin(schema.users, eq(schema.users.id, schema.recipes.authorId))
    .where(where)
    .orderBy(...orderBy)
    .limit(q.pageSize)
    .offset(offset)

  const totalRes = await db.select({ total: count(schema.recipes.id) }).from(schema.recipes).where(where)
  const total = totalRes[0]?.total ?? 0

  return NextResponse.json({ recipes: rows, page: q.page, pageSize: q.pageSize, total, sort: q.sort })
}

export async function POST(req: Request) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }
  const parsed = recipeCreateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const data = parsed.data

  const stepTexts = data.steps.flatMap((s) => [s.title, s.description, s.stopLoss ?? ''])
  const scan = scanFields(
    data.title,
    data.goal,
    data.baseRequirements.hint ?? '',
    ...data.notes,
    ...data.pricingTips,
    ...stepTexts,
  )
  if (!scan.ok) return NextResponse.json({ error: 'rmt_blocked', match: scan.match }, { status: 400 })

  const [{ recipeCount }] = await db
    .select({ recipeCount: count(schema.recipes.id) })
    .from(schema.recipes)
    .where(eq(schema.recipes.authorId, auth.id))
  if (recipeCount >= MAX_RECIPES_PER_USER) {
    return NextResponse.json({ error: 'limit_reached', max: MAX_RECIPES_PER_USER }, { status: 429 })
  }

  const inserted = await db
    .insert(schema.recipes)
    .values({
      authorId: auth.id,
      title: data.title,
      slot: data.slot,
      poeVersion: data.poeVersion,
      league: data.league,
      goal: data.goal,
      difficulty: data.difficulty,
      estimatedCostMin: data.estimatedCostMin != null ? data.estimatedCostMin.toString() : null,
      estimatedCostMax: data.estimatedCostMax != null ? data.estimatedCostMax.toString() : null,
      costCurrency: data.costCurrency,
      baseRequirements: data.baseRequirements,
      steps: data.steps,
      pricingTips: data.pricingTips,
      notes: data.notes,
      status: 'draft',
    })
    .returning({ id: schema.recipes.id })

  return NextResponse.json({ id: inserted[0].id }, { status: 201 })
}

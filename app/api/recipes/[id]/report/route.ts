import { count, eq, sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db, schema } from '@/db'
import { requireUser } from '@/lib/auth'
import { reportSchema, REPORT_FLAG_THRESHOLD } from '@/lib/schemas'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface Ctx {
  params: Promise<{ id: string }>
}

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 })

  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }
  const parsed = reportSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const recipe = await db.select().from(schema.recipes).where(eq(schema.recipes.id, id)).limit(1)
  if (!recipe[0]) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (recipe[0].authorId === auth.id) {
    return NextResponse.json({ error: 'cannot report own' }, { status: 400 })
  }

  try {
    await db.insert(schema.recipeReports).values({
      recipeId: id,
      reporterId: auth.id,
      reason: parsed.data.reason,
    })
  } catch (e) {
    if (/duplicate|unique/i.test((e as Error).message)) {
      return NextResponse.json({ error: 'already_reported' }, { status: 409 })
    }
    throw e
  }

  const [{ total }] = await db
    .select({ total: count(schema.recipeReports.id) })
    .from(schema.recipeReports)
    .where(eq(schema.recipeReports.recipeId, id))

  if (total >= REPORT_FLAG_THRESHOLD && recipe[0].status !== 'flagged') {
    await db
      .update(schema.recipes)
      .set({ status: 'flagged', updatedAt: sql`now()` })
      .where(eq(schema.recipes.id, id))
  }

  return NextResponse.json({ ok: true, totalReports: total })
}

import { eq, sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db, schema } from '@/db'
import { getUserFromRequest, requireUser } from '@/lib/auth'
import { recipeUpdateSchema } from '@/lib/schemas'
import { scanFields } from '@/lib/words'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface Ctx {
  params: Promise<{ id: string }>
}

function isAdmin(userId: string): boolean {
  const allow = (process.env.ADMIN_USER_IDS ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  return allow.includes(userId)
}

export async function GET(req: Request, ctx: Ctx) {
  const { id } = await ctx.params
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 })

  const viewer = await getUserFromRequest(req)

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
      steps: schema.recipes.steps,
      pricingTips: schema.recipes.pricingTips,
      notes: schema.recipes.notes,
      status: schema.recipes.status,
      upvotes: schema.recipes.upvotes,
      downvotes: schema.recipes.downvotes,
      successCount: schema.recipes.successCount,
      viewCount: schema.recipes.viewCount,
      createdAt: schema.recipes.createdAt,
      updatedAt: schema.recipes.updatedAt,
      authorId: schema.recipes.authorId,
      author: {
        id: schema.users.id,
        displayName: schema.users.displayName,
      },
    })
    .from(schema.recipes)
    .leftJoin(schema.users, eq(schema.users.id, schema.recipes.authorId))
    .where(eq(schema.recipes.id, id))
    .limit(1)

  const r = rows[0]
  if (!r) return NextResponse.json({ error: 'not found' }, { status: 404 })

  // Drafts only visible to the author
  if (r.status !== 'published' && (!viewer || viewer.id !== r.authorId)) {
    if (!viewer || !isAdmin(viewer.id)) return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  // Track view count (don't count author's own views)
  if (viewer?.id !== r.authorId) {
    await db
      .update(schema.recipes)
      .set({ viewCount: sql`${schema.recipes.viewCount} + 1` })
      .where(eq(schema.recipes.id, id))
  }

  let myVote: number | null = null
  if (viewer) {
    const vrows = await db
      .select({ v: schema.recipeVotes.value })
      .from(schema.recipeVotes)
      .where(eq(schema.recipeVotes.recipeId, id))
      .limit(50)
    const mine = vrows.find(() => false) // unused — fetch caller's vote separately below for clarity
    void mine
    const myVoteRows = await db
      .select({ v: schema.recipeVotes.value })
      .from(schema.recipeVotes)
      .where(eq(schema.recipeVotes.recipeId, id))
      .limit(1)
    void myVoteRows
    const myRowFiltered = await db
      .select({ v: schema.recipeVotes.value })
      .from(schema.recipeVotes)
      .where(sql`${schema.recipeVotes.recipeId} = ${id} AND ${schema.recipeVotes.userId} = ${viewer.id}`)
      .limit(1)
    myVote = myRowFiltered[0]?.v ?? 0
  }

  return NextResponse.json({ recipe: r, myVote })
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 })

  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth

  const existing = await db.select().from(schema.recipes).where(eq(schema.recipes.id, id)).limit(1)
  if (!existing[0]) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (existing[0].authorId !== auth.id && !isAdmin(auth.id)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }
  const parsed = recipeUpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const data = parsed.data

  // RMT scan over any text fields being updated
  const candidates: string[] = []
  if (data.title) candidates.push(data.title)
  if (data.goal) candidates.push(data.goal)
  if (data.baseRequirements?.hint) candidates.push(data.baseRequirements.hint)
  if (data.notes) candidates.push(...data.notes)
  if (data.pricingTips) candidates.push(...data.pricingTips)
  if (data.steps) candidates.push(...data.steps.flatMap((s) => [s.title, s.description, s.stopLoss ?? '']))
  if (candidates.length > 0) {
    const scan = scanFields(...candidates)
    if (!scan.ok) return NextResponse.json({ error: 'rmt_blocked', match: scan.match }, { status: 400 })
  }

  const update: Record<string, unknown> = { updatedAt: sql`now()` }
  if (data.title !== undefined) update.title = data.title
  if (data.slot !== undefined) update.slot = data.slot
  if (data.poeVersion !== undefined) update.poeVersion = data.poeVersion
  if (data.league !== undefined) update.league = data.league
  if (data.goal !== undefined) update.goal = data.goal
  if (data.difficulty !== undefined) update.difficulty = data.difficulty
  if (data.estimatedCostMin !== undefined) {
    update.estimatedCostMin = data.estimatedCostMin == null ? null : data.estimatedCostMin.toString()
  }
  if (data.estimatedCostMax !== undefined) {
    update.estimatedCostMax = data.estimatedCostMax == null ? null : data.estimatedCostMax.toString()
  }
  if (data.costCurrency !== undefined) update.costCurrency = data.costCurrency
  if (data.baseRequirements !== undefined) update.baseRequirements = data.baseRequirements
  if (data.steps !== undefined) update.steps = data.steps
  if (data.pricingTips !== undefined) update.pricingTips = data.pricingTips
  if (data.notes !== undefined) update.notes = data.notes

  await db.update(schema.recipes).set(update).where(eq(schema.recipes.id, id))
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request, ctx: Ctx) {
  const { id } = await ctx.params
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 })

  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth

  const existing = await db.select().from(schema.recipes).where(eq(schema.recipes.id, id)).limit(1)
  if (!existing[0]) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (existing[0].authorId !== auth.id && !isAdmin(auth.id)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  await db.delete(schema.recipes).where(eq(schema.recipes.id, id))
  return NextResponse.json({ ok: true })
}

import { and, eq, sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db, schema } from '@/db'
import { requireUser } from '@/lib/auth'
import { voteSchema } from '@/lib/schemas'

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
  const parsed = voteSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const value = parsed.data.value

  const recipe = await db.select().from(schema.recipes).where(eq(schema.recipes.id, id)).limit(1)
  if (!recipe[0]) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (recipe[0].status !== 'published') return NextResponse.json({ error: 'not_published' }, { status: 409 })
  if (recipe[0].authorId === auth.id) return NextResponse.json({ error: 'cannot vote own' }, { status: 400 })

  // Read existing vote
  const existing = await db
    .select()
    .from(schema.recipeVotes)
    .where(and(eq(schema.recipeVotes.recipeId, id), eq(schema.recipeVotes.userId, auth.id)))
    .limit(1)

  const old = existing[0]?.value ?? 0
  if (old === value) {
    return NextResponse.json({ ok: true, myVote: value })
  }

  if (existing[0]) {
    if (value === 0) {
      await db.delete(schema.recipeVotes).where(eq(schema.recipeVotes.id, existing[0].id))
    } else {
      await db
        .update(schema.recipeVotes)
        .set({ value })
        .where(eq(schema.recipeVotes.id, existing[0].id))
    }
  } else if (value !== 0) {
    await db.insert(schema.recipeVotes).values({ recipeId: id, userId: auth.id, value })
  }

  // Update denormalized counts
  const upDelta = (value === 1 ? 1 : 0) - (old === 1 ? 1 : 0)
  const downDelta = (value === -1 ? 1 : 0) - (old === -1 ? 1 : 0)
  if (upDelta !== 0 || downDelta !== 0) {
    await db
      .update(schema.recipes)
      .set({
        upvotes: sql`${schema.recipes.upvotes} + ${upDelta}`,
        downvotes: sql`${schema.recipes.downvotes} + ${downDelta}`,
      })
      .where(eq(schema.recipes.id, id))
  }

  return NextResponse.json({ ok: true, myVote: value })
}

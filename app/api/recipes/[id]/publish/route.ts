import { eq, sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db, schema } from '@/db'
import { requireUser } from '@/lib/auth'
import { emitEvent } from '@/lib/events'

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

  const existing = await db.select().from(schema.recipes).where(eq(schema.recipes.id, id)).limit(1)
  if (!existing[0]) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (existing[0].authorId !== auth.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  if (existing[0].status === 'published') return NextResponse.json({ ok: true, status: 'published' })
  if (existing[0].status === 'flagged') return NextResponse.json({ error: 'recipe_flagged' }, { status: 409 })

  await db
    .update(schema.recipes)
    .set({ status: 'published', updatedAt: sql`now()` })
    .where(eq(schema.recipes.id, id))

  await emitEvent(auth.id, 'recipe_published', { recipeId: id, title: existing[0].title })

  return NextResponse.json({ ok: true, status: 'published' })
}

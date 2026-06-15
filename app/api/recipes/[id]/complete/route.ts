import { eq, sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db, schema } from '@/db'
import { requireUser } from '@/lib/auth'
import { emitEvent } from '@/lib/events'
import { completionSchema } from '@/lib/schemas'
import { scanFields } from '@/lib/words'

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
  const parsed = completionSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const data = parsed.data

  if (data.notes) {
    const scan = scanFields(data.notes)
    if (!scan.ok) return NextResponse.json({ error: 'rmt_blocked', match: scan.match }, { status: 400 })
  }

  const recipe = await db.select().from(schema.recipes).where(eq(schema.recipes.id, id)).limit(1)
  if (!recipe[0]) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (recipe[0].status !== 'published') return NextResponse.json({ error: 'not_published' }, { status: 409 })

  await db.insert(schema.recipeCompletions).values({
    recipeId: id,
    userId: auth.id,
    outcome: data.outcome,
    attempts: data.attempts,
    costSpent: data.costSpent != null ? data.costSpent.toString() : null,
    notes: data.notes,
  })

  if (data.outcome === 'success') {
    await db
      .update(schema.recipes)
      .set({ successCount: sql`${schema.recipes.successCount} + 1` })
      .where(eq(schema.recipes.id, id))
  }

  if (recipe[0].authorId && recipe[0].authorId !== auth.id) {
    await emitEvent(recipe[0].authorId, 'new_completion', {
      recipeId: id,
      userId: auth.id,
      userName: auth.displayName,
      outcome: data.outcome,
    })
  }

  return NextResponse.json({ ok: true })
}

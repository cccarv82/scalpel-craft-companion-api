import { desc, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db, schema } from '@/db'
import { getUserFromRequest, requireUser } from '@/lib/auth'
import { commentSchema } from '@/lib/schemas'
import { scanFields } from '@/lib/words'
import { emitEvent } from '@/lib/events'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface Ctx {
  params: Promise<{ id: string }>
}

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 })

  const rows = await db
    .select({
      id: schema.recipeComments.id,
      body: schema.recipeComments.body,
      createdAt: schema.recipeComments.createdAt,
      author: {
        id: schema.users.id,
        displayName: schema.users.displayName,
      },
    })
    .from(schema.recipeComments)
    .leftJoin(schema.users, eq(schema.users.id, schema.recipeComments.userId))
    .where(eq(schema.recipeComments.recipeId, id))
    .orderBy(desc(schema.recipeComments.createdAt))
    .limit(100)

  return NextResponse.json({ comments: rows })
}

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 })

  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth

  // Confirm recipe still exists and is visible
  const recipe = await db.select().from(schema.recipes).where(eq(schema.recipes.id, id)).limit(1)
  if (!recipe[0]) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (recipe[0].status === 'flagged') return NextResponse.json({ error: 'not_available' }, { status: 410 })

  // Also ensure the commenter can see the recipe (drafts are author-only)
  const viewer = await getUserFromRequest(req)
  if (recipe[0].status !== 'published' && (!viewer || viewer.id !== recipe[0].authorId)) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }
  const parsed = commentSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const scan = scanFields(parsed.data.body)
  if (!scan.ok) return NextResponse.json({ error: 'rmt_blocked', match: scan.match }, { status: 400 })

  const inserted = await db
    .insert(schema.recipeComments)
    .values({ recipeId: id, userId: auth.id, body: parsed.data.body })
    .returning({ id: schema.recipeComments.id })

  if (recipe[0].authorId && recipe[0].authorId !== auth.id) {
    await emitEvent(recipe[0].authorId, 'recipe_comment', {
      recipeId: id,
      commenterId: auth.id,
      commenterName: auth.displayName,
      commentId: inserted[0].id,
    })
  }

  return NextResponse.json({ id: inserted[0].id }, { status: 201 })
}

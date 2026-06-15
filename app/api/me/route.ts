import { count, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db, schema } from '@/db'
import { requireUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: Request) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth

  const [{ recipesAuthored }] = await db
    .select({ recipesAuthored: count(schema.recipes.id) })
    .from(schema.recipes)
    .where(eq(schema.recipes.authorId, auth.id))

  const [{ completions }] = await db
    .select({ completions: count(schema.recipeCompletions.id) })
    .from(schema.recipeCompletions)
    .where(eq(schema.recipeCompletions.userId, auth.id))

  return NextResponse.json({
    user: auth,
    stats: { recipesAuthored, completions },
  })
}

import { db, schema } from '@/db'

export type EventKind = 'recipe_published' | 'recipe_flagged' | 'recipe_comment' | 'new_completion'

export async function emitEvent(
  userId: string,
  kind: EventKind,
  payload: Record<string, unknown> = {},
): Promise<void> {
  await db.insert(schema.events).values({ userId, kind, payload })
}

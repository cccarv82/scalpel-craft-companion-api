import { eq } from 'drizzle-orm'
import { db, schema } from '@/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const VALID_VERSIONS = new Set(['poe1', 'poe2'])

export async function GET(req: Request) {
  const url = new URL(req.url)
  const version = url.searchParams.get('v') ?? 'poe2'
  if (!VALID_VERSIONS.has(version)) {
    return Response.json({ error: 'invalid version' }, { status: 400 })
  }

  const rows = await db.select().from(schema.modDataset).where(eq(schema.modDataset.id, version)).limit(1)
  const row = rows[0]
  if (!row) return Response.json({ error: 'not_ready' }, { status: 404 })

  const etag = `W/"${row.sourceHash ?? row.updatedAt.toISOString()}"`
  const ifNone = req.headers.get('if-none-match')
  if (ifNone && ifNone === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } })
  }

  return new Response(JSON.stringify(row.data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ETag: etag,
      'Cache-Control': 'public, max-age=3600',
    },
  })
}

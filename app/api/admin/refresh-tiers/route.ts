import { sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db, schema } from '@/db'
import { fetchPoeData } from '@/lib/repoe-fork'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

// Manual / cron-triggered refresh of the RePoE-fork mirror.
// Protect with Authorization: Bearer <CRON_SECRET>.
export async function POST(req: Request) {
  const auth = req.headers.get('authorization') ?? ''
  const expected = `Bearer ${process.env.CRON_SECRET ?? ''}`
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const url = new URL(req.url)
  const versionsParam = url.searchParams.get('versions') ?? 'poe2'
  const versions = versionsParam
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v === 'poe1' || v === 'poe2') as ('poe1' | 'poe2')[]

  const results: Record<string, { mods: number; bases: number; pools: number; sourceHash: string }> = {}

  for (const v of versions) {
    const numeric = v === 'poe1' ? 1 : 2
    const { dataset, sourceHash } = await fetchPoeData(numeric)
    await db
      .insert(schema.modDataset)
      .values({
        id: v,
        schemaVersion: dataset.schemaVersion,
        data: dataset,
        sourceHash,
      })
      .onConflictDoUpdate({
        target: schema.modDataset.id,
        set: {
          schemaVersion: dataset.schemaVersion,
          data: dataset,
          sourceHash,
          updatedAt: sql`now()`,
        },
      })
    results[v] = {
      mods: dataset.mods.length,
      bases: Object.keys(dataset.bases).length,
      pools: dataset.pools.length,
      sourceHash,
    }
  }

  return NextResponse.json({ ok: true, results })
}

import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db, schema } from '@/db'
import { modLookupSchema } from '@/lib/schemas'
import type { CompactDataset } from '@/lib/repoe-fork'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// POST { baseType, modText, version? }  → { matches: [{ tier, modName, group, level, rollRange }] }
// Lightweight lookup so the plugin can show tier info per mod after Ctrl+D.
export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }
  const parsed = modLookupSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const url = new URL(req.url)
  const v = url.searchParams.get('v') ?? 'poe2'
  const row = await db.select().from(schema.modDataset).where(eq(schema.modDataset.id, v)).limit(1)
  if (!row[0]) return NextResponse.json({ error: 'dataset_not_ready' }, { status: 503 })

  const dataset = row[0].data as CompactDataset
  const { baseType, modText } = parsed.data

  const poolIdx = dataset.bases[baseType]
  if (poolIdx == null) {
    return NextResponse.json({ matches: [], note: `base "${baseType}" not in dataset` })
  }
  const pool = dataset.pools[poolIdx]

  const normalized = normalizeModText(modText)

  const matches: Array<{
    tier: number
    modName: string
    group: string
    level: number
    rollRange: [number, number][]
  }> = []
  for (const group of Object.keys(pool)) {
    const ladder = pool[group]
    for (let i = 0; i < ladder.length; i++) {
      const modIdx = ladder[i]
      const m = dataset.mods[modIdx]
      const candidateText = normalizeModText(m.t)
      if (textsMatch(candidateText, normalized)) {
        matches.push({
          tier: ladder.length - i, // top = T1
          modName: m.n,
          group,
          level: m.l,
          rollRange: m.s.map((s) => [s[1], s[2]] as [number, number]),
        })
      }
    }
  }

  matches.sort((a, b) => a.tier - b.tier)
  return NextResponse.json({ matches })
}

function normalizeModText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[+]?\d+(\.\d+)?/g, '#') // numbers -> #
    .replace(/\s+/g, ' ')
    .replace(/[.,]/g, '')
    .trim()
}

function textsMatch(candidate: string, input: string): boolean {
  if (candidate === input) return true
  if (candidate.includes('# to # ') || candidate.includes('# to #')) {
    // tolerate "# to # life" vs "#-# life"
    const c = candidate.replace('# to #', '# #')
    const i = input.replace('# to #', '# #')
    return c === i
  }
  return false
}

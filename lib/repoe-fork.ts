// Build a compact dataset from RePoE-fork's PoE2 dumps, mirroring Scalpel's
// internal builder so the plugin can read it the same way. The dataset is
// ~300 KB gzipped which is acceptable to ship as a JSON response.

import { createHash } from 'node:crypto'

const SOURCES = {
  poe1: 'https://repoe-fork.github.io/',
  poe2: 'https://repoe-fork.github.io/poe2/',
}

export const SCHEMA_VERSION = 1

interface UpstreamModEntry {
  name: string
  required_level?: number
  groups?: string[]
  domain?: string
  stats?: Array<{ id: string; min: number; max: number }>
  text?: string
}

interface UpstreamBaseEntry {
  name?: string
  tags?: string[]
  item_class?: string
}

interface UpstreamModsByBase {
  [itemClass: string]: {
    [tagCombo: string]: {
      bases?: string[]
      mods?: {
        [family: string]: {
          [group: string]: {
            [modId: string]: unknown
          }
        }
      }
    }
  }
}

interface CompactMod {
  n: string // name
  l: number // required_level
  g: string // primary group
  s: [string, number, number][] // stats
  t: string // text
}

export interface CompactDataset {
  schemaVersion: number
  mods: CompactMod[]
  pools: Record<string, number[]>[]
  bases: Record<string, number>
}

export async function fetchPoeData(version: 1 | 2): Promise<{ dataset: CompactDataset; sourceHash: string }> {
  const base = version === 2 ? SOURCES.poe2 : SOURCES.poe1
  const [modsByBase, mods, baseItems] = await Promise.all([
    fetchJson<UpstreamModsByBase>(`${base}mods_by_base.json`),
    fetchJson<Record<string, UpstreamModEntry>>(`${base}mods.json`),
    fetchJson<Record<string, UpstreamBaseEntry>>(`${base}base_items.json`),
  ])

  const dataset = buildCompact(modsByBase, mods, baseItems)
  const sourceHash = createHash('sha256').update(JSON.stringify(dataset.mods.length) + dataset.bases).digest('hex').slice(0, 16)
  return { dataset, sourceHash }
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { 'User-Agent': 'Scalpel-Craft-Companion/1.0' } })
  if (!res.ok) throw new Error(`fetch ${url} failed: ${res.status}`)
  return (await res.json()) as T
}

function buildCompact(
  modsByBase: UpstreamModsByBase,
  mods: Record<string, UpstreamModEntry>,
  baseItems: Record<string, UpstreamBaseEntry>,
): CompactDataset {
  const modIndex = new Map<string, number>()
  const outMods: CompactMod[] = []

  function internMod(modId: string): number {
    const cached = modIndex.get(modId)
    if (cached !== undefined) return cached
    const m = mods[modId]
    if (!m || m.domain !== 'item') return -1
    const stats: [string, number, number][] = (m.stats ?? []).map((s) => [s.id, s.min, s.max])
    if (stats.length === 0) return -1
    const idx = outMods.length
    outMods.push({
      n: m.name,
      l: m.required_level ?? 1,
      g: (m.groups && m.groups[0]) || '',
      s: stats,
      t: m.text ?? '',
    })
    modIndex.set(modId, idx)
    return idx
  }

  const baseMaps: Record<string, Record<string, number[]>> = {}

  for (const cls of Object.keys(modsByBase)) {
    for (const combo of Object.keys(modsByBase[cls])) {
      const entry = modsByBase[cls][combo]
      const groupToIds: Record<string, string[]> = {}
      for (const family of Object.keys(entry.mods ?? {})) {
        for (const group of Object.keys(entry.mods![family])) {
          const ids = Object.keys(entry.mods![family][group])
          if (!groupToIds[group]) groupToIds[group] = []
          groupToIds[group].push(...ids)
        }
      }
      const compactGroups: Record<string, number[]> = {}
      for (const group of Object.keys(groupToIds)) {
        const indices = groupToIds[group]
          .map(internMod)
          .filter((i) => i >= 0)
          .sort((a, b) => outMods[a].l - outMods[b].l)
        if (indices.length > 0) compactGroups[group] = indices
      }
      if (Object.keys(compactGroups).length === 0) continue
      for (const metaPath of entry.bases ?? []) {
        const bi = baseItems[metaPath]
        if (!bi || !bi.name) continue
        baseMaps[bi.name] = { ...(baseMaps[bi.name] || {}), ...compactGroups }
      }
    }
  }

  const pools: Record<string, number[]>[] = []
  const poolKey = new Map<string, number>()
  const bases: Record<string, number> = {}
  for (const name of Object.keys(baseMaps)) {
    const canon: Record<string, number[]> = {}
    for (const g of Object.keys(baseMaps[name]).sort()) canon[g] = baseMaps[name][g]
    const key = JSON.stringify(canon)
    let idx = poolKey.get(key)
    if (idx === undefined) {
      idx = pools.length
      pools.push(canon)
      poolKey.set(key, idx)
    }
    bases[name] = idx
  }

  return { schemaVersion: SCHEMA_VERSION, mods: outMods, pools, bases }
}

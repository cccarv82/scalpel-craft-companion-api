#!/usr/bin/env node
// Seed recipes from data/recipes/*.json into the recipes table.
// Usage:  node scripts/seed-recipes.mjs [--update]
//   --update : if a recipe with the same title+slot+poeVersion exists, update it.
//              otherwise leave it alone.

import { readdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const recipesDir = join(here, '..', 'data', 'recipes')

// Load .env.local manually so we don't depend on extra packages
const envPath = join(here, '..', '.env.local')
try {
  const txt = readFileSync(envPath, 'utf-8')
  for (const line of txt.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
} catch {}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not set — load it from Vercel via `vercel env pull .env.local` or fill manually.')
  process.exit(1)
}

const { neon } = await import('@neondatabase/serverless')
const sql = neon(process.env.DATABASE_URL)

const update = process.argv.includes('--update')

const files = readdirSync(recipesDir).filter((f) => f.endsWith('.json'))
console.log(`Found ${files.length} recipe file(s) in ${recipesDir}`)

let created = 0
let updated = 0
let skipped = 0

for (const file of files) {
  const raw = readFileSync(join(recipesDir, file), 'utf-8')
  const r = JSON.parse(raw)

  const existing = await sql`
    SELECT id, status FROM recipes
    WHERE title = ${r.title} AND slot = ${r.slot} AND poe_version = ${r.poeVersion}
    LIMIT 1
  `

  if (existing.length > 0) {
    if (!update) {
      console.log(`  • skip (exists): ${r.title}`)
      skipped++
      continue
    }
    await sql`
      UPDATE recipes
      SET goal = ${r.goal},
          difficulty = ${r.difficulty ?? 3},
          estimated_cost_min = ${r.estimatedCostMin ?? null},
          estimated_cost_max = ${r.estimatedCostMax ?? null},
          cost_currency = ${r.costCurrency ?? 'divine'},
          base_requirements = ${JSON.stringify(r.baseRequirements)}::jsonb,
          steps = ${JSON.stringify(r.steps)}::jsonb,
          pricing_tips = ${JSON.stringify(r.pricingTips ?? [])}::jsonb,
          notes = ${JSON.stringify(r.notes ?? [])}::jsonb,
          league = ${r.league ?? 'all'},
          updated_at = now()
      WHERE id = ${existing[0].id}
    `
    console.log(`  • updated: ${r.title}`)
    updated++
    continue
  }

  await sql`
    INSERT INTO recipes (
      author_id, title, slot, poe_version, league, goal, difficulty,
      estimated_cost_min, estimated_cost_max, cost_currency,
      base_requirements, steps, pricing_tips, notes, status
    ) VALUES (
      NULL, ${r.title}, ${r.slot}, ${r.poeVersion}, ${r.league ?? 'all'}, ${r.goal}, ${r.difficulty ?? 3},
      ${r.estimatedCostMin ?? null}, ${r.estimatedCostMax ?? null}, ${r.costCurrency ?? 'divine'},
      ${JSON.stringify(r.baseRequirements)}::jsonb,
      ${JSON.stringify(r.steps)}::jsonb,
      ${JSON.stringify(r.pricingTips ?? [])}::jsonb,
      ${JSON.stringify(r.notes ?? [])}::jsonb,
      'published'
    )
  `
  console.log(`  ✓ created: ${r.title}`)
  created++
}

console.log(`\nDone. created=${created} updated=${updated} skipped=${skipped}`)

import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http'
import * as schema from './schema'

let _sql: NeonQueryFunction<false, false> | null = null
let _db: NeonHttpDatabase<typeof schema> | null = null

function ensure() {
  if (_db) return
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')
  _sql = neon(url)
  _db = drizzle(_sql, { schema })
}

function sqlTarget(..._args: unknown[]) {
  return undefined
}
export const sql: NeonQueryFunction<false, false> = new Proxy(sqlTarget as unknown as NeonQueryFunction<false, false>, {
  get(_t, p) {
    ensure()
    return (_sql as unknown as Record<string | symbol, unknown>)[p]
  },
  apply(_t, _thisArg, args) {
    ensure()
    return (_sql as unknown as (...a: unknown[]) => unknown)(...args)
  },
})

export const db: NeonHttpDatabase<typeof schema> = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_t, p) {
    ensure()
    return (_db as unknown as Record<string | symbol, unknown>)[p]
  },
})

export { schema }

import { mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'

import * as schema from './schema'

export type Db = BetterSQLite3Database<typeof schema>

const DEFAULT_PATH = '.data/lights-out.db'

function databasePath(): string {
  const url = process.env.DATABASE_URL?.trim()
  if (!url) return resolve(process.cwd(), DEFAULT_PATH)
  if (url.startsWith('postgres://') || url.startsWith('postgresql://')) {
    throw new Error(
      'Production Postgres is not wired yet. Use a file: DATABASE_URL in development.',
    )
  }
  return url.startsWith('file:') ? url.slice('file:'.length) : url
}

export function createDb(filename = databasePath()): Db {
  if (filename !== ':memory:') {
    mkdirSync(dirname(resolve(filename)), { recursive: true })
  }

  const sqlite = new Database(filename)
  if (filename !== ':memory:') {
    sqlite.pragma('journal_mode = WAL')
  }
  sqlite.pragma('foreign_keys = ON')

  return drizzle(sqlite, { schema })
}

/** Applies the committed migrations. Safe to call repeatedly. */
export function migrateDb(db: Db): void {
  migrate(db, { migrationsFolder: join(process.cwd(), 'drizzle') })
}

interface DbGlobal {
  __lightsOutDb?: Db
}

const globalForDb = globalThis as unknown as DbGlobal

export function getDb(): Db {
  if (!globalForDb.__lightsOutDb) {
    const db = createDb()
    migrateDb(db)
    globalForDb.__lightsOutDb = db
  }
  return globalForDb.__lightsOutDb
}

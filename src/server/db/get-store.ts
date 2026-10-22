import type { ScoreStore } from './store'

interface StoreGlobal {
  __lightsOutStore?: Promise<ScoreStore>
}

const globalForStore = globalThis as unknown as StoreGlobal

/**
 * Postgres in deployment, SQLite for local development. The adapters are
 * loaded on demand so the production bundle never needs the native SQLite
 * module.
 */
export function getStore(): Promise<ScoreStore> {
  if (!globalForStore.__lightsOutStore) {
    globalForStore.__lightsOutStore = createStore().catch((error) => {
      globalForStore.__lightsOutStore = undefined
      throw error
    })
  }

  return globalForStore.__lightsOutStore
}

async function createStore(): Promise<ScoreStore> {
  const url = process.env.DATABASE_URL?.trim()

  if (url?.startsWith('postgres://') || url?.startsWith('postgresql://')) {
    const { createPostgresStore } = await import('./postgres-store')
    return createPostgresStore(url)
  }

  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    throw new Error(
      'DATABASE_URL must point to Postgres in production; SQLite is local-only',
    )
  }

  const [{ createDb, migrateDb }, { createSqliteStore }] = await Promise.all([
    import('./client'),
    import('./sqlite-store'),
  ])
  const db = createDb()
  migrateDb(db)
  return createSqliteStore(db)
}

// Minimal single-store IndexedDB key/value wrapper (no dependency). Used to
// persist working state so it survives reloads (SPEC §9). Falls back silently
// when IndexedDB is unavailable (e.g. tests, private mode).

const DB_NAME = 'reviewer-matcher'
const STORE = 'kv'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'))
      return
    }
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function idbSet(key: string, value: unknown): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(value, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch {
    /* persistence is best-effort */
  }
}

export async function idbGet<T>(key: string): Promise<T | null> {
  try {
    const db = await openDb()
    const value = await new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(key)
      req.onsuccess = () => resolve((req.result as T) ?? null)
      req.onerror = () => reject(req.error)
    })
    db.close()
    return value
  } catch {
    return null
  }
}

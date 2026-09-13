/**
 * Estado de sincronizacion para datos que en el futuro podran leerse offline-first
 * desde IndexedDB.
 */
export type SyncStatus = 'idle' | 'loading' | 'ready' | 'refreshing' | 'error'

export interface Resource<T> {
  data: T | null
  status: SyncStatus
  error: string | null
  /** Timestamp (ms) de la ultima carga exitosa; null si nunca se cargo. */
  updatedAt: number | null
}

export function createIdleResource<T>(): Resource<T> {
  return { data: null, status: 'idle', error: null, updatedAt: null }
}

import type { Resource } from '@/types/sync'

/**
 * Wrapper fetch + JSON. El backend siempre responde `{ error: string }` en JSON
 * cuando falla (ver api/domains/*.routes.js -> handle()); acá se convierte eso
 * en una excepcion con mensaje legible (idealmente ya rioplatense, tal como lo
 * manda el backend) en vez de dejar pasar un Response sin parsear.
 */
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const hasBody = options.body !== undefined
  const res = await fetch(path, {
    ...options,
    headers: {
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  })

  const text = await res.text()
  let body: unknown = null
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }
  }

  if (!res.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body && typeof (body as { error?: unknown }).error === 'string'
        ? (body as { error: string }).error
        : `No se pudo completar la solicitud (HTTP ${res.status})`
    throw new Error(message)
  }

  return body as T
}

export const http = {
  get<T>(path: string): Promise<T> {
    return request<T>(path)
  },
  post<T>(path: string, data?: unknown): Promise<T> {
    return request<T>(path, { method: 'POST', body: data === undefined ? '{}' : JSON.stringify(data) })
  },
  put<T>(path: string, data?: unknown): Promise<T> {
    return request<T>(path, { method: 'PUT', body: data === undefined ? '{}' : JSON.stringify(data) })
  },
  delete<T>(path: string): Promise<T> {
    return request<T>(path, { method: 'DELETE' })
  },
}

/**
 * Convierte una promesa de fetch en un Resource<T> ya resuelto (status 'ready' o
 * 'error', nunca 'loading': ese estado transitorio lo setea el store ANTES de
 * llamar al repository). Los repositories de data/repositories/* usan esto para
 * nunca dejar que un error de HTTP se trague en silencio (regla de negocio).
 */
export async function toResource<T>(promise: Promise<T>): Promise<Resource<T>> {
  try {
    const data = await promise
    return { data, status: 'ready', error: null, updatedAt: Date.now() }
  } catch (err) {
    return {
      data: null,
      status: 'error',
      error: err instanceof Error ? err.message : 'Error desconocido',
      updatedAt: null,
    }
  }
}

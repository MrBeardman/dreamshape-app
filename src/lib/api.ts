// Thin fetch wrapper for the app's own JSON API (server/routes/*). Auth is an HttpOnly session
// cookie set by /api/auth/login, so there is nothing to attach here.

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const unauthorizedListeners = new Set<() => void>()

/** Called when a data request comes back 401 (session expired or cleared). Returns an unsubscribe. */
export function onUnauthorized(listener: () => void): () => void {
  unauthorizedListeners.add(listener)
  return () => { unauthorizedListeners.delete(listener) }
}

export async function api<T = unknown>(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  let data: unknown = null
  try { data = await res.json() } catch { /* empty or non-JSON body */ }

  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/')) unauthorizedListeners.forEach(fn => fn())
    const message = (data as { error?: string } | null)?.error ?? `Request failed (${res.status})`
    throw new ApiError(res.status, message)
  }
  return data as T
}

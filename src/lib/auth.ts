import { api, ApiError } from './api'
import type { AuthUser } from '../types'

// Replaces supabase.auth.*. The session itself is an HttpOnly cookie managed by the server.
// The last known user is remembered in localStorage so the app still opens offline (the PWA is
// offline-first); the cookie decides whether the server accepts the next request.

const USER_KEY = 'dreamshape_auth_user'

function readCachedUser(): AuthUser | null {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null') } catch { return null }
}

function cacheUser(user: AuthUser | null) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
    else localStorage.removeItem(USER_KEY)
  } catch { /* storage unavailable */ }
}

/** Current user, or null when signed out. If the server cannot be reached, falls back to the last known user. */
export async function getSessionUser(): Promise<AuthUser | null> {
  try {
    const { user } = await api<{ user: AuthUser | null }>('GET', '/auth/session')
    cacheUser(user)
    return user
  } catch (error) {
    if (error instanceof ApiError && error.status < 500) { cacheUser(null); return null }
    return readCachedUser() // offline or server down
  }
}

export async function signIn(email: string, password: string): Promise<AuthUser> {
  const { user } = await api<{ user: AuthUser }>('POST', '/auth/login', { email, password })
  cacheUser(user)
  return user
}

export async function signUp(input: { email: string; password: string; name: string; signupCode: string }): Promise<AuthUser> {
  const { user } = await api<{ user: AuthUser }>('POST', '/auth/signup', input)
  cacheUser(user)
  return user
}

export async function signOut(): Promise<void> {
  cacheUser(null)
  try { await api('POST', '/auth/logout') } catch { /* offline: the cookie expires on its own */ }
}

export function forgetUser() {
  cacheUser(null)
}

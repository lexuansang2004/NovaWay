import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiClient } from '@/lib/apiClient'
import { clearAuthSession, fetchCurrentUser, getToken, login } from '@/services/authService'

// R6-5 (docs/roadmap/SPRINT_R6_SECURITY_HARDENING.md). AppLayout's auth guard
// calls fetchCurrentUser() on every mount to decide whether the current
// session is still valid. Getting the 401-vs-other-error branch wrong in
// either direction is a real bug: clearing the session on *every* error
// (a transient network blip included) logs users out for no reason, and
// never clearing it on a real 401 leaves them stuck with a dead token.
// Same contract-critical status as apiClient.ts (R5-6), untested until now.
//
// Only sessionStorage and fetch are stubbed — a plain Map-backed object for
// sessionStorage, no jsdom needed for a Web Storage API this simple. The
// module's own logic (token read/write, the try/catch branch) runs for real.

const TOKEN_KEY = 'novaway_web_token'

function fakeSessionStorage() {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    get size() {
      return store.size
    },
  }
}

describe('authService', () => {
  let storage: ReturnType<typeof fakeSessionStorage>
  let getSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    storage = fakeSessionStorage()
    vi.stubGlobal('sessionStorage', storage)
    getSpy = vi.spyOn(apiClient, 'get')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  describe('login', () => {
    it('writes the access token to sessionStorage under the expected key', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValue({
        access_token: 'jwt-token',
        user: { id: 'u1', email: 'driver@example.com' },
      })

      const user = await login('driver@example.com', 'pw')

      expect(user).toEqual({ id: 'u1', email: 'driver@example.com' })
      expect(storage.getItem(TOKEN_KEY)).toBe('jwt-token')
    })
  })

  describe('fetchCurrentUser', () => {
    it('returns null without calling the API when there is no stored token', async () => {
      const result = await fetchCurrentUser()

      expect(result).toBeNull()
      expect(getSpy).not.toHaveBeenCalled()
    })

    it('returns the user when the stored token is still valid', async () => {
      storage.setItem(TOKEN_KEY, 'jwt-token')
      getSpy.mockResolvedValue({ id: 'u1', email: 'driver@example.com' })

      const result = await fetchCurrentUser()

      expect(result).toEqual({ id: 'u1', email: 'driver@example.com' })
      expect(getSpy).toHaveBeenCalledWith('/auth/me', 'jwt-token')
    })

    it('clears the session and returns null on a 401 (token expired/invalid)', async () => {
      storage.setItem(TOKEN_KEY, 'stale-token')
      getSpy.mockRejectedValue(new ApiError(401, 'UNAUTHORIZED', 'Người dùng không tồn tại.'))

      const result = await fetchCurrentUser()

      expect(result).toBeNull()
      expect(storage.getItem(TOKEN_KEY)).toBeNull()
    })

    it('propagates a non-401 ApiError and leaves the session untouched', async () => {
      storage.setItem(TOKEN_KEY, 'jwt-token')
      getSpy.mockRejectedValue(new ApiError(500, 'INTERNAL_ERROR', 'Internal server error'))

      await expect(fetchCurrentUser()).rejects.toThrow(ApiError)
      // The whole point of this test: a transient server error must not log
      // the user out — only a real 401 should.
      expect(storage.getItem(TOKEN_KEY)).toBe('jwt-token')
    })

    it('propagates a network failure (not an ApiError at all) and leaves the session untouched', async () => {
      storage.setItem(TOKEN_KEY, 'jwt-token')
      getSpy.mockRejectedValue(new TypeError('Failed to fetch'))

      await expect(fetchCurrentUser()).rejects.toThrow(TypeError)
      expect(storage.getItem(TOKEN_KEY)).toBe('jwt-token')
    })
  })

  describe('getToken / clearAuthSession', () => {
    it('reads back exactly what was stored, and clearAuthSession removes it', () => {
      storage.setItem(TOKEN_KEY, 'jwt-token')
      expect(getToken()).toBe('jwt-token')

      clearAuthSession()
      expect(getToken()).toBeNull()
    })
  })
})

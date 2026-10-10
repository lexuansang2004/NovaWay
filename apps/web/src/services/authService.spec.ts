import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiClient } from '@/lib/apiClient'
import {
  clearAuthSession,
  fetchCurrentUser,
  getToken,
  login,
  StaleSessionCheckError,
} from '@/services/authService'

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
      // WEB-01: the third argument carries the caller's abort signal (none here).
      expect(getSpy).toHaveBeenCalledWith('/auth/me', 'jwt-token', { signal: undefined })
    })

    it('hands the caller-provided abort signal to the request', async () => {
      storage.setItem(TOKEN_KEY, 'jwt-token')
      getSpy.mockResolvedValue({ id: 'u1', email: 'driver@example.com' })
      const controller = new AbortController()

      await fetchCurrentUser({ signal: controller.signal })

      expect(getSpy).toHaveBeenCalledWith('/auth/me', 'jwt-token', { signal: controller.signal })
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

  // WEB-01 (docs/web/WEB_ACCOUNT_RWD_SPEC.md §4.1 "Thế hệ phiên", AC-WEBSESSION-08/09).
  // The request for token A is still in flight when the stored session
  // changes. Its answer must not act on the session that replaced it — and
  // this has to hold in the service itself, because the 401 branch above is
  // where the token gets removed. A guard in the UI alone would be too late.
  describe('fetchCurrentUser — answer for a session that is no longer current', () => {
    function pendingMe() {
      let resolve!: (user: { id: string; email: string }) => void
      let reject!: (error: unknown) => void
      getSpy.mockReturnValue(
        new Promise((res, rej) => {
          resolve = res
          reject = rej
        }),
      )
      return { resolve, reject }
    }

    it('a late 401 for token A does not clear token B', async () => {
      storage.setItem(TOKEN_KEY, 'token-a')
      const me = pendingMe()
      const check = fetchCurrentUser()

      storage.setItem(TOKEN_KEY, 'token-b') // B signed in meanwhile
      me.reject(new ApiError(401, 'UNAUTHORIZED', 'expired'))

      await expect(check).rejects.toThrow(StaleSessionCheckError)
      expect(storage.getItem(TOKEN_KEY)).toBe('token-b')
    })

    it('a late 200 for token A is never returned as the current user once token B is stored', async () => {
      storage.setItem(TOKEN_KEY, 'token-a')
      const me = pendingMe()
      const check = fetchCurrentUser()

      storage.setItem(TOKEN_KEY, 'token-b')
      me.resolve({ id: 'user-a', email: 'a@example.com' })

      await expect(check).rejects.toThrow(StaleSessionCheckError)
      expect(storage.getItem(TOKEN_KEY)).toBe('token-b')
    })

    it('a late failure for token A is reported as stale, not as an error of the current session', async () => {
      storage.setItem(TOKEN_KEY, 'token-a')
      const me = pendingMe()
      const check = fetchCurrentUser()

      storage.setItem(TOKEN_KEY, 'token-b')
      me.reject(new ApiError(500, 'INTERNAL_ERROR', 'boom'))

      await expect(check).rejects.toThrow(StaleSessionCheckError)
      expect(storage.getItem(TOKEN_KEY)).toBe('token-b')
    })

    it('a late 401 after logout leaves storage empty and reports stale', async () => {
      storage.setItem(TOKEN_KEY, 'token-a')
      const me = pendingMe()
      const check = fetchCurrentUser()

      storage.removeItem(TOKEN_KEY)
      me.reject(new ApiError(401, 'UNAUTHORIZED', 'expired'))

      await expect(check).rejects.toThrow(StaleSessionCheckError)
      expect(storage.size).toBe(0)
    })

    it('does not clear the token on a 401 when the caller says the check was superseded', async () => {
      storage.setItem(TOKEN_KEY, 'token-a')
      getSpy.mockRejectedValue(new ApiError(401, 'UNAUTHORIZED', 'expired'))

      await expect(fetchCurrentUser({ isCurrent: () => false })).rejects.toThrow(StaleSessionCheckError)
      expect(storage.getItem(TOKEN_KEY)).toBe('token-a')
    })

    it('does not return the user when the caller says the check was superseded', async () => {
      storage.setItem(TOKEN_KEY, 'token-a')
      getSpy.mockResolvedValue({ id: 'user-a', email: 'a@example.com' })

      await expect(fetchCurrentUser({ isCurrent: () => false })).rejects.toThrow(StaleSessionCheckError)
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

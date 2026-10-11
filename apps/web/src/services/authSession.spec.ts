import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// WEB-01 (docs/web/WEB_ACCOUNT_RWD_SPEC.md §4.1; AC-WEBSESSION-01→09).
//
// What is real here: authSession, authService and apiClient — the whole path
// from "start a check" down to the fetch call and the sessionStorage write.
// What is stubbed: only `fetch`, `sessionStorage` and `localStorage`.
// authService is deliberately NOT mocked: several of these cases are about
// the service clearing or returning the wrong session, and a mocked service
// would hide exactly that.
//
// The fetch stub ignores AbortSignal on purpose. It keeps every request
// pending until the test answers it, so "the answer still arrives after the
// check was timed out / cancelled / superseded" is tested as its own case and
// not assumed away because abort() was called.
//
// getSessionSnapshot().user is the value AuthProvider puts into AuthContext
// (it renders straight from this store), so the `user` assertions below are
// the AuthContext assertions. Routing on top of it is covered in the browser
// by e2e/session-check.fixture.spec.ts.

const TOKEN_KEY = 'novaway_web_token'
const PREFERENCE_KEY = 'unrelated-preference'
const BASE = 'http://localhost:3000/api'

const USER_A = { id: 'user-a', email: 'a@example.com' }
const USER_B = { id: 'user-b', email: 'b@example.com' }

// One symbol per mounted page, as useSessionCheck creates them.
const PAGE = Symbol('page')
const NEXT_PAGE = Symbol('next page')

type Session = typeof import('@/services/authSession')

interface PendingRequest {
  url: string
  method: string
  authorization: string | undefined
  signal: AbortSignal | undefined
  respond: (status: number, body: unknown) => void
  fail: (error: unknown) => void
}

function fakeStorage() {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    snapshot: () => Object.fromEntries(store),
  }
}

describe('authSession', () => {
  let session: Session
  let storage: ReturnType<typeof fakeStorage>
  let preferences: ReturnType<typeof fakeStorage>
  let requests: PendingRequest[]

  // Lets every pending promise continuation run (apiClient awaits fetch, then
  // response.json(), then the service and the store each add a step).
  const settle = async () => {
    for (let i = 0; i < 20; i += 1) await Promise.resolve()
  }

  const meRequests = () => requests.filter((request) => request.url === `${BASE}/auth/me`)
  const loginRequests = () => requests.filter((request) => request.url === `${BASE}/auth/login`)
  const token = () => storage.getItem(TOKEN_KEY)
  const errorBody = (code: string) => ({ error_code: code, message: code })

  async function startCheckWithToken(value: string, page: symbol = PAGE) {
    storage.setItem(TOKEN_KEY, value)
    session.startSessionCheck(page)
    await settle()
  }

  beforeEach(async () => {
    vi.useFakeTimers()
    storage = fakeStorage()
    preferences = fakeStorage()
    preferences.setItem(PREFERENCE_KEY, 'keep-me')
    requests = []
    vi.stubGlobal('sessionStorage', storage)
    vi.stubGlobal('localStorage', preferences)
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init: RequestInit = {}) => {
        return new Promise<Response>((resolve, reject) => {
          requests.push({
            url,
            method: init.method ?? 'GET',
            authorization: (init.headers as Record<string, string> | undefined)?.Authorization,
            signal: init.signal ?? undefined,
            respond: (status, body) =>
              resolve(
                new Response(JSON.stringify(body), {
                  status,
                  headers: { 'Content-Type': 'application/json' },
                }),
              ),
            fail: reject,
          })
        })
      }),
    )
    // Module-level session state must not leak between tests.
    vi.resetModules()
    session = await import('@/services/authSession')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  describe('AC-WEBSESSION-01 — no token, 200, 401', () => {
    it('is unauthenticated without calling the API when there is no token', async () => {
      session.startSessionCheck(PAGE)
      await settle()

      expect(session.getSessionSnapshot()).toEqual({ status: 'unauthenticated', user: null, failure: null, retrying: false })
      expect(requests).toHaveLength(0)
    })

    it('is checking while /auth/me is pending and authenticated on 200', async () => {
      await startCheckWithToken('token-a')

      expect(session.getSessionSnapshot().status).toBe('checking')
      expect(meRequests()).toHaveLength(1)
      expect(meRequests()[0].authorization).toBe('Bearer token-a')

      meRequests()[0].respond(200, USER_A)
      await settle()

      expect(session.getSessionSnapshot()).toEqual({ status: 'authenticated', user: USER_A, failure: null, retrying: false })
      expect(token()).toBe('token-a')
    })

    it('clears the local session and is unauthenticated on 401', async () => {
      await startCheckWithToken('token-a')

      meRequests()[0].respond(401, errorBody('UNAUTHORIZED'))
      await settle()

      expect(session.getSessionSnapshot()).toEqual({ status: 'unauthenticated', user: null, failure: null, retrying: false })
      expect(token()).toBeNull()
    })
  })

  describe('AC-WEBSESSION-02 — failures other than 401 keep the token', () => {
    it.each([
      ['a 500', 500, 'server'],
      ['a 403', 403, 'forbidden'],
      ['a 429', 429, 'rate_limited'],
    ] as const)('%s ends in error and keeps the token', async (_label, status, failure) => {
      await startCheckWithToken('token-a')

      meRequests()[0].respond(status, errorBody('FIXTURE'))
      await settle()

      expect(session.getSessionSnapshot()).toEqual({ status: 'error', user: null, failure, retrying: false })
      expect(token()).toBe('token-a')
    })

    it('a network failure ends in error and keeps the token', async () => {
      await startCheckWithToken('token-a')

      meRequests()[0].fail(new TypeError('Failed to fetch'))
      await settle()

      expect(session.getSessionSnapshot()).toEqual({ status: 'error', user: null, failure: 'network', retrying: false })
      expect(token()).toBe('token-a')
    })

    it('does not retry on its own after a 429', async () => {
      await startCheckWithToken('token-a')
      meRequests()[0].respond(429, errorBody('TOO_MANY_REQUESTS'))
      await settle()

      await vi.advanceTimersByTimeAsync(5 * 60_000)

      expect(meRequests()).toHaveLength(1)
      expect(session.getSessionSnapshot().status).toBe('error')
    })
  })

  describe('AC-WEBSESSION-03 — 15 second timeout, for the session check only', () => {
    it('uses a 15 000 ms threshold', () => {
      expect(session.SESSION_CHECK_TIMEOUT_MS).toBe(15_000)
    })

    it('is still checking at 14 999 ms and times out at 15 000 ms, aborting the request and keeping the token', async () => {
      await startCheckWithToken('token-a')

      await vi.advanceTimersByTimeAsync(14_999)
      expect(session.getSessionSnapshot().status).toBe('checking')
      expect(meRequests()[0].signal?.aborted).toBe(false)

      await vi.advanceTimersByTimeAsync(1)
      expect(session.getSessionSnapshot()).toEqual({ status: 'error', user: null, failure: 'timeout', retrying: false })
      expect(meRequests()[0].signal?.aborted).toBe(true)
      expect(token()).toBe('token-a')
    })

    it.each([
      ['200', (request: PendingRequest) => request.respond(200, USER_A)],
      ['401', (request: PendingRequest) => request.respond(401, errorBody('UNAUTHORIZED'))],
      ['500', (request: PendingRequest) => request.respond(500, errorBody('INTERNAL_ERROR'))],
      ['network failure', (request: PendingRequest) => request.fail(new TypeError('Failed to fetch'))],
    ] as const)('ignores a late %s that arrives after the timeout', async (_label, answer) => {
      await startCheckWithToken('token-a')
      await vi.advanceTimersByTimeAsync(15_000)

      answer(meRequests()[0])
      await settle()

      expect(session.getSessionSnapshot()).toEqual({ status: 'error', user: null, failure: 'timeout', retrying: false })
      expect(token()).toBe('token-a')
    })

    it('leaves no timer behind once a check has answered in time', async () => {
      await startCheckWithToken('token-a')
      meRequests()[0].respond(200, USER_A)
      await settle()

      expect(vi.getTimerCount()).toBe(0)
      await vi.advanceTimersByTimeAsync(60_000)
      expect(session.getSessionSnapshot().status).toBe('authenticated')
    })

    it('does not put a timeout or an abort signal on other API calls', async () => {
      const { apiClient } = await import('@/lib/apiClient')

      void apiClient.get('/vehicles', 'token-a')
      void apiClient.post('/auth/login', { email: 'a@example.com', password: 'pw' })
      await settle()

      expect(requests.map((request) => request.signal)).toEqual([undefined, undefined])
      expect(vi.getTimerCount()).toBe(0)
    })
  })

  describe('AC-WEBSESSION-04 — retry', () => {
    async function failFirstCheck() {
      await startCheckWithToken('token-a')
      meRequests()[0].respond(500, errorBody('INTERNAL_ERROR'))
      await settle()
      expect(session.getSessionSnapshot().status).toBe('error')
    }

    it('goes back to checking (the busy state) and succeeds', async () => {
      await failFirstCheck()

      session.retrySessionCheck()
      expect(session.getSessionSnapshot()).toEqual({ status: 'checking', user: null, failure: null, retrying: true })

      await settle()
      meRequests()[1].respond(200, USER_A)
      await settle()

      expect(session.getSessionSnapshot()).toEqual({ status: 'authenticated', user: USER_A, failure: null, retrying: false })
    })

    it('can fail again and keep the token', async () => {
      await failFirstCheck()

      session.retrySessionCheck()
      await settle()
      meRequests()[1].fail(new TypeError('Failed to fetch'))
      await settle()

      expect(session.getSessionSnapshot()).toEqual({ status: 'error', user: null, failure: 'network', retrying: false })
      expect(token()).toBe('token-a')
    })

    it('repeated retries produce exactly one new check', async () => {
      await failFirstCheck()

      session.retrySessionCheck()
      session.retrySessionCheck()
      session.retrySessionCheck()
      await settle()
      session.retrySessionCheck()
      await settle()

      expect(meRequests()).toHaveLength(2)
      expect(meRequests()[1].signal?.aborted).toBe(false)
    })

    it('is ignored while the first check is still running', async () => {
      await startCheckWithToken('token-a')

      session.retrySessionCheck()
      await settle()

      expect(meRequests()).toHaveLength(1)
      expect(meRequests()[0].signal?.aborted).toBe(false)
    })
  })

  describe('AC-WEBSESSION-07 — the explicit "Đăng nhập lại" action', () => {
    it('removes the token and the user, and touches nothing else', async () => {
      await startCheckWithToken('token-a')
      meRequests()[0].respond(500, errorBody('INTERNAL_ERROR'))
      await settle()

      session.endLocalSession()

      expect(session.getSessionSnapshot()).toEqual({ status: 'unauthenticated', user: null, failure: null, retrying: false })
      expect(token()).toBeNull()
      // Preference survives; no revoke (or any other) request is sent.
      expect(preferences.snapshot()).toEqual({ [PREFERENCE_KEY]: 'keep-me' })
      expect(requests).toHaveLength(1)
    })

    it('does not check the old session again afterwards, so nothing can sign the user back in', async () => {
      await startCheckWithToken('token-a')
      meRequests()[0].respond(500, errorBody('INTERNAL_ERROR'))
      await settle()
      session.endLocalSession()

      session.startSessionCheck(NEXT_PAGE) // what /login does on mount
      await settle()

      expect(meRequests()).toHaveLength(1)
      expect(session.getSessionSnapshot().status).toBe('unauthenticated')
    })

    it.each([
      ['the old token was still valid (late 200)', (request: PendingRequest) => request.respond(200, USER_A)],
      ['the old token was invalid (late 401)', (request: PendingRequest) => request.respond(401, errorBody('UNAUTHORIZED'))],
      ['the network came back with an error (late 500)', (request: PendingRequest) => request.respond(500, errorBody('INTERNAL_ERROR'))],
    ] as const)('invalidates a retry that was still pending: %s', async (_label, answer) => {
      await startCheckWithToken('token-a')
      meRequests()[0].respond(500, errorBody('INTERNAL_ERROR'))
      await settle()
      session.retrySessionCheck()
      await settle()

      session.endLocalSession()
      expect(meRequests()[1].signal?.aborted).toBe(true)

      answer(meRequests()[1])
      await settle()

      expect(session.getSessionSnapshot()).toEqual({ status: 'unauthenticated', user: null, failure: null, retrying: false })
      expect(token()).toBeNull()
    })
  })

  describe('AC-WEBSESSION-08 — session A is still being checked when B signs in', () => {
    async function signInAsBWhileAIsPending() {
      await startCheckWithToken('token-a')
      const signedIn = session.signIn(USER_B.email, 'pw')
      await settle()
      loginRequests()[0].respond(200, { access_token: 'token-b', user: USER_B })
      await signedIn
      await settle()
      return meRequests()[0]
    }

    const expectSessionB = () => {
      expect(token()).toBe('token-b')
      expect(session.getSessionSnapshot()).toEqual({ status: 'authenticated', user: USER_B, failure: null, retrying: false })
    }

    it('signing in as B makes B the session and aborts the check for A', async () => {
      const requestForA = await signInAsBWhileAIsPending()

      expectSessionB()
      expect(requestForA.signal?.aborted).toBe(true)
    })

    it('a late 401 for A does not clear token B, remove user B or change the state', async () => {
      const requestForA = await signInAsBWhileAIsPending()

      requestForA.respond(401, errorBody('UNAUTHORIZED'))
      await settle()

      expectSessionB()
    })

    it('a late 200 for A does not bring user A back', async () => {
      const requestForA = await signInAsBWhileAIsPending()

      requestForA.respond(200, USER_A)
      await settle()

      expectSessionB()
    })

    it.each([
      ['500', (request: PendingRequest) => request.respond(500, errorBody('INTERNAL_ERROR'))],
      ['network failure', (request: PendingRequest) => request.fail(new TypeError('Failed to fetch'))],
    ] as const)('a late %s for A does not put session B into the error state', async (_label, answer) => {
      const requestForA = await signInAsBWhileAIsPending()

      answer(requestForA)
      await settle()

      expectSessionB()
    })

    it.each([
      ['401', (request: PendingRequest) => request.respond(401, errorBody('UNAUTHORIZED'))],
      ['200', (request: PendingRequest) => request.respond(200, USER_A)],
    ] as const)(
      'holds when the answer for A (%s) and the login answer for B arrive in the same tick, A first',
      async (_label, answer) => {
        await startCheckWithToken('token-a')
        const signedIn = session.signIn(USER_B.email, 'pw')
        await settle()

        answer(meRequests()[0])
        loginRequests()[0].respond(200, { access_token: 'token-b', user: USER_B })
        await signedIn.catch(() => undefined)
        await settle()

        // A answered while it was still the current session, so it may have
        // been applied for an instant — but B's login is the later event and
        // must be what remains.
        expectSessionB()
      },
    )

    it.each([
      ['401', (request: PendingRequest) => request.respond(401, errorBody('UNAUTHORIZED'))],
      ['200', (request: PendingRequest) => request.respond(200, USER_A)],
    ] as const)(
      'holds when the login answer for B and the answer for A (%s) arrive in the same tick, B first',
      async (_label, answer) => {
        await startCheckWithToken('token-a')
        const signedIn = session.signIn(USER_B.email, 'pw')
        await settle()

        loginRequests()[0].respond(200, { access_token: 'token-b', user: USER_B })
        answer(meRequests()[0])
        await signedIn
        await settle()

        expectSessionB()
      },
    )

    it('a failed sign-in leaves the pending check for A valid and the token untouched', async () => {
      await startCheckWithToken('token-a')
      const signedIn = session.signIn(USER_B.email, 'wrong')
      await settle()

      loginRequests()[0].respond(401, errorBody('INVALID_CREDENTIALS'))
      await expect(signedIn).rejects.toMatchObject({ status: 401, errorCode: 'INVALID_CREDENTIALS' })
      expect(token()).toBe('token-a')
      expect(session.getSessionSnapshot().status).toBe('checking')

      meRequests()[0].respond(200, USER_A)
      await settle()
      expect(session.getSessionSnapshot()).toEqual({ status: 'authenticated', user: USER_A, failure: null, retrying: false })
    })
  })

  describe('AC-WEBSESSION-09 — an old answer after logout, unmount, timeout or a newer check', () => {
    const lateAnswers = [
      ['200', (request: PendingRequest) => request.respond(200, USER_A)],
      ['401', (request: PendingRequest) => request.respond(401, errorBody('UNAUTHORIZED'))],
      ['500', (request: PendingRequest) => request.respond(500, errorBody('INTERNAL_ERROR'))],
      ['network failure', (request: PendingRequest) => request.fail(new TypeError('Failed to fetch'))],
    ] as const

    it.each(lateAnswers)('after logout, a late %s changes nothing', async (_label, answer) => {
      await startCheckWithToken('token-a')

      session.endLocalSession()
      expect(meRequests()[0].signal?.aborted).toBe(true)
      answer(meRequests()[0])
      await settle()

      expect(session.getSessionSnapshot()).toEqual({ status: 'unauthenticated', user: null, failure: null, retrying: false })
      expect(token()).toBeNull()
    })

    it.each(lateAnswers)('after the page unmounts, a late %s changes nothing', async (_label, answer) => {
      await startCheckWithToken('token-a')
      const notified = vi.fn()
      session.subscribeToSession(notified)

      session.releaseSessionCheck(PAGE)
      expect(meRequests()[0].signal?.aborted).toBe(true)
      expect(vi.getTimerCount()).toBe(0)
      answer(meRequests()[0])
      await settle()

      // Nobody is told anything, no user appears, and — the 401 case — the
      // token is not removed by an answer nobody is waiting for any more.
      expect(notified).not.toHaveBeenCalled()
      expect(session.getSessionSnapshot().user).toBeNull()
      expect(session.getSessionSnapshot().status).toBe('checking')
      expect(token()).toBe('token-a')
    })

    it.each(lateAnswers)('after a newer check started, a late %s from the older one changes nothing', async (_label, answer) => {
      await startCheckWithToken('token-a')

      session.startSessionCheck(NEXT_PAGE) // e.g. the next page mounted
      await settle()
      expect(meRequests()).toHaveLength(2)
      expect(meRequests()[0].signal?.aborted).toBe(true)

      answer(meRequests()[0])
      await settle()

      expect(session.getSessionSnapshot()).toEqual({ status: 'checking', user: null, failure: null, retrying: false })
      expect(token()).toBe('token-a')

      meRequests()[1].respond(200, USER_A)
      await settle()
      expect(session.getSessionSnapshot()).toEqual({ status: 'authenticated', user: USER_A, failure: null, retrying: false })
    })

    it.each(lateAnswers)('after a timeout and a retry, a late %s from the timed-out check changes nothing', async (_label, answer) => {
      await startCheckWithToken('token-a')
      await vi.advanceTimersByTimeAsync(15_000)
      session.retrySessionCheck()
      await settle()

      answer(meRequests()[0])
      await settle()

      expect(session.getSessionSnapshot()).toEqual({ status: 'checking', user: null, failure: null, retrying: true })
      expect(token()).toBe('token-a')
    })

    // Review round 1, R01. The page owns its retries too: the hook used to
    // remember only the check it started on mount, so after "Thử lại" the
    // page could unmount and leave the retry running with nobody to cancel it.
    // (The real hook is exercised in e2e/session-check.hook.spec.ts; these
    // cases pin the same contract at the store.)
    it.each(lateAnswers)(
      'after a retry, the page unmounting cancels the retry: a late %s changes nothing',
      async (_label, answer) => {
        await startCheckWithToken('token-a')
        meRequests()[0].respond(500, errorBody('INTERNAL_ERROR'))
        await settle()
        session.retrySessionCheck()
        await settle()
        expect(meRequests()).toHaveLength(2)
        const stateAtUnmount = session.getSessionSnapshot()
        const notified = vi.fn()
        session.subscribeToSession(notified)

        session.releaseSessionCheck(PAGE)
        expect(meRequests()[1].signal?.aborted).toBe(true)
        expect(vi.getTimerCount()).toBe(0)

        answer(meRequests()[1])
        await settle()
        await vi.advanceTimersByTimeAsync(60_000)

        expect(notified).not.toHaveBeenCalled()
        expect(session.getSessionSnapshot()).toBe(stateAtUnmount)
        expect(session.getSessionSnapshot().user).toBeNull()
        expect(token()).toBe('token-a')
      },
    )

    it('after a timeout and a retry, the page unmounting cancels the retry and its timer', async () => {
      await startCheckWithToken('token-a')
      await vi.advanceTimersByTimeAsync(15_000)
      session.retrySessionCheck()
      await settle()
      const notified = vi.fn()
      session.subscribeToSession(notified)

      session.releaseSessionCheck(PAGE)
      expect(meRequests()[1].signal?.aborted).toBe(true)
      expect(vi.getTimerCount()).toBe(0)

      meRequests()[1].respond(401, errorBody('UNAUTHORIZED'))
      await settle()
      await vi.advanceTimersByTimeAsync(60_000)

      expect(notified).not.toHaveBeenCalled()
      expect(token()).toBe('token-a')
    })

    it('after several retries, the page unmounting cancels the one that is running', async () => {
      await startCheckWithToken('token-a')
      meRequests()[0].respond(500, errorBody('INTERNAL_ERROR'))
      await settle()
      for (const index of [1, 2]) {
        session.retrySessionCheck()
        await settle()
        meRequests()[index].fail(new TypeError('Failed to fetch'))
        await settle()
      }
      session.retrySessionCheck()
      await settle()

      session.releaseSessionCheck(PAGE)

      expect(meRequests()).toHaveLength(4)
      expect(meRequests()[3].signal?.aborted).toBe(true)
      meRequests()[3].respond(200, USER_A)
      await settle()
      expect(session.getSessionSnapshot().user).toBeNull()
    })

    it('an old page unmounting does not cancel the check of the page that took over', async () => {
      await startCheckWithToken('token-a')
      meRequests()[0].respond(500, errorBody('INTERNAL_ERROR'))
      await settle()
      session.retrySessionCheck() // the old page's retry
      await settle()

      session.startSessionCheck(NEXT_PAGE) // the next page mounts and takes over
      await settle()
      expect(meRequests()[1].signal?.aborted).toBe(true)

      session.releaseSessionCheck(PAGE) // the old page cleans up afterwards
      expect(meRequests()[2].signal?.aborted).toBe(false)
      expect(vi.getTimerCount()).toBe(1)

      meRequests()[2].respond(200, USER_A)
      await settle()
      expect(session.getSessionSnapshot()).toEqual({
        status: 'authenticated',
        user: USER_A,
        failure: null,
        retrying: false,
      })
    })

    it('the page that took over owns the retries made after that, and its own unmount cancels them', async () => {
      await startCheckWithToken('token-a')
      session.startSessionCheck(NEXT_PAGE)
      await settle()
      meRequests()[1].respond(500, errorBody('INTERNAL_ERROR'))
      await settle()
      session.retrySessionCheck()
      await settle()

      session.releaseSessionCheck(PAGE) // not the owner any more: nothing happens
      expect(meRequests()[2].signal?.aborted).toBe(false)

      session.releaseSessionCheck(NEXT_PAGE)
      expect(meRequests()[2].signal?.aborted).toBe(true)
    })

    it('releasing twice, or after the check already finished, is harmless', async () => {
      await startCheckWithToken('token-a')
      meRequests()[0].respond(200, USER_A)
      await settle()
      const notified = vi.fn()
      session.subscribeToSession(notified)

      session.releaseSessionCheck(PAGE)
      session.releaseSessionCheck(PAGE)

      expect(notified).not.toHaveBeenCalled()
      expect(session.getSessionSnapshot().status).toBe('authenticated')
      expect(token()).toBe('token-a')
    })
  })

  describe('AC-WEBSESSION-06 — sign in, sign out, sign in as someone else', () => {
    it('ends with the second account and no trace of the first', async () => {
      const first = session.signIn(USER_A.email, 'pw')
      await settle()
      loginRequests()[0].respond(200, { access_token: 'token-a', user: USER_A })
      await first
      expect(session.getSessionSnapshot().user).toEqual(USER_A)
      expect(token()).toBe('token-a')

      session.endLocalSession()
      expect(session.getSessionSnapshot()).toEqual({ status: 'unauthenticated', user: null, failure: null, retrying: false })
      expect(token()).toBeNull()

      const second = session.signIn(USER_B.email, 'pw')
      await settle()
      loginRequests()[1].respond(200, { access_token: 'token-b', user: USER_B })
      await second

      expect(session.getSessionSnapshot()).toEqual({ status: 'authenticated', user: USER_B, failure: null, retrying: false })
      expect(token()).toBe('token-b')
      // The token only ever lives in sessionStorage.
      expect(preferences.snapshot()).toEqual({ [PREFERENCE_KEY]: 'keep-me' })
    })

    it('notifies subscribers on every change and stops after unsubscribing', async () => {
      const listener = vi.fn()
      const unsubscribe = session.subscribeToSession(listener)

      await startCheckWithToken('token-a')
      meRequests()[0].respond(200, USER_A)
      await settle()
      expect(listener).toHaveBeenCalledTimes(2) // checking, authenticated

      unsubscribe()
      session.endLocalSession()
      expect(listener).toHaveBeenCalledTimes(2)
    })
  })
})

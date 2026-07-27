import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiClient } from '@/lib/apiClient'

// R5-6 (docs/roadmap/SPRINT_R5_DEPENDENCY_AND_COVERAGE.md). Every API call the
// web app makes goes through this module — it maps the backend's
// docs/API_CONTRACT.md §8 error body onto ApiError, which is what the UI
// branches on (see AuthContext / LoginPage / VehiclesPage). Untested until now.
//
// Only `fetch` is stubbed. The module's own logic — URL building, header
// merging, status branching, JSON parsing — runs for real.

const BASE = 'http://localhost:3000/api'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('apiClient', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const lastCall = () => {
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    return { url, init, headers: init.headers as Record<string, string> }
  }

  describe('successful requests', () => {
    it('returns the parsed body and hits the configured base URL', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ id: 'v1', license_plate: '51F-123' }))

      const result = await apiClient.get<{ id: string }>('/vehicles/v1')

      expect(result).toEqual({ id: 'v1', license_plate: '51F-123' })
      expect(lastCall().url).toBe(`${BASE}/vehicles/v1`)
      expect(lastCall().init.method).toBe('GET')
    })

    it('returns undefined for 204 instead of trying to parse an empty body', async () => {
      // DELETE /api/vehicles/:id answers 204 with no body — calling
      // response.json() on that throws, so the status has to be checked first.
      fetchMock.mockResolvedValue(new Response(null, { status: 204 }))

      await expect(apiClient.delete('/vehicles/v1', 'tok')).resolves.toBeUndefined()
    })
  })

  describe('auth header', () => {
    it('sends Authorization only when a token is passed', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}))
      await apiClient.get('/auth/me', 'jwt-token')
      expect(lastCall().headers.Authorization).toBe('Bearer jwt-token')

      fetchMock.mockClear()
      fetchMock.mockResolvedValue(jsonResponse({}))
      await apiClient.get('/health')
      expect(lastCall().headers.Authorization).toBeUndefined()
    })

    it('always sets a JSON content type', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}))
      await apiClient.post('/auth/login', { email: 'a@b.vn' })
      expect(lastCall().headers['Content-Type']).toBe('application/json')
    })
  })

  describe('request bodies', () => {
    it('serialises the body for post and patch', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}))
      await apiClient.post('/auth/login', { email: 'a@b.vn', password: 'x' })

      expect(lastCall().init.method).toBe('POST')
      expect(lastCall().init.body).toBe('{"email":"a@b.vn","password":"x"}')

      fetchMock.mockClear()
      fetchMock.mockResolvedValue(jsonResponse({}))
      await apiClient.patch('/vehicles/v1', { brand_model: 'Wave' }, 'tok')

      expect(lastCall().init.method).toBe('PATCH')
      expect(lastCall().init.body).toBe('{"brand_model":"Wave"}')
    })

    it('omits the body entirely when none is given', async () => {
      // POST /api/vehicles/:id/activate takes no payload. Sending "undefined"
      // as a literal string would fail the backend's ValidationPipe.
      fetchMock.mockResolvedValue(jsonResponse({}))
      await apiClient.post('/vehicles/v1/activate', undefined, 'tok')

      expect(lastCall().init.body).toBeUndefined()
    })
  })

  describe('error mapping (API_CONTRACT.md §8)', () => {
    it('turns a contract error body into an ApiError carrying status and code', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(
          { error_code: 'INVALID_CREDENTIALS', message: 'Email hoặc mật khẩu không đúng.' },
          401,
        ),
      )

      const error = await apiClient
        .post('/auth/login', { email: 'a@b.vn' })
        .catch((e: unknown) => e)

      expect(error).toBeInstanceOf(ApiError)
      expect(error).toMatchObject({
        status: 401,
        errorCode: 'INVALID_CREDENTIALS',
        message: 'Email hoặc mật khẩu không đúng.',
      })
    })

    it('falls back to a readable message when the error body is not JSON', async () => {
      // A proxy or load balancer returning an HTML 502 is the realistic case:
      // the user must still get a sentence, not a JSON parse crash.
      fetchMock.mockResolvedValue(
        new Response('<html><body>502 Bad Gateway</body></html>', { status: 502 }),
      )

      const error = (await apiClient.get('/vehicles').catch((e: unknown) => e)) as ApiError

      expect(error).toBeInstanceOf(ApiError)
      expect(error.status).toBe(502)
      expect(error.errorCode).toBe('UNKNOWN_ERROR')
      expect(error.message).toBe('Đã xảy ra lỗi. Vui lòng thử lại.')
    })

    it('falls back per-field when the error body is JSON but incomplete', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ message: 'Chỉ có message' }, 400))

      const error = (await apiClient.get('/vehicles').catch((e: unknown) => e)) as ApiError

      expect(error.errorCode).toBe('UNKNOWN_ERROR')
      expect(error.message).toBe('Chỉ có message')
    })

    it('lets a network failure propagate instead of disguising it as an ApiError', async () => {
      // fetch rejects only when the request never completed. Wrapping that in
      // an ApiError would invent a status the server never sent.
      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

      const error = await apiClient.get('/vehicles').catch((e: unknown) => e)

      expect(error).toBeInstanceOf(TypeError)
      expect(error).not.toBeInstanceOf(ApiError)
    })
  })
})

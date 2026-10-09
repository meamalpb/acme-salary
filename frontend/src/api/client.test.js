import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, request, setUnauthorizedHandler } from './client.js'
import { getToken, saveSession } from '../auth/storage.js'

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('api client', () => {
  let fetchMock

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  it('sends the stored token and skips blank query params', async () => {
    saveSession('Bearer abc123', 'maya.patel@acme.com')
    fetchMock.mockResolvedValue(jsonResponse({ data: [] }))

    await request('/api/v1/employees', { params: { q: 'jo', country: '', page: 2 } })

    const [url, options] = fetchMock.mock.calls[0]
    expect(url.pathname).toBe('/api/v1/employees')
    expect(url.search).toBe('?q=jo&page=2')
    expect(options.headers.Authorization).toBe('Bearer abc123')
  })

  it('turns the error envelope into an ApiError', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        { error: { code: 'validation_failed', message: 'Validation failed', details: { email: ['has already been taken'] } } },
        422,
      ),
    )

    const error = await request('/api/v1/employees', { method: 'POST', body: {} }).catch((e) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 422, code: 'validation_failed', details: { email: ['has already been taken'] } })
  })

  it('clears the session and notifies on a 401', async () => {
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)
    saveSession('Bearer abc123', 'maya.patel@acme.com')
    fetchMock.mockResolvedValue(jsonResponse({ error: { code: 'unauthorized', message: 'Unauthorized' } }, 401))

    await expect(request('/api/v1/employees')).rejects.toMatchObject({ status: 401 })

    expect(getToken()).toBeNull()
    expect(onUnauthorized).toHaveBeenCalledOnce()
  })

  it('does not treat a failed login as an expired session', async () => {
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)
    fetchMock.mockResolvedValue(jsonResponse({ error: { code: 'unauthorized', message: 'Invalid email or password' } }, 401))

    await expect(request('/api/v1/login', { method: 'POST', body: {}, auth: false })).rejects.toMatchObject({ status: 401 })

    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('reports an unreachable server as a network_error', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(request('/api/v1/employees')).rejects.toMatchObject({ status: 0, code: 'network_error' })
  })
})

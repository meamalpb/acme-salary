import { clearSession, getToken } from '../auth/storage.js'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

// status 0 means the server could not be reached at all.
export class ApiError extends Error {
  constructor({ status, code, message, details }) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details ?? {}
  }
}

let onUnauthorized = () => {}

// Called after a 401 has cleared the stored session, so the UI can drop its own state.
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler
}

function buildUrl(path, params = {}) {
  const url = new URL(path, BASE_URL)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value)
  }
  return url
}

// Returns the raw Response for a 2xx, and throws an ApiError otherwise.
// Pass auth: false for calls made before sign in (the login call itself).
export async function send(path, { method = 'GET', params, body, auth = true } = {}) {
  const headers = { Accept: 'application/json' }
  const token = getToken()
  if (auth && token) headers.Authorization = token
  // FormData goes as multipart, and the browser sets that Content-Type itself (with the boundary).
  const isForm = body instanceof FormData
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json'

  let response
  try {
    response = await fetch(buildUrl(path, params), {
      method,
      headers,
      body: body === undefined || isForm ? body : JSON.stringify(body),
    })
  } catch {
    throw new ApiError({ status: 0, code: 'network_error', message: 'Couldn’t reach the server' })
  }
  if (response.ok) return response

  const payload = await response.json().catch(() => null)
  const error = payload?.error ?? {}
  if (response.status === 401 && auth) {
    clearSession()
    onUnauthorized()
  }
  throw new ApiError({
    status: response.status,
    code: error.code ?? 'unknown_error',
    message: error.message ?? response.statusText,
    details: error.details,
  })
}

// Returns the parsed JSON body, or null for 204.
export async function request(path, options) {
  const response = await send(path, options)
  return response.status === 204 ? null : response.json()
}

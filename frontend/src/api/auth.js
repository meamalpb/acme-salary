import { request, send } from './client.js'

// The token comes back in the Authorization response header, not in the body.
export async function login(email, password) {
  const response = await send('/api/v1/login', {
    method: 'POST',
    body: { user: { email, password } },
    auth: false,
  })
  const { user } = await response.json()
  return { token: response.headers.get('Authorization'), email: user.email }
}

export function logout() {
  return request('/api/v1/logout', { method: 'DELETE' })
}

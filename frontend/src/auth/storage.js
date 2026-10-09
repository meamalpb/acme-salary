const TOKEN_KEY = 'acme_token'
const EMAIL_KEY = 'acme_email'

// The token is the full Authorization header value from the login response ("Bearer ...").
export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getEmail() {
  return localStorage.getItem(EMAIL_KEY)
}

export function saveSession(token, email) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(EMAIL_KEY, email)
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(EMAIL_KEY)
}

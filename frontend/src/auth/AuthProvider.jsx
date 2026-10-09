import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import * as authApi from '../api/auth.js'
import { setUnauthorizedHandler } from '../api/client.js'
import { AuthContext } from './context.js'
import { clearSession, getEmail, getToken, saveSession } from './storage.js'

export function AuthProvider({ children }) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState(() => ({ token: getToken(), email: getEmail() }))

  // Drops the session and any cached salary data.
  const endSession = useCallback(() => {
    clearSession()
    setSession({ token: null, email: null })
    queryClient.clear()
  }, [queryClient])

  useEffect(() => {
    setUnauthorizedHandler(endSession)
    return () => setUnauthorizedHandler(() => {})
  }, [endSession])

  const value = useMemo(
    () => ({
      isSignedIn: Boolean(session.token),
      email: session.email,
      async login(email, password) {
        const next = await authApi.login(email, password)
        saveSession(next.token, next.email)
        setSession(next)
      },
      // Revoke the token on the server, but sign out locally even if that call fails.
      async logout() {
        try {
          await authApi.logout()
        } catch {
          // ignored on purpose: the local session is cleared below either way
        }
        endSession()
      },
    }),
    [session, endSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

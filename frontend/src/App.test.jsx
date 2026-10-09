import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import * as authApi from './api/auth.js'
import { saveSession } from './auth/storage.js'
import { renderApp } from './test/renderApp.jsx'
import App from './App.jsx'

vi.mock('./api/auth.js', () => ({ login: vi.fn(), logout: vi.fn().mockResolvedValue(undefined) }))

describe('App routing', () => {
  it('sends a signed-out visitor to the sign in page', () => {
    renderApp(<App />, { route: '/employees' })

    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
  })

  it('shows the header with the signed-in email once signed in', () => {
    saveSession('Bearer abc123', 'maya.patel@acme.com')
    renderApp(<App />, { route: '/employees' })

    expect(screen.getByRole('link', { name: 'Employees' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByText('maya.patel@acme.com')).toBeInTheDocument()
    expect(screen.getByText('MP')).toBeInTheDocument()
  })

  it('signs out through the API and returns to the sign in page', async () => {
    saveSession('Bearer abc123', 'maya.patel@acme.com')
    renderApp(<App />, { route: '/employees' })

    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(authApi.logout).toHaveBeenCalledOnce()
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(localStorage.getItem('acme_token')).toBeNull()
  })
})

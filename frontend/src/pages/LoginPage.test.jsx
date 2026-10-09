import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client.js'
import * as authApi from '../api/auth.js'
import { renderApp } from '../test/renderApp.jsx'
import LoginPage from './LoginPage.jsx'

vi.mock('../api/auth.js', () => ({ login: vi.fn(), logout: vi.fn() }))

function renderLogin() {
  renderApp(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/employees" element={<p>Employees page</p>} />
    </Routes>,
    { route: '/login' },
  )
}

async function submit(email, password) {
  await userEvent.type(screen.getByLabelText('Email'), email)
  await userEvent.type(screen.getByLabelText('Password'), password)
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
}

describe('LoginPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('signs in and opens the employee list', async () => {
    authApi.login.mockResolvedValue({ token: 'Bearer abc123', email: 'maya.patel@acme.com' })
    renderLogin()

    await submit('maya.patel@acme.com', 'password123')

    expect(authApi.login).toHaveBeenCalledWith('maya.patel@acme.com', 'password123')
    expect(await screen.findByText('Employees page')).toBeInTheDocument()
    expect(localStorage.getItem('acme_token')).toBe('Bearer abc123')
  })

  it('shows an alert when the credentials are wrong', async () => {
    authApi.login.mockRejectedValue(new ApiError({ status: 401, code: 'unauthorized', message: 'Invalid email or password' }))
    renderLogin()

    await submit('maya.patel@acme.com', 'wrong')

    expect(await screen.findByRole('alert')).toHaveTextContent('That email and password don’t match.')
    expect(screen.queryByText('Employees page')).not.toBeInTheDocument()
  })

  it('shows a different alert when the server is unreachable', async () => {
    authApi.login.mockRejectedValue(new ApiError({ status: 0, code: 'network_error', message: 'Couldn’t reach the server' }))
    renderLogin()

    await submit('maya.patel@acme.com', 'password123')

    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t reach the server')
  })
})

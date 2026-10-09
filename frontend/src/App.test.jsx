import { render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { describe, expect, it } from 'vitest'
import App from './App.jsx'

describe('App', () => {
  it('renders the app title', () => {
    render(
      <MantineProvider>
        <App />
      </MantineProvider>,
    )
    expect(screen.getByRole('heading', { name: 'ACME Salary' })).toBeInTheDocument()
  })
})

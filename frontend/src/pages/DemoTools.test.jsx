import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client.js'
import * as demoApi from '../api/demo.js'
import * as employeesApi from '../api/employees.js'
import * as metaApi from '../api/meta.js'
import { renderApp } from '../test/renderApp.jsx'
import EmployeesPage from './EmployeesPage.jsx'

vi.mock('../api/employees.js', () => ({
  listEmployees: vi.fn(),
  createEmployee: vi.fn(),
  updateEmployee: vi.fn(),
  terminateEmployee: vi.fn(),
  exportEmployees: vi.fn(),
}))
vi.mock('../api/demo.js', () => ({ seedDemoData: vi.fn(), deleteAllEmployees: vi.fn() }))
vi.mock('../api/employeeImports.js', () => ({ createEmployeeImport: vi.fn(), getEmployeeImport: vi.fn() }))
vi.mock('../api/meta.js', () => ({ getMeta: vi.fn() }))
vi.mock('../api/auth.js', () => ({ login: vi.fn(), logout: vi.fn() }))

const meta = { countries: [{ value: 'india', label: 'India' }], departments: [], levels: [], genders: [] }

async function openMenu() {
  await userEvent.click(await screen.findByRole('button', { name: 'Demo tools' }))
}

describe('Demo tools', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    metaApi.getMeta.mockResolvedValue(meta)
    employeesApi.listEmployees.mockResolvedValue({
      data: [],
      meta: { page: 1, per_page: 10, total_count: 0, total_pages: 1 },
    })
  })

  it('seeds demo data in one click, then refreshes the list', async () => {
    demoApi.seedDemoData.mockResolvedValue({ created_count: 10000 })
    renderApp(<EmployeesPage />, { route: '/employees' })
    await waitFor(() => expect(employeesApi.listEmployees).toHaveBeenCalled())
    const listCallsBefore = employeesApi.listEmployees.mock.calls.length

    await openMenu()
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Seed demo data' }))

    expect(await screen.findByText('Seeded 10,000 employees')).toBeInTheDocument()
    expect(demoApi.seedDemoData).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(employeesApi.listEmployees.mock.calls.length).toBeGreaterThan(listCallsBefore))
  })

  it('tells you to delete first when employees already exist', async () => {
    demoApi.seedDemoData.mockRejectedValue(
      new ApiError({ status: 422, code: 'employees_exist', message: 'Delete all employees before seeding' }),
    )
    renderApp(<EmployeesPage />, { route: '/employees' })

    await openMenu()
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Seed demo data' }))

    expect(await screen.findByText('Delete all employees before seeding')).toBeInTheDocument()
  })

  it('asks for confirmation before deleting everything, and does nothing if you cancel', async () => {
    renderApp(<EmployeesPage />, { route: '/employees' })

    await openMenu()
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete all employees' }))
    const dialog = await screen.findByRole('dialog', { name: 'Delete all employees?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    expect(demoApi.deleteAllEmployees).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('deletes every employee once confirmed, then refreshes the list', async () => {
    demoApi.deleteAllEmployees.mockResolvedValue({ deleted_count: 3 })
    renderApp(<EmployeesPage />, { route: '/employees' })
    await waitFor(() => expect(employeesApi.listEmployees).toHaveBeenCalled())
    const listCallsBefore = employeesApi.listEmployees.mock.calls.length

    await openMenu()
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete all employees' }))
    const dialog = await screen.findByRole('dialog', { name: 'Delete all employees?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete everything' }))

    expect(await screen.findByText('Deleted 3 employees')).toBeInTheDocument()
    expect(demoApi.deleteAllEmployees).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(employeesApi.listEmployees.mock.calls.length).toBeGreaterThan(listCallsBefore))
  })

  it('shows why when the delete fails', async () => {
    demoApi.deleteAllEmployees.mockRejectedValue(new ApiError({ status: 500, code: 'server_error', message: 'Boom' }))
    renderApp(<EmployeesPage />, { route: '/employees' })

    await openMenu()
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete all employees' }))
    const dialog = await screen.findByRole('dialog', { name: 'Delete all employees?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete everything' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('The server didn’t respond. Try again in a moment.')
  })
})

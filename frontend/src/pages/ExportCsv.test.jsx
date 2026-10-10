import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client.js'
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
vi.mock('../api/meta.js', () => ({ getMeta: vi.fn() }))
vi.mock('../api/auth.js', () => ({ login: vi.fn(), logout: vi.fn() }))

const meta = { countries: [{ value: 'india', label: 'India' }], departments: [], levels: [], genders: [] }

const priya = {
  id: 1,
  employee_code: 'EMP-00001',
  full_name: 'Priya Raman',
  email: 'priya.raman@acme.com',
  gender: 'female',
  job_title: 'Senior Engineer',
  department: 'hr',
  level: 'senior',
  country: 'india',
  hire_date: '2021-05-17',
  salary: 176800,
  terminated_on: null,
}

function listResponse(rows, totalCount = rows.length) {
  return { data: rows, meta: { page: 1, per_page: 10, total_count: totalCount, total_pages: 1 } }
}

describe('CSV export', () => {
  let savedFilenames

  beforeEach(() => {
    vi.clearAllMocks()
    savedFilenames = []
    metaApi.getMeta.mockResolvedValue(meta)
    employeesApi.listEmployees.mockResolvedValue(listResponse([priya], 1))
    employeesApi.exportEmployees.mockResolvedValue({ blob: new Blob(['employee_code\r\n']), filename: 'employees-2026-10-09.csv' })
    URL.createObjectURL = vi.fn(() => 'blob:fake')
    URL.revokeObjectURL = vi.fn()
    // jsdom cannot download, so record the filename the link was given instead.
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function recordClick() {
      savedFilenames.push(this.download)
    })
  })

  it('exports what the filters currently show, without paging, and saves it under the server filename', async () => {
    renderApp(<EmployeesPage />, { route: '/employees?q=raj&country=india&sort=salary&direction=desc&page=3' })

    await userEvent.click(await screen.findByRole('button', { name: 'Export CSV · 1' }))

    await waitFor(() => expect(savedFilenames).toEqual(['employees-2026-10-09.csv']))
    const params = employeesApi.exportEmployees.mock.calls[0][0]
    expect(params).toMatchObject({ q: 'raj', country: 'india', sort: 'salary', direction: 'desc' })
    expect(params).not.toHaveProperty('page')
    expect(params).not.toHaveProperty('per_page')
    expect(params).not.toHaveProperty('status')
  })

  it('asks for the terminated records on the Terminated list', async () => {
    employeesApi.listEmployees.mockResolvedValue(listResponse([{ ...priya, terminated_on: '2026-10-09' }], 1))
    renderApp(<EmployeesPage status="terminated" />, { route: '/employees/terminated' })

    await userEvent.click(await screen.findByRole('button', { name: 'Export CSV · 1' }))

    await waitFor(() => expect(employeesApi.exportEmployees).toHaveBeenCalledOnce())
    expect(employeesApi.exportEmployees.mock.calls[0][0]).toMatchObject({ status: 'terminated', sort: 'terminated_on', direction: 'desc' })
  })

  it('tells you when the export fails and lets you try again', async () => {
    employeesApi.exportEmployees.mockRejectedValueOnce(new ApiError({ status: 500, code: 'server_error', message: 'Boom' }))
    renderApp(<EmployeesPage />, { route: '/employees' })

    await userEvent.click(await screen.findByRole('button', { name: 'Export CSV · 1' }))

    expect(await screen.findByText('Couldn’t export. Try again.')).toBeInTheDocument()
    expect(savedFilenames).toEqual([])
    expect(screen.getByRole('button', { name: 'Export CSV · 1' })).toBeEnabled()
  })

  it('is disabled when nothing matches', async () => {
    employeesApi.listEmployees.mockResolvedValue(listResponse([], 0))
    renderApp(<EmployeesPage />, { route: '/employees?q=zzz' })

    expect(await screen.findByRole('button', { name: 'Export CSV · 0' })).toBeDisabled()
  })
})

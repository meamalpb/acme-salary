import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as employeesApi from '../api/employees.js'
import * as metaApi from '../api/meta.js'
import { renderApp } from '../test/renderApp.jsx'
import EmployeesPage from './EmployeesPage.jsx'

vi.mock('../api/employees.js', () => ({
  listEmployees: vi.fn(),
  createEmployee: vi.fn(),
  updateEmployee: vi.fn(),
  terminateEmployee: vi.fn(),
}))
vi.mock('../api/meta.js', () => ({ getMeta: vi.fn() }))
vi.mock('../api/auth.js', () => ({ login: vi.fn(), logout: vi.fn() }))

const meta = {
  countries: [{ value: 'india', label: 'India' }],
  departments: [{ value: 'engineering', label: 'Engineering' }],
  levels: [{ value: 'senior', label: 'Senior' }],
  genders: [{ value: 'male', label: 'Male' }],
}

const rohan = {
  id: 2,
  employee_code: 'EMP-04977',
  full_name: 'Rohan Iyer',
  email: 'rohan.iyer@acme.com',
  gender: 'male',
  job_title: 'Senior Engineer',
  department: 'engineering',
  level: 'senior',
  country: 'india',
  hire_date: '2020-07-27',
  salary: 96800,
  terminated_on: '2026-10-09',
}

function renderTerminated() {
  renderApp(<EmployeesPage status="terminated" />, { route: '/employees/terminated' })
}

describe('Terminated employees', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    metaApi.getMeta.mockResolvedValue(meta)
    employeesApi.listEmployees.mockImplementation(async (params) => ({
      data: params.per_page === 1 ? [] : [rohan],
      meta: { page: 1, per_page: params.per_page, total_count: params.per_page === 1 ? 588 : 1, total_pages: 1 },
    }))
  })

  it('lists terminated employees, newest first, without any way to add or change them', async () => {
    renderTerminated()

    const row = (await screen.findByText('Rohan Iyer')).closest('tr')
    expect(within(row).getByText('9 Oct 2026')).toBeInTheDocument()
    expect(within(row).getByText('27 Jul 2020')).toBeInTheDocument()
    expect(within(row).getByText('$96,800')).toBeInTheDocument()
    const listCall = employeesApi.listEmployees.mock.calls.findLast(([params]) => params.per_page === 10)[0]
    expect(listCall).toMatchObject({ status: 'terminated', sort: 'terminated_on', direction: 'desc', page: 1 })
    expect(screen.getByText(/Terminated records are read-only/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Last salary/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add employee' })).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Level' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Edit / })).not.toBeInTheDocument()
  })

  it('opens a read-only view of a terminated employee', async () => {
    renderTerminated()
    await screen.findByText('Rohan Iyer')

    await userEvent.click(screen.getByRole('button', { name: 'View Rohan Iyer (read-only)' }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('View only — terminated records can’t be edited or reinstated.')).toBeInTheDocument()
    expect(within(dialog).getByText('rohan.iyer@acme.com')).toBeInTheDocument()
    expect(within(dialog).getByText('Termination date')).toBeInTheDocument()
    expect(within(dialog).getByText('$96,800 USD')).toBeInTheDocument()
    expect(within(dialog).queryAllByRole('textbox')).toHaveLength(0)

    await userEvent.click(within(dialog).getAllByRole('button', { name: 'Close' }).at(-1))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('says so when nobody has been terminated', async () => {
    employeesApi.listEmployees.mockResolvedValue({ data: [], meta: { page: 1, per_page: 10, total_count: 0, total_pages: 1 } })
    renderTerminated()

    expect(await screen.findByText('No employees have been terminated.')).toBeInTheDocument()
  })
})

import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client.js'
import * as employeesApi from '../api/employees.js'
import * as importsApi from '../api/employeeImports.js'
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
vi.mock('../api/employeeImports.js', () => ({ createEmployeeImport: vi.fn(), getEmployeeImport: vi.fn() }))
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

const csvFile = new File(['full_name,email\n'], 'staff.csv', { type: 'text/csv' })

function importRecord(overrides = {}) {
  return {
    id: 7,
    status: 'queued',
    filename: 'staff.csv',
    created_count: 0,
    row_errors: [],
    error_message: null,
    created_at: '2026-10-10T12:00:00.000Z',
    ...overrides,
  }
}

// Opens the modal, picks staff.csv and starts the import. Returns the dialog.
async function uploadCsv() {
  await userEvent.click(await screen.findByRole('button', { name: 'Import CSV' }))
  const dialog = await screen.findByRole('dialog', { name: 'Import employees' })
  // Mantine's FileInput keeps the real file input hidden behind its button.
  await userEvent.upload(dialog.querySelector('input[type="file"]'), csvFile)
  await userEvent.click(within(dialog).getByRole('button', { name: 'Import' }))
  return dialog
}

describe('CSV import', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    metaApi.getMeta.mockResolvedValue(meta)
    employeesApi.listEmployees.mockResolvedValue({
      data: [priya],
      meta: { page: 1, per_page: 10, total_count: 1, total_pages: 1 },
    })
    importsApi.createEmployeeImport.mockResolvedValue(importRecord())
  })

  it('uploads the file, waits for the import to finish, then shows the count and refreshes the list', async () => {
    importsApi.getEmployeeImport
      .mockResolvedValueOnce(importRecord({ status: 'processing' }))
      .mockResolvedValue(importRecord({ status: 'succeeded', created_count: 1234 }))
    renderApp(<EmployeesPage />, { route: '/employees' })
    await screen.findByText('Priya Raman')
    const listCallsBefore = employeesApi.listEmployees.mock.calls.length

    const dialog = await uploadCsv()

    expect(importsApi.createEmployeeImport).toHaveBeenCalledWith(csvFile)
    expect(await within(dialog).findByText('Importing staff.csv…')).toBeInTheDocument()
    expect(await within(dialog).findByText('Imported 1,234 employees', {}, { timeout: 3000 })).toBeInTheDocument()
    expect(importsApi.getEmployeeImport).toHaveBeenCalledWith(7)
    await waitFor(() => expect(employeesApi.listEmployees.mock.calls.length).toBeGreaterThan(listCallsBefore))
  })

  it('lists every row error in words, and lets you upload another file', async () => {
    importsApi.getEmployeeImport.mockResolvedValue(
      importRecord({
        status: 'failed',
        error_message: 'Nothing was imported. Fix the rows listed and upload the file again.',
        row_errors: [
          { row: 3, errors: { salary: ['must be greater than 0'] } },
          { row: 5, errors: { hire_date: ['must be a date in YYYY-MM-DD format'], email: ['is also in row 2'] } },
        ],
      }),
    )
    renderApp(<EmployeesPage />, { route: '/employees' })

    const dialog = await uploadCsv()

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Nothing was imported. Fix the rows listed and upload the file again.',
    )
    expect(within(dialog).getByRole('cell', { name: '3' })).toBeInTheDocument()
    expect(within(dialog).getByText('Salary must be greater than 0')).toBeInTheDocument()
    expect(within(dialog).getByRole('cell', { name: '5' })).toBeInTheDocument()
    expect(within(dialog).getByText('Hire date must be a date in YYYY-MM-DD format')).toBeInTheDocument()
    expect(within(dialog).getByText('Email is also in row 2')).toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Upload another file' }))

    expect(within(dialog).getByRole('button', { name: 'Import' })).toBeDisabled()
  })

  it('shows a problem with the whole file straight away, without waiting for the import', async () => {
    importsApi.createEmployeeImport.mockRejectedValue(
      new ApiError({
        status: 422,
        code: 'invalid_file',
        message: 'File must be UTF-8 encoded (in Excel, save as "CSV UTF-8")',
        details: { file: ['must be UTF-8 encoded (in Excel, save as "CSV UTF-8")'] },
      }),
    )
    renderApp(<EmployeesPage />, { route: '/employees' })

    const dialog = await uploadCsv()

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'File must be UTF-8 encoded (in Excel, save as "CSV UTF-8")',
    )
    expect(importsApi.getEmployeeImport).not.toHaveBeenCalled()
    expect(within(dialog).getByRole('button', { name: 'Import' })).toBeEnabled()
  })

  it('explains a failed import that no row is to blame for', async () => {
    importsApi.getEmployeeImport.mockResolvedValue(
      importRecord({
        status: 'failed',
        error_message: 'Employees changed while this file was importing, so nothing was imported. Upload the file again.',
      }),
    )
    renderApp(<EmployeesPage />, { route: '/employees' })

    const dialog = await uploadCsv()

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Employees changed while this file was importing, so nothing was imported. Upload the file again.',
    )
    expect(within(dialog).queryByRole('table')).not.toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Upload another file' })).toBeInTheDocument()
  })
})

import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client.js'
import * as employeesApi from '../api/employees.js'
import * as metaApi from '../api/meta.js'
import { renderApp } from '../test/renderApp.jsx'
import EmployeesPage from './EmployeesPage.jsx'

vi.mock('../api/employees.js', () => ({ listEmployees: vi.fn(), createEmployee: vi.fn(), updateEmployee: vi.fn() }))
vi.mock('../api/meta.js', () => ({ getMeta: vi.fn() }))
vi.mock('../api/auth.js', () => ({ login: vi.fn(), logout: vi.fn() }))

const meta = {
  countries: [
    { value: 'india', label: 'India' },
    { value: 'united_states', label: 'United States' },
  ],
  departments: [
    { value: 'engineering', label: 'Engineering' },
    { value: 'hr', label: 'HR' },
  ],
  levels: [
    { value: 'junior', label: 'Junior' },
    { value: 'senior', label: 'Senior' },
  ],
  genders: [
    { value: 'female', label: 'Female' },
    { value: 'male', label: 'Male' },
  ],
}

const priya = {
  id: 1,
  employee_code: 'EMP-00001',
  full_name: 'Priya Raman',
  email: 'priya.raman@acme.com',
  gender: 'female',
  job_title: 'Senior Engineer',
  department: 'hr',
  level: 'senior',
  country: 'united_states',
  hire_date: '2021-05-17',
  salary: 176800,
  terminated_on: null,
}

function listResponse(rows, { page = 1, totalCount = rows.length, totalPages = 1 } = {}) {
  return { data: rows, meta: { page, per_page: 10, total_count: totalCount, total_pages: totalPages } }
}

// Shows the router's current URL so tests can assert on it.
function LocationProbe() {
  return <p data-testid="search">{useLocation().search}</p>
}

function renderList(route = '/employees') {
  renderApp(
    <>
      <EmployeesPage />
      <LocationProbe />
    </>,
    { route },
  )
}

function lastListCall() {
  return employeesApi.listEmployees.mock.calls.findLast(([params]) => !params.status)[0]
}

async function chooseOption(label, optionName) {
  await userEvent.click(screen.getByRole('combobox', { name: label }))
  await userEvent.click(await screen.findByRole('option', { name: optionName }))
}

describe('EmployeesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    metaApi.getMeta.mockResolvedValue(meta)
    employeesApi.listEmployees.mockImplementation(async (params) =>
      params.status ? listResponse([], { totalCount: params.status === 'active' ? 9412 : 588 }) : listResponse([priya]),
    )
  })

  it('lists active employees with formatted values and the tab counts', async () => {
    renderList()

    const row = (await screen.findByText('Priya Raman')).closest('tr')
    expect(within(row).getByText('EMP-00001')).toBeInTheDocument()
    expect(within(row).getByText('HR')).toBeInTheDocument()
    expect(within(row).getByText('Senior')).toBeInTheDocument()
    expect(within(row).getByText('United States')).toBeInTheDocument()
    expect(within(row).getByText('17 May 2021')).toBeInTheDocument()
    expect(within(row).getByText('$176,800')).toBeInTheDocument()
    expect(lastListCall()).toMatchObject({ sort: 'full_name', direction: 'asc', page: 1, per_page: 10 })
    expect(await screen.findByText('9,412')).toBeInTheDocument()
    expect(await screen.findByText('588')).toBeInTheDocument()
    expect(screen.getByText('1–1 of 1')).toBeInTheDocument()
  })

  it('applies filters from the URL and shows them as removable chips', async () => {
    renderList('/employees?q=raj&country=india&level=senior')

    await screen.findByText('Priya Raman')
    expect(lastListCall()).toMatchObject({ q: 'raj', country: 'india', level: 'senior' })

    await userEvent.click(screen.getByRole('button', { name: /Remove filter India/ }))

    await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent('?q=raj&level=senior'))
  })

  it('writes a chosen filter to the URL and goes back to page 1', async () => {
    renderList('/employees?page=3')
    await screen.findByText('Priya Raman')

    await chooseOption('Country', 'India')

    await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent('?country=india'))
    await waitFor(() => expect(lastListCall()).toMatchObject({ country: 'india', page: 1 }))
  })

  it('puts the search text in the URL once typing pauses', async () => {
    renderList()
    await screen.findByText('Priya Raman')

    await userEvent.type(screen.getByLabelText('Search'), 'priya')

    await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent('?q=priya'))
    expect(lastListCall()).toMatchObject({ q: 'priya' })
  })

  it('sorts by a column and flips the direction on a second click', async () => {
    renderList()
    await screen.findByText('Priya Raman')

    await userEvent.click(screen.getByRole('button', { name: /Salary/ }))
    await waitFor(() => expect(lastListCall()).toMatchObject({ sort: 'salary', direction: 'desc' }))

    await userEvent.click(screen.getByRole('button', { name: /Salary/ }))
    await waitFor(() => expect(lastListCall()).toMatchObject({ sort: 'salary', direction: 'asc' }))
    expect(screen.getByTestId('search')).toHaveTextContent('?sort=salary&direction=asc')
  })

  it('shows an error with a retry and keeps the filters', async () => {
    employeesApi.listEmployees.mockImplementation(async (params) => {
      if (params.status) return listResponse([])
      throw new ApiError({ status: 500, code: 'server_error', message: 'Boom' })
    })
    renderList('/employees?country=india')

    expect(await screen.findByText('Couldn’t load employees')).toBeInTheDocument()
    expect(screen.getByTestId('search')).toHaveTextContent('?country=india')

    employeesApi.listEmployees.mockImplementation(async (params) => listResponse(params.status ? [] : [priya]))
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Priya Raman')).toBeInTheDocument()
  })

  it('shows an empty state that clears the filters', async () => {
    employeesApi.listEmployees.mockImplementation(async (params) => listResponse([], { totalCount: params.status ? 0 : 0 }))
    renderList('/employees?q=zzz&department=hr')

    expect(await screen.findByText(/No employees match these filters/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }))

    await waitFor(() => expect(screen.getByTestId('search')).toBeEmptyDOMElement())
  })

  it('opens an empty Add employee modal from the header button', async () => {
    renderList()
    await screen.findByText('Priya Raman')

    await userEvent.click(screen.getByRole('button', { name: 'Add employee' }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Add employee')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Full name')).toHaveValue('')
  })

  it('edits a row, closes the modal and refreshes the list', async () => {
    employeesApi.updateEmployee.mockResolvedValue({ ...priya, salary: 180000 })
    renderList()
    await screen.findByText('Priya Raman')
    const listCallsBefore = employeesApi.listEmployees.mock.calls.length

    await userEvent.click(screen.getByRole('button', { name: 'Edit Priya Raman' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByLabelText('Full name')).toHaveValue('Priya Raman')
    await userEvent.clear(within(dialog).getByLabelText('Annual salary'))
    await userEvent.type(within(dialog).getByLabelText('Annual salary'), '180000')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(employeesApi.updateEmployee).toHaveBeenCalledWith(1, expect.objectContaining({ salary: 180000 }))
    await waitFor(() => expect(employeesApi.listEmployees.mock.calls.length).toBeGreaterThan(listCallsBefore))
  })
})

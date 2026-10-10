import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client.js'
import * as employeesApi from '../api/employees.js'
import * as insightsApi from '../api/insights.js'
import * as metaApi from '../api/meta.js'
import { renderApp } from '../test/renderApp.jsx'
import InsightsPage from './InsightsPage.jsx'

vi.mock('../api/insights.js', () => ({ getCountryInsights: vi.fn() }))
vi.mock('../api/employees.js', () => ({
  listEmployees: vi.fn(),
  getEmployee: vi.fn(),
  createEmployee: vi.fn(),
  updateEmployee: vi.fn(),
  terminateEmployee: vi.fn(),
  exportEmployees: vi.fn(),
}))
vi.mock('../api/meta.js', () => ({ getMeta: vi.fn() }))
vi.mock('../api/auth.js', () => ({ login: vi.fn(), logout: vi.fn() }))

const meta = {
  countries: [
    { value: 'brazil', label: 'Brazil' },
    { value: 'india', label: 'India' },
    { value: 'united_states', label: 'United States' },
  ],
  departments: [{ value: 'engineering', label: 'Engineering' }],
  levels: [
    { value: 'lead', label: 'Lead' },
    { value: 'principal', label: 'Principal' },
  ],
  genders: [{ value: 'female', label: 'Female' }],
}

// As the API returns them: ordered by country slug.
const insights = [
  { country: 'brazil', headcount: 452, median_salary: 47600, total_payroll: 23_500_000, top_paid: { id: 3, full_name: 'Beatriz Costa', level: 'lead', salary: 129800 } },
  { country: 'india', headcount: 1690, median_salary: 41800, total_payroll: 77_300_000, top_paid: { id: 2, full_name: 'Vikram Nair', level: 'principal', salary: 152300 } },
  { country: 'united_states', headcount: 3210, median_salary: 132400, total_payroll: 449_600_000, top_paid: { id: 1, full_name: 'Priya Raman', level: 'principal', salary: 268400 } },
]

function rowFor(country) {
  return screen.getByRole('cell', { name: country }).closest('tr')
}

describe('InsightsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    metaApi.getMeta.mockResolvedValue(meta)
    insightsApi.getCountryInsights.mockResolvedValue({ data: insights })
  })

  it('lists countries by headcount with their median, payroll and top earner', async () => {
    renderApp(<InsightsPage />)

    await screen.findByRole('cell', { name: 'United States' })
    const countries = screen.getAllByRole('row').slice(1).map((row) => within(row).getAllByRole('cell')[0].textContent)
    expect(countries).toEqual(['United States', 'India', 'Brazil'])

    const us = rowFor('United States')
    expect(within(us).getByText('3,210')).toBeInTheDocument()
    expect(within(us).getByText('$132,400')).toBeInTheDocument()
    expect(within(us).getByText('$449.6M')).toBeInTheDocument()
    expect(within(us).getByRole('button', { name: 'Priya Raman' })).toBeInTheDocument()
    expect(within(us).getByText('Principal')).toBeInTheDocument()
    expect(within(us).getByText('$268,400')).toBeInTheDocument()
  })

  it('sums the countries into the summary cards', async () => {
    renderApp(<InsightsPage />)
    await screen.findByRole('cell', { name: 'United States' })

    expect(screen.getByText('Total payroll', { selector: 'p' }).parentElement).toHaveTextContent('$550.4M')
    expect(screen.getByText('Active employees').parentElement).toHaveTextContent('5,352')
    expect(screen.getByText('Countries').parentElement).toHaveTextContent('3')
  })

  it('draws each median bar relative to the highest median', async () => {
    renderApp(<InsightsPage />)
    await screen.findByRole('cell', { name: 'United States' })

    expect(screen.getByText(/Bars compare each median to the highest \(United States\)/)).toBeInTheDocument()
    expect(within(rowFor('United States')).getByTestId('median-bar')).toHaveStyle({ width: '100%' })
    expect(within(rowFor('India')).getByTestId('median-bar')).toHaveStyle({ width: '32%' })
  })

  it('opens the top earner in the Edit modal', async () => {
    employeesApi.getEmployee.mockResolvedValue({
      id: 1,
      employee_code: 'EMP-00001',
      full_name: 'Priya Raman',
      email: 'priya.raman@acme.com',
      gender: 'female',
      job_title: 'Principal Engineer',
      department: 'engineering',
      level: 'principal',
      country: 'united_states',
      hire_date: '2017-11-27',
      salary: 268400,
      terminated_on: null,
    })
    renderApp(<InsightsPage />)

    await userEvent.click(await screen.findByRole('button', { name: 'Priya Raman' }))

    const dialog = await screen.findByRole('dialog')
    expect(employeesApi.getEmployee).toHaveBeenCalledWith(1)
    expect(within(dialog).getByText('Priya Raman · EMP-00001')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Job title')).toHaveValue('Principal Engineer')
  })

  it('shows an error with a retry', async () => {
    insightsApi.getCountryInsights.mockRejectedValueOnce(new ApiError({ status: 500, code: 'server_error', message: 'Boom' }))
    renderApp(<InsightsPage />)

    expect(await screen.findByText('Couldn’t load insights')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('cell', { name: 'United States' })).toBeInTheDocument()
  })

  it('says so when there are no active employees', async () => {
    insightsApi.getCountryInsights.mockResolvedValue({ data: [] })
    renderApp(<InsightsPage />)

    expect(await screen.findByText('No active employees yet.')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Countries').parentElement).toHaveTextContent('0'))
  })
})

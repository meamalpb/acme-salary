import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client.js'
import * as employeesApi from '../api/employees.js'
import { renderApp } from '../test/renderApp.jsx'
import EmployeeFormModal from './EmployeeFormModal.jsx'

vi.mock('../api/employees.js', () => ({ listEmployees: vi.fn(), createEmployee: vi.fn(), updateEmployee: vi.fn(), terminateEmployee: vi.fn() }))
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
    { value: 'non_binary', label: 'Non-binary' },
    { value: 'prefer_not_to_say', label: 'Prefer not to say' },
  ],
}

const james = {
  id: 7,
  employee_code: 'EMP-00007',
  full_name: 'James Whitfield',
  email: 'james.whitfield@acme.com',
  gender: 'male',
  job_title: 'Senior Engineer',
  department: 'engineering',
  level: 'senior',
  country: 'united_states',
  hire_date: '2021-05-17',
  salary: 176800,
  terminated_on: null,
}

const onClose = vi.fn()

function renderModal(employee = null) {
  renderApp(<EmployeeFormModal employee={employee} meta={meta} onClose={onClose} />)
}

async function chooseOption(label, optionName) {
  await userEvent.click(screen.getByRole('combobox', { name: label }))
  await userEvent.click(await screen.findByRole('option', { name: optionName }))
}

async function fillNewEmployee() {
  await userEvent.type(screen.getByLabelText('Full name'), 'Leah Novak')
  await userEvent.type(screen.getByLabelText('Email'), 'leah.novak@acme.com')
  await userEvent.type(screen.getByLabelText('Job title'), 'Product Designer')
  await chooseOption('Department', 'HR')
  await chooseOption('Country', 'India')
  await userEvent.click(screen.getByText('Female'))
  await userEvent.type(screen.getByLabelText('Annual salary'), '72000')
}

describe('EmployeeFormModal', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('adding', () => {
    it('counts the fields still to fill and keeps Create disabled', () => {
      renderModal()

      expect(screen.getByText('Employee code is assigned when you create the record')).toBeInTheDocument()
      expect(screen.getByText('7 fields to fill')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Create employee' })).toBeDisabled()
    })

    it('creates the employee and closes', async () => {
      employeesApi.createEmployee.mockResolvedValue({ ...james, id: 8 })
      renderModal()

      await fillNewEmployee()
      expect(screen.getByText('Ready to create')).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Create employee' }))

      await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
      expect(employeesApi.createEmployee).toHaveBeenCalledWith(
        expect.objectContaining({
          full_name: 'Leah Novak',
          email: 'leah.novak@acme.com',
          job_title: 'Product Designer',
          department: 'hr',
          country: 'india',
          level: 'junior',
          gender: 'female',
          salary: 72000,
        }),
      )
    })

    it('flags a salary that is not whole dollars and blocks saving', async () => {
      renderModal()
      await fillNewEmployee()

      await userEvent.type(screen.getByLabelText('Annual salary'), '.5')

      expect(screen.getAllByText('Whole dollars only, e.g. 85000').length).toBeGreaterThan(0)
      expect(screen.getByText('Fix highlighted fields')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Create employee' })).toBeDisabled()
    })
  })

  describe('editing', () => {
    it('starts with no changes and shows the salary change once edited', async () => {
      renderModal(james)

      expect(screen.getByText('James Whitfield · EMP-00007')).toBeInTheDocument()
      expect(screen.getByText('No changes')).toBeInTheDocument()
      expect(screen.getByText('Current salary')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()

      await userEvent.clear(screen.getByLabelText('Annual salary'))
      await userEvent.type(screen.getByLabelText('Annual salary'), '180000')

      expect(screen.getByText('+$3,200 (+1.8%) vs $176,800')).toBeInTheDocument()
      expect(screen.getByText('1 change')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled()
    })

    it('saves the changes', async () => {
      employeesApi.updateEmployee.mockResolvedValue({ ...james, salary: 180000 })
      renderModal(james)

      await userEvent.clear(screen.getByLabelText('Annual salary'))
      await userEvent.type(screen.getByLabelText('Annual salary'), '180,000')
      await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

      await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
      expect(employeesApi.updateEmployee).toHaveBeenCalledWith(7, expect.objectContaining({ salary: 180000, full_name: 'James Whitfield' }))
    })

    it('shows server field errors under the field until it is edited', async () => {
      employeesApi.updateEmployee.mockRejectedValue(
        new ApiError({ status: 422, code: 'validation_failed', message: 'Validation failed', details: { email: ['has already been taken'] } }),
      )
      renderModal(james)

      await userEvent.type(screen.getByLabelText('Email'), 'x')
      await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

      expect(await screen.findByText('Has already been taken')).toBeInTheDocument()
      expect(screen.getByText('Fix highlighted fields')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
      expect(onClose).not.toHaveBeenCalled()

      await userEvent.type(screen.getByLabelText('Email'), 'y')

      expect(screen.queryByText('Has already been taken')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled()
    })

    it('keeps the entered values and offers a retry when the server is unreachable', async () => {
      employeesApi.updateEmployee.mockRejectedValueOnce(new ApiError({ status: 0, code: 'network_error', message: 'Couldn’t reach the server' }))
      employeesApi.updateEmployee.mockResolvedValue({ ...james, salary: 180000 })
      renderModal(james)

      await userEvent.clear(screen.getByLabelText('Annual salary'))
      await userEvent.type(screen.getByLabelText('Annual salary'), '180000')
      await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t save changes')
      expect(screen.getByLabelText('Annual salary')).toHaveValue('180000')
      expect(onClose).not.toHaveBeenCalled()

      await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

      await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
      expect(employeesApi.updateEmployee).toHaveBeenCalledTimes(2)
    })
  })
})

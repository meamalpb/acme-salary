import { formatSalary } from './format.js'

export const FIELDS = ['full_name', 'email', 'job_title', 'hire_date', 'department', 'country', 'level', 'gender', 'salary']

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/

// Local date as yyyy-mm-dd (not toISOString, which is UTC and can be a day off).
export function todayISO() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export function blankValues() {
  return {
    full_name: '',
    email: '',
    job_title: '',
    hire_date: todayISO(),
    department: '',
    country: '',
    level: 'junior',
    gender: '',
    salary: '',
  }
}

export function valuesFrom(employee) {
  return {
    full_name: employee.full_name,
    email: employee.email,
    job_title: employee.job_title,
    hire_date: employee.hire_date,
    department: employee.department,
    country: employee.country,
    level: employee.level,
    gender: employee.gender,
    salary: employee.salary.toLocaleString('en-US'),
  }
}

// "176,800" or "$176,800" -> 176800. NaN when it is not whole dollars.
export function parseSalary(text) {
  const digits = text.replace(/[$,\s]/g, '')
  return /^\d+$/.test(digits) ? Number(digits) : Number.NaN
}

// Problems that can be seen without the server. Empty required fields are not errors here;
// they are counted by missingCount instead.
export function formatErrors(values) {
  const errors = {}
  if (values.email.trim() && !EMAIL_PATTERN.test(values.email.trim())) errors.email = 'Enter a valid email address'
  if (values.salary.trim() && !(parseSalary(values.salary) > 0)) errors.salary = 'Whole dollars only, e.g. 85000'
  if (values.hire_date > todayISO()) errors.hire_date = 'Can’t be in the future'
  return errors
}

export function missingCount(values) {
  return FIELDS.filter((field) => !values[field].trim()).length
}

export function changeCount(values, original) {
  return FIELDS.filter((field) => {
    if (field === 'salary') return parseSalary(values.salary) !== original.salary
    return values[field].trim() !== original[field]
  }).length
}

// "+$3,200 (+1.8%) vs $176,800" for an edit; null when there is nothing to compare.
export function salaryChange(values, original) {
  const next = parseSalary(values.salary)
  if (Number.isNaN(next)) return null
  const diff = next - original.salary
  if (diff === 0) return { text: 'Current salary', direction: 0 }
  const sign = diff > 0 ? '+' : '−'
  const percent = Math.round((Math.abs(diff) / original.salary) * 1000) / 10
  return {
    text: `${sign}${formatSalary(Math.abs(diff))} (${sign}${percent}%) vs ${formatSalary(original.salary)}`,
    direction: Math.sign(diff),
  }
}

export function payloadFrom(values) {
  return {
    full_name: values.full_name.trim(),
    email: values.email.trim(),
    job_title: values.job_title.trim(),
    hire_date: values.hire_date,
    department: values.department,
    country: values.country,
    level: values.level,
    gender: values.gender,
    salary: parseSalary(values.salary),
  }
}

function sentence(messages) {
  const text = messages.join(', ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// Splits the API's { field: [messages] } into messages for form fields and for everything else.
export function splitServerErrors(details) {
  const fieldErrors = {}
  const otherErrors = []
  for (const [field, messages] of Object.entries(details ?? {})) {
    if (FIELDS.includes(field)) fieldErrors[field] = sentence(messages)
    else otherErrors.push(sentence(messages))
  }
  return { fieldErrors, otherErrors }
}

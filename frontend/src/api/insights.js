import { request } from './client.js'

// Active employees only. Returns { data: [{ country, headcount, median_salary, total_payroll, top_paid }] },
// ordered by country, where top_paid is { id, full_name, level, salary }.
export function getCountryInsights() {
  return request('/api/v1/insights/countries')
}

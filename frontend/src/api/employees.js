import { request } from './client.js'

// Returns { data: [...], meta: { page, per_page, total_count, total_pages } }.
export function listEmployees(params) {
  return request('/api/v1/employees', { params })
}

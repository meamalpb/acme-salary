import { request } from './client.js'

// Demo-only. Seeds a fresh set of employees; a 422 employees_exist means delete them first.
// Returns { created_count }.
export function seedDemoData() {
  return request('/api/v1/demo/seed', { method: 'POST' })
}

// Hard-deletes every employee, terminated ones included. Returns { deleted_count }.
export function deleteAllEmployees() {
  return request('/api/v1/demo/employees', { method: 'DELETE' })
}

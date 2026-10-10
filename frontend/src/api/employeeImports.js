import { request } from './client.js'

// Returns the import, queued. A file that's unusable as a whole is rejected with a 422 invalid_file.
export function createEmployeeImport(file) {
  const body = new FormData()
  body.append('file', file)
  return request('/api/v1/employee_imports', { method: 'POST', body })
}

// Returns { id, status, filename, created_count, row_errors, error_message, created_at }.
export function getEmployeeImport(id) {
  return request(`/api/v1/employee_imports/${id}`)
}

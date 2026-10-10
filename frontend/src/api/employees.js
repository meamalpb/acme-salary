import { filenameFromDisposition } from '../download.js'
import { request, send } from './client.js'

// Returns { data: [...], meta: { page, per_page, total_count, total_pages } }.
export function listEmployees(params) {
  return request('/api/v1/employees', { params })
}

export function getEmployee(id) {
  return request(`/api/v1/employees/${id}`)
}

export function createEmployee(fields) {
  return request('/api/v1/employees', { method: 'POST', body: { employee: fields } })
}

export function updateEmployee(id, fields) {
  return request(`/api/v1/employees/${id}`, { method: 'PATCH', body: { employee: fields } })
}

// The server records today's date as the termination date.
export function terminateEmployee(id) {
  return request(`/api/v1/employees/${id}/terminate`, { method: 'POST' })
}

export async function exportEmployees(params) {
  const response = await send('/api/v1/employees/export', { params })
  return {
    blob: await response.blob(),
    filename: filenameFromDisposition(response.headers.get('Content-Disposition')),
  }
}

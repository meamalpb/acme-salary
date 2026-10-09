import { request } from './client.js'

// Returns { countries, departments, levels, genders }, each a list of { value, label }.
export function getMeta() {
  return request('/api/v1/meta')
}

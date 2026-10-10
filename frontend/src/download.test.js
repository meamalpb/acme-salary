import { describe, expect, it } from 'vitest'
import { filenameFromDisposition } from './download.js'

describe('filenameFromDisposition', () => {
  it('reads the quoted filename Rails sends', () => {
    const header = `attachment; filename="employees-2026-10-09.csv"; filename*=UTF-8''employees-2026-10-09.csv`
    expect(filenameFromDisposition(header)).toBe('employees-2026-10-09.csv')
  })

  it('falls back to a generic name when the header is missing', () => {
    expect(filenameFromDisposition(null)).toBe('employees.csv')
  })
})

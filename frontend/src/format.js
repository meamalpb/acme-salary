const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Salaries are whole USD.
export function formatSalary(amount) {
  return `$${amount.toLocaleString('en-US')}`
}

const compactUsd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

// 981_600_000 -> "$981.6M" and 47_000_000 -> "$47.0M", for totals too large to read in full.
export function formatCompactSalary(amount) {
  return compactUsd.format(amount)
}

export function formatCount(count) {
  return count.toLocaleString('en-US')
}

// "2021-05-17" -> "17 May 2021". Parsed by hand so the time zone can't shift the day.
export function formatDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number)
  return `${day} ${MONTHS[month - 1]} ${year}`
}

export function initialsFromName(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
}

const META_KEYS = { country: 'countries', department: 'departments', level: 'levels', gender: 'genders' }

// Display label for a fixed-list value, from /meta. Falls back to a titleized slug until meta loads.
export function labelFor(meta, kind, value) {
  const found = meta?.[META_KEYS[kind]]?.find((option) => option.value === value)
  if (found) return found.label
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

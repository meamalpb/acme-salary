import { useState } from 'react'
import { Button, Group, Select, Stack, TextInput } from '@mantine/core'
import { useDebouncedCallback } from '@mantine/hooks'
import { labelFor } from '../format.js'

const FILTERS = [
  { key: 'country', label: 'Country', all: 'All countries', metaKey: 'countries' },
  { key: 'department', label: 'Department', all: 'All departments', metaKey: 'departments' },
  { key: 'level', label: 'Level', all: 'All levels', metaKey: 'levels' },
]

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="10" cy="10" r="7" />
      <path d="M21 21l-6-6" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
      <path d="M7 7l10 10" />
      <path d="M17 7L7 17" />
    </svg>
  )
}

export default function EmployeeFilters({ params, meta, showLevel = true, onChange, onClear }) {
  const filters = showLevel ? FILTERS : FILTERS.filter((filter) => filter.key !== 'level')
  // The box shows what is typed; the URL only gets the text once typing pauses.
  const [search, setSearch] = useState(params.q)
  const [seenQuery, setSeenQuery] = useState(params.q)
  if (params.q !== seenQuery) {
    // The URL changed from elsewhere (a chip, "Clear all", the back button).
    setSeenQuery(params.q)
    setSearch(params.q)
  }
  const commitSearch = useDebouncedCallback((value) => onChange({ q: value.trim() }), 300)

  const chips = []
  if (params.q) chips.push({ key: 'q', text: `“${params.q}”` })
  for (const filter of filters) {
    if (params[filter.key]) chips.push({ key: filter.key, text: labelFor(meta, filter.key, params[filter.key]) })
  }

  return (
    <Stack gap="xs" p="md">
      <Group gap="sm" align="flex-start">
        <TextInput
          type="search"
          aria-label="Search"
          placeholder="Search name, email or code"
          leftSection={<SearchIcon />}
          value={search}
          onChange={(event) => {
            setSearch(event.currentTarget.value)
            commitSearch(event.currentTarget.value)
          }}
          style={{ flex: '2 1 260px' }}
        />
        {filters.map((filter) => (
          <Select
            key={filter.key}
            aria-label={filter.label}
            placeholder={filter.all}
            data={meta?.[filter.metaKey] ?? []}
            value={params[filter.key] || null}
            onChange={(value) => onChange({ [filter.key]: value ?? '' })}
            clearable
            style={{ flex: '1 1 150px' }}
          />
        ))}
      </Group>
      {chips.length > 0 && (
        <Group gap={6}>
          {chips.map((chip) => (
            <Button
              key={chip.key}
              variant="light"
              size="compact-sm"
              radius="xl"
              aria-label={`Remove filter ${chip.text}`}
              rightSection={<CloseIcon />}
              onClick={() => onChange({ [chip.key]: '' })}
            >
              {chip.text}
            </Button>
          ))}
          <Button variant="subtle" size="compact-sm" onClick={onClear}>
            Clear all
          </Button>
        </Group>
      )}
    </Stack>
  )
}

import { Badge, Group } from '@mantine/core'
import { NavLink } from 'react-router'
import { formatCount } from '../format.js'

function tabStyle({ isActive }) {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 14px',
    borderRadius: 9,
    textDecoration: 'none',
    fontWeight: isActive ? 600 : 500,
    color: isActive ? 'var(--mantine-color-dark-9)' : 'var(--mantine-color-gray-7)',
    background: isActive ? 'white' : 'transparent',
    boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
  }
}

function Count({ value, color }) {
  if (value === undefined) return null
  return (
    <Badge size="sm" variant="light" color={color}>
      {formatCount(value)}
    </Badge>
  )
}

export default function StatusTabs({ activeCount, terminatedCount }) {
  return (
    <Group component="nav" aria-label="Employee status" gap={4} p={4} bg="gray.2" w="fit-content" style={{ borderRadius: 12 }}>
      <NavLink to="/employees" end style={tabStyle}>
        Active <Count value={activeCount} color="brand" />
      </NavLink>
      <NavLink to="/employees/terminated" style={tabStyle}>
        Terminated <Count value={terminatedCount} color="red" />
      </NavLink>
    </Group>
  )
}

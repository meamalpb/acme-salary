import { ActionIcon, Avatar, Box, Group, Text } from '@mantine/core'
import { NavLink } from 'react-router'
import { useAuth } from '../auth/context.js'

// "maya.patel@acme.com" -> "MP"; falls back to the first two letters.
function initialsFromEmail(email) {
  const parts = email.split('@')[0].split(/[._-]+/).filter(Boolean)
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : (parts[0] ?? '?').slice(0, 2)
  return letters.toUpperCase()
}

function navStyle({ isActive }) {
  return {
    padding: '8px 14px',
    borderRadius: 10,
    textDecoration: 'none',
    fontWeight: isActive ? 600 : 500,
    color: isActive ? 'var(--mantine-color-brand-8)' : 'inherit',
    background: isActive ? 'var(--mantine-color-brand-1)' : 'transparent',
  }
}

export default function AppHeader() {
  const { email, logout } = useAuth()

  return (
    <Box component="header" bg="white" px="lg" mih={60} style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
      <Group h="100%" mih={60} gap={{ base: 'sm', sm: 'lg' }} wrap="nowrap">
        <Group gap="sm">
          <Box
            w={30}
            h={30}
            bg="brand.7"
            c="white"
            fw={700}
            fz={14}
            display="flex"
            style={{ borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}
          >
            A
          </Box>
          <Text fw={700} fz={17} visibleFrom="sm">
            ACME Salary
          </Text>
        </Group>
        <Group component="nav" aria-label="Main" gap={4} wrap="nowrap" style={{ flex: 1 }}>
          <NavLink to="/employees" style={navStyle}>
            Employees
          </NavLink>
          <NavLink to="/insights" style={navStyle}>
            Insights
          </NavLink>
        </Group>
        <Group gap="sm">
          <Avatar size={32} radius="xl" color="brand" fw={700}>
            {initialsFromEmail(email)}
          </Avatar>
          <Text fw={500} visibleFrom="sm">
            {email}
          </Text>
          <ActionIcon variant="subtle" color="gray" size={36} aria-label="Sign out" onClick={logout}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-2" />
              <path d="M9 12h12l-3-3" />
              <path d="M18 15l3-3" />
            </svg>
          </ActionIcon>
        </Group>
      </Group>
    </Box>
  )
}

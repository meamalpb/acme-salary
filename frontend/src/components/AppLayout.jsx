import { Box } from '@mantine/core'
import { Outlet } from 'react-router'
import AppHeader from './AppHeader.jsx'

export default function AppLayout() {
  return (
    <Box h="100dvh" display="flex" style={{ flexDirection: 'column' }}>
      <AppHeader />
      <Box component="main" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <Box maw={1320} mx="auto" px="lg" py="md" mih="100%" display="flex" style={{ flexDirection: 'column' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}

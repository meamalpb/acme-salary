import { Box } from '@mantine/core'
import { Outlet } from 'react-router'
import AppHeader from './AppHeader.jsx'

export default function AppLayout() {
  return (
    <>
      <AppHeader />
      <Box component="main" maw={1320} mx="auto" p="lg">
        <Outlet />
      </Box>
    </>
  )
}

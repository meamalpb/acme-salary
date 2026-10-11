import { useState } from 'react'
import { Alert, Button, Group, Menu, Modal, Stack } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useDeleteAllEmployees, useSeedDemoData } from '../hooks/useDemoData.js'
import { useReturnFocus } from '../hooks/useReturnFocus.js'

// Why the server said no, in words for the user.
function failureMessage(error) {
  if (error.status === 0 || error.status >= 500) return 'The server didn’t respond. Try again in a moment.'
  return error.message
}

function DeleteAllModal({ onClose }) {
  useReturnFocus()
  const deleteAll = useDeleteAllEmployees()

  function handleDelete() {
    deleteAll.mutate(undefined, {
      onSuccess: ({ deleted_count: count }) => {
        notifications.show({ message: `Deleted ${count.toLocaleString()} employees`, color: 'brand' })
        onClose()
      },
    })
  }

  return (
    <Modal
      opened
      onClose={onClose}
      title="Delete all employees?"
      size={440}
      radius="lg"
      yOffset={140}
      closeOnEscape={!deleteAll.isPending}
      closeOnClickOutside={!deleteAll.isPending}
      closeButtonProps={{ 'aria-label': 'Close' }}
    >
      <Stack gap="sm">
        <Alert color="red" variant="light" role="note" title="This can’t be undone.">
          Every employee is permanently removed, terminated ones included. Use Seed demo data afterwards to get a fresh set.
        </Alert>
        {deleteAll.isError && (
          <Alert color="red" variant="light" role="alert" title="Couldn’t delete">
            {failureMessage(deleteAll.error)}
          </Alert>
        )}
        <Group justify="flex-end" gap="sm" mt="xs">
          <Button variant="default" onClick={onClose} disabled={deleteAll.isPending} data-autofocus>
            Cancel
          </Button>
          <Button color="red" loading={deleteAll.isPending} onClick={handleDelete}>
            {deleteAll.isError ? 'Try again' : 'Delete everything'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}

// Demo-only: wipe all employees, or seed a fresh set.
export default function DemoTools() {
  const [confirming, setConfirming] = useState(false)
  const seed = useSeedDemoData()

  function handleSeed() {
    seed.mutate(undefined, {
      onSuccess: ({ created_count: count }) =>
        notifications.show({ message: `Seeded ${count.toLocaleString()} employees`, color: 'brand' }),
      onError: (error) =>
        notifications.show({ title: 'Couldn’t seed', message: failureMessage(error), color: 'red' }),
    })
  }

  return (
    <>
      <Menu position="bottom-end" withinPortal>
        <Menu.Target>
          <Button variant="default" loading={seed.isPending} aria-label="Demo tools">
            Demo tools
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item onClick={handleSeed}>Seed demo data</Menu.Item>
          <Menu.Item color="red" onClick={() => setConfirming(true)}>
            Delete all employees
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
      {confirming && <DeleteAllModal onClose={() => setConfirming(false)} />}
    </>
  )
}

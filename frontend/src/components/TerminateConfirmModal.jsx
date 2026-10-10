import { Alert, Button, Group, Modal, Stack, Text } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { todayISO } from '../employeeForm.js'
import { formatDate, labelFor } from '../format.js'
import { useTerminateEmployee } from '../hooks/useTerminateEmployee.js'

// Why the server said no, in words for the HR manager.
function failureMessage(error) {
  if (error.status === 0 || error.status >= 500) return 'The server didn’t respond. Try again in a moment.'
  const details = Object.values(error.details ?? {}).flat()
  return details.length > 0 ? details.join(' ') : error.message
}

export default function TerminateConfirmModal({ employee, meta, onCancel, onTerminated }) {
  const terminate = useTerminateEmployee()

  function handleTerminate() {
    terminate.mutate(employee.id, {
      onSuccess: () => {
        notifications.show({ message: `${employee.full_name} was terminated`, color: 'brand' })
        onTerminated()
      },
    })
  }

  return (
    <Modal
      opened
      onClose={onCancel}
      title={`Terminate ${employee.full_name}?`}
      size={440}
      radius="lg"
      yOffset={140}
      closeOnEscape={!terminate.isPending}
      closeOnClickOutside={!terminate.isPending}
      closeButtonProps={{ 'aria-label': 'Close' }}
    >
      <Stack gap="sm">
        <Text size="sm" c="dimmed">
          {employee.employee_code} · {employee.job_title} · {labelFor(meta, 'country', employee.country)}
        </Text>
        <Alert color="red" variant="light" role="note" title="This can’t be undone.">
          The record becomes read-only, moves to Terminated, and is excluded from insights.
        </Alert>
        {terminate.isError && (
          <Alert color="red" variant="light" role="alert" title="Couldn’t terminate">
            {failureMessage(terminate.error)}
          </Alert>
        )}
        <Text size="sm" c="dimmed">
          Termination date will be recorded as today, <strong>{formatDate(todayISO())}</strong>.
        </Text>
        <Group justify="flex-end" gap="sm" mt="xs">
          <Button variant="default" onClick={onCancel} disabled={terminate.isPending}>
            Keep employee
          </Button>
          <Button color="red" loading={terminate.isPending} onClick={handleTerminate}>
            {terminate.isError ? 'Try again' : 'Terminate'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}

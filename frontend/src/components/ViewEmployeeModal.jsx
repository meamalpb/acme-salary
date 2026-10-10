import { Avatar, Badge, Box, Button, Group, Modal, SimpleGrid, Text } from '@mantine/core'
import { formatDate, formatSalary, initialsFromName, labelFor } from '../format.js'

function Field({ label, value, span, color, weight = 500 }) {
  return (
    <Box style={{ gridColumn: span ? '1 / -1' : undefined }}>
      <Text component="dt" size="xs" fw={600} c="dimmed">
        {label}
      </Text>
      <Text component="dd" m={0} fw={weight} c={color} style={{ fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </Text>
    </Box>
  )
}

// A terminated employee, read only. There is nothing to edit or reinstate.
export default function ViewEmployeeModal({ employee, meta, onClose }) {
  const title = (
    <Group gap="sm" wrap="nowrap" component="span">
      <Avatar size={40} radius="xl" color="gray" fw={700}>
        {initialsFromName(employee.full_name)}
      </Avatar>
      <Box component="span">
        <Text component="span" display="block" fw={600} fz={16}>
          {employee.full_name}
        </Text>
        <Text component="span" display="block" size="xs" c="dimmed">
          {employee.employee_code} · {employee.job_title}
        </Text>
      </Box>
      <Badge color="red" variant="light">
        Terminated
      </Badge>
    </Group>
  )

  return (
    <Modal opened onClose={onClose} title={title} size={520} radius="lg" yOffset={72} closeButtonProps={{ 'aria-label': 'Close' }}>
      <Text size="sm" c="gray.7" p="xs" px="sm" bg="gray.1" style={{ borderRadius: 12 }}>
        View only — terminated records can’t be edited or reinstated.
      </Text>
      <SimpleGrid component="dl" cols={2} spacing="sm" verticalSpacing="sm" m={0} mt="md">
        <Field label="Email" value={employee.email} span />
        <Field label="Gender" value={labelFor(meta, 'gender', employee.gender)} />
        <Field label="Department" value={labelFor(meta, 'department', employee.department)} />
        <Field label="Level" value={labelFor(meta, 'level', employee.level)} />
        <Field label="Country" value={labelFor(meta, 'country', employee.country)} />
        <Field label="Hire date" value={formatDate(employee.hire_date)} />
        <Field label="Termination date" value={formatDate(employee.terminated_on)} color="red.8" />
        <Field label="Last annual salary" value={`${formatSalary(employee.salary)} USD`} weight={700} />
      </SimpleGrid>
      <Group justify="flex-end" mt="lg" pt="md" style={{ borderTop: '1px solid var(--mantine-color-gray-1)' }}>
        <Button variant="default" onClick={onClose}>
          Close
        </Button>
      </Group>
    </Modal>
  )
}

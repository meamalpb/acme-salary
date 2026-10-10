import { useState } from 'react'
import { Alert, Avatar, Box, Button, Group, Input, Modal, SegmentedControl, Select, SimpleGrid, Stack, Text, TextInput } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import {
  blankValues,
  changeCount,
  formatErrors,
  missingCount,
  payloadFrom,
  salaryChange,
  splitServerErrors,
  valuesFrom,
} from '../employeeForm.js'
import { initialsFromName } from '../format.js'
import { useSaveEmployee } from '../hooks/useSaveEmployee.js'
import TerminateConfirmModal from './TerminateConfirmModal.jsx'

function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

// Add (employee is null) or edit an employee. The server stays the source of truth:
// its field errors are shown under the matching fields.
export default function EmployeeFormModal({ employee, meta, onClose }) {
  const isEdit = Boolean(employee)
  const original = employee
  const form = useForm({ initialValues: isEdit ? valuesFrom(employee) : blankValues() })
  const save = useSaveEmployee(employee)
  const [alert, setAlert] = useState(null)
  const [confirmingTermination, setConfirmingTermination] = useState(false)
  const saving = save.isPending

  const values = form.values
  const localErrors = formatErrors(values)
  const hasServerErrors = Object.keys(form.errors).length > 0
  const missing = missingCount(values)
  const changes = isEdit ? changeCount(values, original) : 0
  const hasFormatErrors = Object.keys(localErrors).length > 0
  const blocked = hasFormatErrors || hasServerErrors || missing > 0 || (isEdit && changes === 0)
  const change = isEdit ? salaryChange(values, original) : null

  let status = ''
  if (!saving) {
    if (hasFormatErrors || hasServerErrors) status = 'Fix highlighted fields'
    else if (missing > 0) status = `${plural(missing, 'field')} to fill`
    else if (isEdit) status = changes === 0 ? 'No changes' : plural(changes, 'change')
    else status = 'Ready to create'
  }

  const fieldProps = (field) => ({ ...form.getInputProps(field), error: form.errors[field] ?? localErrors[field] })

  function handleSubmit() {
    if (blocked || saving) return
    setAlert(null)
    save.mutate(payloadFrom(values), {
      onSuccess: () => {
        notifications.show({ message: isEdit ? 'Changes saved' : 'Employee created', color: 'brand' })
        onClose()
      },
      onError: (error) => {
        const { fieldErrors, otherErrors } = splitServerErrors(error.status === 422 ? error.details : {})
        if (Object.keys(fieldErrors).length > 0) form.setErrors(fieldErrors)
        const title = isEdit ? 'Couldn’t save changes' : 'Couldn’t create employee'
        if (otherErrors.length > 0) setAlert({ title, message: otherErrors.join(' ') })
        else if (Object.keys(fieldErrors).length === 0) {
          const unreachable = error.status === 0 || error.status >= 500
          setAlert({
            title,
            message: unreachable ? 'The server didn’t respond. Your changes are still here — try again.' : error.message,
          })
        }
      },
    })
  }

  const title = (
    <Group gap="sm" wrap="nowrap" component="span">
      <Avatar size={40} radius="xl" color="brand" fw={700}>
        {values.full_name.trim() ? initialsFromName(values.full_name) : '+'}
      </Avatar>
      <Box component="span">
        <Text component="span" display="block" fw={600} fz={16}>
          {isEdit ? 'Edit employee' : 'Add employee'}
        </Text>
        <Text component="span" display="block" size="xs" c="dimmed">
          {isEdit ? `${employee.full_name} · ${employee.employee_code}` : 'Employee code is assigned when you create the record'}
        </Text>
      </Box>
    </Group>
  )

  return (
    <>
      <Modal
        opened
        onClose={onClose}
        title={title}
        size={560}
        radius="lg"
        yOffset={56}
        closeOnEscape={!saving && !confirmingTermination}
        closeOnClickOutside={!saving && !confirmingTermination}
        closeButtonProps={{ 'aria-label': 'Close' }}
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Box component="fieldset" disabled={saving} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
            <Stack gap="sm">
              {alert && (
                <Alert color="red" variant="light" role="alert" title={alert.title} withCloseButton closeButtonLabel="Dismiss" onClose={() => setAlert(null)}>
                  {alert.message}
                </Alert>
              )}
              <TextInput label="Full name" placeholder="e.g. Jane Smith" {...fieldProps('full_name')} />
              <TextInput label="Email" type="email" placeholder="name@acme.com" {...fieldProps('email')} />
              <SimpleGrid cols={2} spacing="sm">
                <TextInput label="Job title" placeholder="e.g. Senior Engineer" {...fieldProps('job_title')} />
                <TextInput label="Hire date" type="date" {...fieldProps('hire_date')} />
                <Select label="Department" placeholder="Pick department" data={meta?.departments ?? []} {...fieldProps('department')} />
                <Select label="Country" placeholder="Pick country" data={meta?.countries ?? []} {...fieldProps('country')} />
              </SimpleGrid>
              <Input.Wrapper label="Level" error={form.errors.level}>
                <SegmentedControl fullWidth data={meta?.levels ?? []} {...form.getInputProps('level')} />
              </Input.Wrapper>
              <Input.Wrapper label="Gender" error={form.errors.gender}>
                <SegmentedControl fullWidth data={meta?.genders ?? []} {...form.getInputProps('gender')} />
              </Input.Wrapper>
              <Box>
                <TextInput
                  label="Annual salary"
                  inputMode="numeric"
                  placeholder="0"
                  leftSection="$"
                  rightSection={<Text size="xs" c="dimmed">USD</Text>}
                  rightSectionWidth={44}
                  styles={{ input: { fontWeight: 600, fontVariantNumeric: 'tabular-nums' } }}
                  {...fieldProps('salary')}
                />
                {!fieldProps('salary').error && (
                  <Text size="xs" mt={4} c={change?.direction > 0 ? 'brand.8' : change?.direction < 0 ? 'red.7' : 'dimmed'}>
                    {isEdit && change ? change.text : 'Whole dollars, e.g. 85000'}
                  </Text>
                )}
              </Box>
            </Stack>
          </Box>

          <Group justify="flex-end" gap="sm" mt="lg" pt="md" style={{ borderTop: '1px solid var(--mantine-color-gray-1)' }}>
            {isEdit && (
              <Button variant="subtle" color="red" onClick={() => setConfirmingTermination(true)} disabled={saving}>
                Terminate…
              </Button>
            )}
            <Text size="xs" c="dimmed" ml="auto">
              {status}
            </Text>
            <Button variant="default" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} disabled={blocked}>
              {saving ? (isEdit ? 'Saving…' : 'Creating…') : alert ? 'Try again' : isEdit ? 'Save changes' : 'Create employee'}
            </Button>
          </Group>
        </form>
      </Modal>
      {confirmingTermination && (
        <TerminateConfirmModal employee={employee} meta={meta} onCancel={() => setConfirmingTermination(false)} onTerminated={onClose} />
      )}
    </>
  )
}

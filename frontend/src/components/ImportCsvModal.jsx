import { useState } from 'react'
import { Alert, Anchor, Button, FileInput, Group, Loader, Modal, ScrollArea, Stack, Table, Text } from '@mantine/core'
import { saveBlob } from '../download.js'
import { formatCount } from '../format.js'
import { isFinished, useEmployeeImport, useUploadEmployeeImport } from '../hooks/useEmployeeImport.js'
import { useReturnFocus } from '../hooks/useReturnFocus.js'

const TEMPLATE_COLUMNS = ['full_name', 'email', 'gender', 'job_title', 'department', 'level', 'country', 'hire_date', 'salary']
const MAX_SHOWN_ROW_ERRORS = 100

// ("hire_date", "must be a date…") -> "Hire date must be a date…", like the server's full messages.
function problemText(field, message) {
  const name = field.replace(/_/g, ' ')
  return `${name[0].toUpperCase()}${name.slice(1)} ${message}`
}

function uploadFailureMessage(error) {
  if (error.status === 0 || error.status >= 500) return 'The server didn’t respond. Try again in a moment.'
  return error.message
}

function downloadTemplate() {
  saveBlob(new Blob([`${TEMPLATE_COLUMNS.join(',')}\r\n`], { type: 'text/csv' }), 'employees-import-template.csv')
}

function RowErrors({ rowErrors }) {
  const shown = rowErrors.slice(0, MAX_SHOWN_ROW_ERRORS)
  const hiddenCount = rowErrors.length - shown.length

  return (
    <>
      <ScrollArea.Autosize mah={320} type="auto">
        <Table verticalSpacing={6} fz="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={64}>Row</Table.Th>
              <Table.Th>Problem</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {shown.map(({ row, errors }) => (
              <Table.Tr key={row}>
                <Table.Td style={{ verticalAlign: 'top' }}>{row}</Table.Td>
                <Table.Td>
                  {Object.entries(errors).flatMap(([field, messages]) =>
                    messages.map((message) => <div key={`${field}:${message}`}>{problemText(field, message)}</div>),
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea.Autosize>
      {hiddenCount > 0 && (
        <Text size="sm" c="dimmed">
          …and {formatCount(hiddenCount)} more {hiddenCount === 1 ? 'row' : 'rows'} with problems.
        </Text>
      )}
    </>
  )
}

export default function ImportCsvModal({ onClose }) {
  useReturnFocus()
  const [file, setFile] = useState(null)
  const upload = useUploadEmployeeImport()
  const { data: result } = useEmployeeImport(upload.data?.id)

  function chooseFile(chosen) {
    setFile(chosen)
    upload.reset()
  }

  function startOver() {
    setFile(null)
    upload.reset()
  }

  let body
  if (!upload.isSuccess) {
    body = (
      <>
        <Text size="sm">
          Each row adds a new employee. If any row has a problem, nothing is imported and every problem is listed, so you
          can fix the file and upload it again.
        </Text>
        <Text size="sm" c="dimmed">
          Use the template’s columns. Fixed lists take the value or the label (India or india), dates are YYYY-MM-DD and
          salaries are whole US dollars. In Excel, save as “CSV UTF-8”.
        </Text>
        <FileInput label="CSV file" placeholder="Choose a .csv file" accept=".csv,text/csv" value={file} onChange={chooseFile} clearable />
        {upload.isError && (
          <Alert color="red" variant="light" role="alert" title="Couldn’t import this file">
            {uploadFailureMessage(upload.error)}
          </Alert>
        )}
        <Group justify="space-between" gap="sm" mt="xs">
          <Anchor component="button" type="button" size="sm" onClick={downloadTemplate}>
            Download template
          </Anchor>
          <Group gap="sm">
            <Button variant="default" onClick={onClose} disabled={upload.isPending}>
              Cancel
            </Button>
            <Button disabled={!file} loading={upload.isPending} onClick={() => upload.mutate(file)}>
              Import
            </Button>
          </Group>
        </Group>
      </>
    )
  } else if (!isFinished(result)) {
    body = (
      <>
        <Group gap="sm" role="status">
          <Loader size="sm" />
          <Text>Importing {upload.data.filename ?? 'your file'}…</Text>
        </Group>
        <Text size="sm" c="dimmed">
          Keep this open to see the result. Large files take a few seconds.
        </Text>
        <Group justify="flex-end" mt="xs">
          <Button variant="default" onClick={onClose}>
            Close
          </Button>
        </Group>
      </>
    )
  } else if (result.status === 'succeeded') {
    body = (
      <>
        <Alert color="brand" variant="light" role="status" title={`Imported ${formatCount(result.created_count)} ${result.created_count === 1 ? 'employee' : 'employees'}`}>
          They’re in the Active list now.
        </Alert>
        <Group justify="flex-end" mt="xs">
          <Button onClick={onClose} data-autofocus>
            Done
          </Button>
        </Group>
      </>
    )
  } else {
    body = (
      <>
        <Alert color="red" variant="light" role="alert">
          {result.error_message}
        </Alert>
        {result.row_errors.length > 0 && <RowErrors rowErrors={result.row_errors} />}
        <Group justify="flex-end" gap="sm" mt="xs">
          <Button variant="default" onClick={onClose}>
            Close
          </Button>
          <Button onClick={startOver}>Upload another file</Button>
        </Group>
      </>
    )
  }

  return (
    <Modal
      opened
      onClose={onClose}
      title="Import employees"
      size={560}
      radius="lg"
      yOffset={120}
      closeOnEscape={!upload.isPending}
      closeOnClickOutside={!upload.isPending}
      closeButtonProps={{ 'aria-label': 'Close' }}
    >
      <Stack gap="sm">{body}</Stack>
    </Modal>
  )
}

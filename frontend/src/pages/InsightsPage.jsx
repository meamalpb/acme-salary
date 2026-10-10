import { useState } from 'react'
import { useDocumentTitle } from '@mantine/hooks'
import { Alert, Avatar, Box, Button, Group, Modal, Paper, SimpleGrid, Skeleton, Stack, Table, Text, Title, Tooltip, UnstyledButton } from '@mantine/core'
import EmployeeFormModal from '../components/EmployeeFormModal.jsx'
import { formatCompactSalary, formatCount, formatSalary, initialsFromName, labelFor } from '../format.js'
import { useCountryInsights } from '../hooks/useCountryInsights.js'
import { useEmployee } from '../hooks/useEmployee.js'
import { useMeta } from '../hooks/useMeta.js'

const COLUMN_COUNT = 5

function SummaryCard({ label, value, color }) {
  return (
    <Paper withBorder radius="lg" px="lg" py="md">
      <Text size="xs" fw={700} tt="uppercase" c="dimmed" style={{ letterSpacing: '0.04em' }}>
        {label}
      </Text>
      <Text fz={30} fw={700} mt={4} c={color} style={{ fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </Text>
    </Paper>
  )
}

// Large totals are shown compact, with the exact figure on hover.
function CompactSalary({ amount }) {
  return (
    <Tooltip label={formatSalary(amount)} withArrow>
      <span>{formatCompactSalary(amount)}</span>
    </Tooltip>
  )
}

function MessageRow({ children }) {
  return (
    <Table.Tr>
      <Table.Td colSpan={COLUMN_COUNT} py={48}>
        {children}
      </Table.Td>
    </Table.Tr>
  )
}

// The top earner's row only carries an id, so fetch the full record before opening the Edit modal.
function EditById({ id, meta, onClose }) {
  const employee = useEmployee(id)

  if (employee.isPending) return null
  if (employee.isError) {
    return (
      <Modal opened onClose={onClose} title="Couldn’t open this employee" radius="lg" closeButtonProps={{ 'aria-label': 'Close' }}>
        <Text c="dimmed">The server didn’t respond. Try again in a moment.</Text>
      </Modal>
    )
  }
  return <EmployeeFormModal employee={employee.data} meta={meta} onClose={onClose} />
}

export default function InsightsPage() {
  useDocumentTitle('Insights · ACME Salary')
  const { data: meta } = useMeta()
  const insights = useCountryInsights()
  const [editingId, setEditingId] = useState(null)

  const rows = [...(insights.data ?? [])].sort((a, b) => b.headcount - a.headcount || a.country.localeCompare(b.country))
  const totalPayroll = rows.reduce((sum, row) => sum + row.total_payroll, 0)
  const headcount = rows.reduce((sum, row) => sum + row.headcount, 0)
  const highest = rows.reduce((top, row) => (top && top.median_salary >= row.median_salary ? top : row), null)

  return (
    <Stack gap="md">
      <Box>
        <Title order={1} fz={26}>
          Insights
        </Title>
        <Text c="dimmed">Active employees only · annual salaries in USD</Text>
      </Box>

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <SummaryCard label="Total payroll" value={insights.isPending ? '—' : formatCompactSalary(totalPayroll)} color="brand.8" />
        <SummaryCard label="Active employees" value={insights.isPending ? '—' : formatCount(headcount)} />
        <SummaryCard label="Countries" value={insights.isPending ? '—' : formatCount(rows.length)} />
      </SimpleGrid>

      <Paper withBorder radius="lg" shadow="xs" style={{ overflow: 'hidden' }}>
        <Group justify="space-between" align="baseline" p="md">
          <Title order={2} fz={18} fw={600}>
            By country
          </Title>
          {highest && (
            <Text size="sm" c="dimmed">
              Bars compare each median to the highest ({labelFor(meta, 'country', highest.country)})
            </Text>
          )}
        </Group>
        <Table.ScrollContainer minWidth={960}>
          <Table verticalSpacing="sm" horizontalSpacing="md" striped aria-busy={insights.isPending}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Country</Table.Th>
                <Table.Th ta="right">Headcount</Table.Th>
                <Table.Th w={280}>Median salary</Table.Th>
                <Table.Th ta="right">Total payroll</Table.Th>
                <Table.Th>Top paid</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {insights.isPending &&
                Array.from({ length: 6 }, (_, index) => (
                  <Table.Tr key={index} aria-hidden="true">
                    {Array.from({ length: COLUMN_COUNT }, (_, cell) => (
                      <Table.Td key={cell}>
                        <Skeleton height={10} width={cell === 4 ? 180 : 90} />
                      </Table.Td>
                    ))}
                  </Table.Tr>
                ))}
              {insights.isError && (
                <MessageRow>
                  <Stack align="center" gap="xs" ta="center">
                    <Alert color="red" variant="light" role="alert" title="Couldn’t load insights" maw={420}>
                      The server didn’t respond. Try again in a moment.
                    </Alert>
                    <Button onClick={() => insights.refetch()}>Try again</Button>
                  </Stack>
                </MessageRow>
              )}
              {insights.isSuccess && rows.length === 0 && (
                <MessageRow>
                  <Text ta="center" c="dimmed">
                    No active employees yet.
                  </Text>
                </MessageRow>
              )}
              {rows.map((row) => (
                <Table.Tr key={row.country}>
                  <Table.Td fw={600}>{labelFor(meta, 'country', row.country)}</Table.Td>
                  <Table.Td ta="right" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatCount(row.headcount)}
                  </Table.Td>
                  <Table.Td>
                    <Group gap="sm" wrap="nowrap">
                      <Text w={80} fw={600} style={{ flex: 'none', fontVariantNumeric: 'tabular-nums' }}>
                        {formatSalary(row.median_salary)}
                      </Text>
                      <Box h={8} bg="gray.1" style={{ flex: 1, borderRadius: 32, overflow: 'hidden' }} aria-hidden="true">
                        <Box
                          data-testid="median-bar"
                          h="100%"
                          bg="brand.7"
                          style={{ width: `${Math.round((row.median_salary / highest.median_salary) * 100)}%`, borderRadius: 32 }}
                        />
                      </Box>
                    </Group>
                  </Table.Td>
                  <Table.Td ta="right" fw={600} style={{ fontVariantNumeric: 'tabular-nums' }}>
                    <CompactSalary amount={row.total_payroll} />
                  </Table.Td>
                  <Table.Td>
                    <Group gap="sm" wrap="nowrap">
                      <Avatar size={28} radius="xl" color="brand" fw={700} fz={11}>
                        {initialsFromName(row.top_paid.full_name)}
                      </Avatar>
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <UnstyledButton c="brand.8" fw={500} onClick={() => setEditingId(row.top_paid.id)}>
                          {row.top_paid.full_name}
                        </UnstyledButton>
                        <Text size="xs" c="dimmed">
                          {labelFor(meta, 'level', row.top_paid.level)}
                        </Text>
                      </Box>
                      <Text fw={600} style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatSalary(row.top_paid.salary)}
                      </Text>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>

      {editingId && <EditById id={editingId} meta={meta} onClose={() => setEditingId(null)} />}
    </Stack>
  )
}

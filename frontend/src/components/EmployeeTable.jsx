import { ActionIcon, Alert, Avatar, Badge, Box, Button, Group, Skeleton, Stack, Table, Text, UnstyledButton } from '@mantine/core'
import { formatDate, formatSalary, initialsFromName, labelFor } from '../format.js'

// Level badge colours, from the design. Darker means more senior.
const LEVEL_COLORS = {
  junior: { background: '#F1F3F5', color: '#495057' },
  mid: { background: '#EEF6F3', color: '#24433D' },
  senior: { background: '#E1F1EC', color: '#0B5148' },
  lead: { background: '#C9E6DC', color: '#0B3F37' },
  principal: { background: '#0E6E62', color: '#FFFFFF' },
}

const COLUMN_COUNT = 7

function SortableHeader({ label, column, sort, direction, onSort, align }) {
  const active = sort === column
  const ariaSort = active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'
  return (
    <Table.Th aria-sort={ariaSort} ta={align}>
      <UnstyledButton fw={700} c={active ? 'brand.8' : 'inherit'} onClick={() => onSort(column)}>
        {label} {active ? (direction === 'asc' ? '↑' : '↓') : ''}
      </UnstyledButton>
    </Table.Th>
  )
}

function SkeletonRows({ count }) {
  return Array.from({ length: count }, (_, index) => (
    <Table.Tr key={index} aria-hidden="true">
      {Array.from({ length: COLUMN_COUNT }, (_, cell) => (
        <Table.Td key={cell}>
          <Skeleton height={10} width={cell === 0 ? 140 : 80} />
        </Table.Td>
      ))}
    </Table.Tr>
  ))
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

export default function EmployeeTable({
  rows,
  meta,
  perPage,
  isLoading,
  isError,
  isRefreshing,
  sort,
  direction,
  hasFilters,
  onSort,
  onRetry,
  onClearFilters,
  onEdit,
}) {
  return (
    <Table.ScrollContainer minWidth={960}>
      <Table verticalSpacing="xs" horizontalSpacing="md" striped aria-busy={isLoading || isRefreshing} opacity={isRefreshing ? 0.6 : 1}>
        <Table.Thead>
          <Table.Tr>
            <SortableHeader label="Employee" column="full_name" sort={sort} direction={direction} onSort={onSort} />
            <Table.Th>Role</Table.Th>
            <Table.Th>Level</Table.Th>
            <Table.Th>Country</Table.Th>
            <SortableHeader label="Hired" column="hire_date" sort={sort} direction={direction} onSort={onSort} />
            <SortableHeader label="Salary" column="salary" sort={sort} direction={direction} onSort={onSort} align="right" />
            <Table.Th w={48}>
              <Box component="span" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
                Actions
              </Box>
            </Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {isLoading && <SkeletonRows count={perPage} />}
          {isError && (
            <MessageRow>
              <Stack align="center" gap="xs" ta="center">
                <Alert color="red" variant="light" role="alert" title="Couldn’t load employees" maw={420}>
                  The server didn’t respond. Your search and filters are kept — try again in a moment.
                </Alert>
                <Button onClick={onRetry}>Try again</Button>
              </Stack>
            </MessageRow>
          )}
          {!isLoading && !isError && rows.length === 0 && (
            <MessageRow>
              <Text ta="center" c="dimmed">
                No employees match these filters.{' '}
                {hasFilters && (
                  <Button variant="subtle" size="compact-sm" onClick={onClearFilters}>
                    Clear filters
                  </Button>
                )}
              </Text>
            </MessageRow>
          )}
          {rows.map((employee) => (
            <Table.Tr key={employee.id}>
              <Table.Td>
                <Group gap="sm" wrap="nowrap">
                  <Avatar size={32} radius="xl" color="brand" fw={700}>
                    {initialsFromName(employee.full_name)}
                  </Avatar>
                  <Box>
                    <Text fw={500}>{employee.full_name}</Text>
                    <Text size="xs" c="dimmed">
                      {employee.employee_code}
                    </Text>
                  </Box>
                </Group>
              </Table.Td>
              <Table.Td>
                <Text>{employee.job_title}</Text>
                <Text size="xs" c="dimmed">
                  {labelFor(meta, 'department', employee.department)}
                </Text>
              </Table.Td>
              <Table.Td>
                <Badge radius="xl" style={LEVEL_COLORS[employee.level]}>
                  {labelFor(meta, 'level', employee.level)}
                </Badge>
              </Table.Td>
              <Table.Td>{labelFor(meta, 'country', employee.country)}</Table.Td>
              <Table.Td c="gray.7">{formatDate(employee.hire_date)}</Table.Td>
              <Table.Td ta="right" fw={600} style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatSalary(employee.salary)}
              </Table.Td>
              <Table.Td>
                <ActionIcon variant="subtle" color="brand" size={34} aria-label={`Edit ${employee.full_name}`} onClick={() => onEdit(employee)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 20h4l10.5-10.5a2.83 2.83 0 1 0-4-4L4 16v4" />
                    <path d="M13.5 6.5l4 4" />
                  </svg>
                </ActionIcon>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  )
}

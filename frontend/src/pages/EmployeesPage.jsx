import { useState } from 'react'
import { Box, Button, Group, Pagination, Paper, Select, Stack, Text, Title } from '@mantine/core'
import ExportButton from '../components/ExportButton.jsx'
import EmployeeFormModal from '../components/EmployeeFormModal.jsx'
import EmployeeFilters from '../components/EmployeeFilters.jsx'
import EmployeeTable from '../components/EmployeeTable.jsx'
import ViewEmployeeModal from '../components/ViewEmployeeModal.jsx'
import StatusTabs from '../components/StatusTabs.jsx'
import { formatCount } from '../format.js'
import { PER_PAGE_OPTIONS, filterParams, useEmployeeListParams, useEmployees, useStatusCount } from '../hooks/useEmployeeList.js'
import { useMeta } from '../hooks/useMeta.js'

// The Active list and the Terminated list share everything but a few columns and actions.
export default function EmployeesPage({ status = 'active' }) {
  const terminated = status === 'terminated'
  const { params, update, clearFilters } = useEmployeeListParams(status)
  const { data: meta } = useMeta()
  const list = useEmployees(params, status)
  const activeCount = useStatusCount('active')
  const terminatedCount = useStatusCount('terminated')
  // null = closed, 'new' = adding, an employee = editing it (Active) or viewing it (Terminated).
  const [selected, setSelected] = useState(null)

  const rows = list.data?.data ?? []
  const listMeta = list.data?.meta
  const hasFilters = Boolean(params.q || params.country || params.department || params.level)
  const rangeStart = rows.length ? (params.page - 1) * params.perPage + 1 : 0

  // Same column again flips the direction. A new column starts with name A-Z or highest first.
  function handleSort(column) {
    if (params.sort === column) update({ sort: column, direction: params.direction === 'asc' ? 'desc' : 'asc' })
    else update({ sort: column, direction: column === 'full_name' ? 'asc' : 'desc' })
  }

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-end">
        <Box>
          <Title order={1} fz={26}>
            Employees
          </Title>
          <Text c="dimmed">{terminated ? 'Terminated records are read-only and not counted in insights' : 'Salaries in USD'}</Text>
        </Box>
        <Group gap="sm">
          <ExportButton params={filterParams(params, status)} count={listMeta?.total_count} />
          {!terminated && <Button onClick={() => setSelected('new')}>Add employee</Button>}
        </Group>
      </Group>

      <StatusTabs activeCount={activeCount.data} terminatedCount={terminatedCount.data} />

      <Paper withBorder radius="lg" shadow="xs" style={{ overflow: 'hidden' }}>
        <EmployeeFilters params={params} meta={meta} showLevel={!terminated} onChange={update} onClear={clearFilters} />
        <EmployeeTable
          rows={rows}
          meta={meta}
          perPage={params.perPage}
          isLoading={list.isPending}
          isError={list.isError}
          isRefreshing={list.isPlaceholderData}
          sort={params.sort}
          direction={params.direction}
          terminated={terminated}
          hasFilters={hasFilters}
          onSort={handleSort}
          onRetry={() => list.refetch()}
          onClearFilters={clearFilters}
          onOpen={setSelected}
        />
        {list.isPending && (
          <Text role="status" c="dimmed" p="md">
            Loading employees…
          </Text>
        )}
        {listMeta && (
          <Group justify="space-between" p="md">
            <Group gap="md">
              <Text c="gray.7">
                {rows.length ? `${formatCount(rangeStart)}–${formatCount(rangeStart + rows.length - 1)}` : '0'} of{' '}
                {formatCount(listMeta.total_count)}
              </Text>
              <Select
                aria-label="Rows per page"
                data={PER_PAGE_OPTIONS.map((size) => ({ value: String(size), label: `${size} / page` }))}
                value={String(params.perPage)}
                onChange={(value) => update({ per_page: Number(value) })}
                allowDeselect={false}
                w={120}
              />
            </Group>
            <Pagination total={listMeta.total_pages} value={params.page} onChange={(page) => update({ page })} />
          </Group>
        )}
      </Paper>
      {selected && !terminated && (
        <EmployeeFormModal employee={selected === 'new' ? null : selected} meta={meta} onClose={() => setSelected(null)} />
      )}
      {selected && terminated && <ViewEmployeeModal employee={selected} meta={meta} onClose={() => setSelected(null)} />}
    </Stack>
  )
}

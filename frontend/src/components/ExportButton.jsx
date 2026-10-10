import { Button } from '@mantine/core'
import { formatCount } from '../format.js'
import { useExportEmployees } from '../hooks/useExportEmployees.js'

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      <path d="M7 11l5 5 5-5" />
      <path d="M12 4v12" />
    </svg>
  )
}

// Exports the rows the list currently matches. `count` is how many that is.
export default function ExportButton({ params, count }) {
  const exportCsv = useExportEmployees()

  return (
    <Button
      variant="default"
      leftSection={<DownloadIcon />}
      loading={exportCsv.isPending}
      disabled={!count}
      onClick={() => exportCsv.mutate(params)}
    >
      Export CSV{count === undefined ? '' : ` · ${formatCount(count)}`}
    </Button>
  )
}

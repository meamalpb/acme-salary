import { useState } from 'react'
import { Button } from '@mantine/core'
import ImportCsvModal from './ImportCsvModal.jsx'

function UploadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      <path d="M7 9l5-5 5 5" />
      <path d="M12 4v12" />
    </svg>
  )
}

export default function ImportButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="default" leftSection={<UploadIcon />} onClick={() => setOpen(true)}>
        Import CSV
      </Button>
      {open && <ImportCsvModal onClose={() => setOpen(false)} />}
    </>
  )
}

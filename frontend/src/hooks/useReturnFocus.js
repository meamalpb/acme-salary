import { useEffect, useState } from 'react'

// Our modals unmount when they close, so Mantine can't hand focus back itself.
// Remembers what had focus when the modal first rendered and puts it back on close.
export function useReturnFocus() {
  const [opener] = useState(() => document.activeElement)
  useEffect(
    () => () => {
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus()
    },
    [opener],
  )
}

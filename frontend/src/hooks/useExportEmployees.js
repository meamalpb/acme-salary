import { useMutation } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import { exportEmployees } from '../api/employees.js'
import { saveBlob } from '../download.js'

export function useExportEmployees() {
  return useMutation({
    mutationFn: async (params) => {
      const { blob, filename } = await exportEmployees(params)
      saveBlob(blob, filename)
    },
    onError: () => notifications.show({ message: 'Couldn’t export. Try again.', color: 'red' }),
  })
}

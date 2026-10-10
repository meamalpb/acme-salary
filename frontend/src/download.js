// Reads the filename from a Content-Disposition header such as: attachment; filename="employees-2026-10-09.csv"
export function filenameFromDisposition(header) {
  const match = header?.match(/filename="([^"]+)"/)
  return match ? match[1] : 'employees.csv'
}

// Hands a blob to the browser as a file download.
export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Some browsers cancel the download if the URL is revoked straight away.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

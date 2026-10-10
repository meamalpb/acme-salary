import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { notifications } from '@mantine/notifications'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
  notifications.clean()
  vi.unstubAllGlobals()
  localStorage.clear()
})

// Mantine reads these browser APIs, which jsdom doesn't provide.
window.matchMedia ??= (query) => ({
  matches: false,
  media: query,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => false,
})
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Element.prototype.scrollIntoView ??= () => {}

import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// jsdom tidak menyediakan API berikut; beberapa komponen React Aria memakainya.
if (typeof window !== 'undefined') {
  window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.scrollIntoView ??= function () {}
}

afterEach(() => {
  cleanup()
  if (typeof localStorage !== 'undefined') localStorage.clear()
})

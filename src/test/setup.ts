import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach } from 'vitest'

// Seluruh suite berjalan paralel; kueri peran pada tabel berisi 25 baris bisa melewati 1 detik bawaan.
configure({ asyncUtilTimeout: 3000 })

// jsdom tidak menyediakan API berikut; beberapa komponen React Aria memakainya.
if (typeof window !== 'undefined') {
  window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.scrollIntoView ??= function () {}
  // matchMedia sederhana: memahami min-width/max-width terhadap window.innerWidth (jsdom: 1024px).
  window.matchMedia ??= (kueri: string): MediaQueryList => {
    const min = /min-width:\s*(\d+)px/.exec(kueri)
    const max = /max-width:\s*(\d+)px/.exec(kueri)
    const lebar = window.innerWidth
    return {
      // Skema warna perangkat tidak ditiru: jsdom dianggap terang.
      matches: !kueri.includes('prefers-color-scheme') && (!min || lebar >= Number(min[1])) && (!max || lebar <= Number(max[1])),
      media: kueri,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    } as MediaQueryList
  }
}

afterEach(() => {
  cleanup()
  if (typeof localStorage !== 'undefined') localStorage.clear()
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 1024 })
  }
})

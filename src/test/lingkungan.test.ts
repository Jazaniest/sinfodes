import { describe, expect, it } from 'vitest'

describe('lingkungan uji', () => {
  it('berjalan dalam mode test dengan DOM tersedia', () => {
    expect(import.meta.env.MODE).toBe('test')
    expect(document.createElement('div')).toBeInstanceOf(HTMLElement)
  })
})

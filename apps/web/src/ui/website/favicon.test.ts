import { afterEach, describe, expect, it } from 'vitest'
import { monogramFavicon, pasangFavicon } from './favicon'

const ikon = () => document.head.querySelector<HTMLLinkElement>('link[rel="icon"]')

afterEach(() => {
  document.head.innerHTML = ''
})

describe('favicon desa (rencana 7E-1 Tugas 3)', () => {
  it('monogram SD untuk "Sungai Dua" berupa data URL SVG', () => {
    const url = monogramFavicon('Sungai Dua')
    expect(url.startsWith('data:image/svg+xml,')).toBe(true)
    expect(decodeURIComponent(url)).toContain('>SD<')
  })
  it('satu kata memakai dua huruf pertama; nama kosong tetap sah', () => {
    expect(decodeURIComponent(monogramFavicon('Lamo'))).toContain('>LA<')
    expect(decodeURIComponent(monogramFavicon(''))).toContain('>SD<')
  })
  it('lambang desa dipasang ke link[rel=icon], dan favicon semula dipulihkan', () => {
    document.head.innerHTML = '<link rel="icon" type="image/svg+xml" href="/favicon.svg">'
    const lambang = `data:image/png;base64,${'A'.repeat(64)}`
    const pulihkan = pasangFavicon(lambang, 'Sungai Sialang')
    expect(ikon()?.getAttribute('href')).toBe(lambang)
    pulihkan()
    expect(ikon()?.getAttribute('href')).toBe('/favicon.svg')
    expect(ikon()?.getAttribute('type')).toBe('image/svg+xml')
  })
  it('tanpa lambang memakai monogram; tanpa link bawaan membuat link lalu menghapusnya', () => {
    const pulihkan = pasangFavicon(null, 'Sungai Dua')
    expect(ikon()?.getAttribute('href')).toContain('data:image/svg+xml')
    pulihkan()
    expect(ikon()).toBeNull()
  })
})

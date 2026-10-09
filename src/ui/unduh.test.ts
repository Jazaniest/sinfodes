import { describe, expect, it, vi } from 'vitest'
import { unduhBerkas } from './unduh'

describe('unduhBerkas', () => {
  it('tautan unduh sementara dengan nama berkas; blob dilepas sesudahnya', async () => {
    const asli = { buat: URL.createObjectURL, lepas: URL.revokeObjectURL }
    const buat = vi.fn(() => 'blob:uji')
    const lepas = vi.fn()
    URL.createObjectURL = buat
    URL.revokeObjectURL = lepas
    const diklik: HTMLAnchorElement[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      diklik.push(this)
    })
    try {
      unduhBerkas('data.csv', 'a;b')
      expect(diklik).toHaveLength(1)
      expect(diklik[0]).toMatchObject({ download: 'data.csv', href: 'blob:uji' })
      expect(document.querySelector('a[download]')).toBeNull()
      expect((buat.mock.calls[0] as unknown[])[0]).toBeInstanceOf(Blob)
      await new Promise((r) => setTimeout(r, 0))
      expect(lepas).toHaveBeenCalledWith('blob:uji')
    } finally {
      URL.createObjectURL = asli.buat
      URL.revokeObjectURL = asli.lepas
    }
  })
})

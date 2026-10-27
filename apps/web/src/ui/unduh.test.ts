import { describe, expect, it, vi } from 'vitest'
import { unduhBerkas } from './unduh'

describe('unduhBerkas', () => {
  it('tautan unduh sementara dengan nama berkas; blob baru dilepas setelah unduhan sempat dimulai', () => {
    const asli = { buat: URL.createObjectURL, lepas: URL.revokeObjectURL }
    const buat = vi.fn(() => 'blob:uji')
    const lepas = vi.fn()
    URL.createObjectURL = buat
    URL.revokeObjectURL = lepas
    const diklik: HTMLAnchorElement[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      diklik.push(this)
    })
    vi.useFakeTimers()
    try {
      unduhBerkas('data.csv', 'a;b')
      expect(diklik).toHaveLength(1)
      expect(diklik[0]).toMatchObject({ download: 'data.csv', href: 'blob:uji' })
      expect(document.querySelector('a[download]')).toBeNull()
      expect((buat.mock.calls[0] as unknown[])[0]).toBeInstanceOf(Blob)
      // Firefox dan Safari bisa membatalkan unduhan bila blob dilepas terlalu cepat.
      vi.advanceTimersByTime(39_000)
      expect(lepas).not.toHaveBeenCalled()
      vi.advanceTimersByTime(1_000)
      expect(lepas).toHaveBeenCalledWith('blob:uji')
    } finally {
      vi.useRealTimers()
      URL.createObjectURL = asli.buat
      URL.revokeObjectURL = asli.lepas
    }
  })
})

import { QueryClient } from '@tanstack/react-query'
import { isRedirect } from '@tanstack/react-router'
import { describe, expect, it } from 'vitest'
import { ambilTokenSesi } from '@/api/client'
import { simpanSesi } from '@/app/sesi'
import { AKUN_KABUPATEN_UJI, AKUN_KONSOL_UJI, masukKabupatenSebagai, masukKonsolSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { muatSesiKabupaten } from './penjaga'

pakaiApiTiruan()

const konteks = () => ({
  context: { queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
  location: { href: '/kabupaten/admin/pemantauan' },
})

async function pengalihan(janji: Promise<unknown>) {
  try {
    await janji
  } catch (e) {
    if (isRedirect(e)) return e.options
    throw e
  }
  throw new Error('Seharusnya dialihkan')
}

describe('penjaga dasbor kabupaten', () => {
  it('tanpa sesi kabupaten → halaman masuk kabupaten, alamat asal dibawa', async () => {
    masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
    expect(await pengalihan(muatSesiKabupaten(konteks()))).toMatchObject({
      to: '/kabupaten/admin/masuk', search: { ke: '/kabupaten/admin/pemantauan' },
    })
  })
  it('sesi kabupaten sah → sesi di konteks rute', async () => {
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.admin)
    expect((await muatSesiKabupaten(konteks())).sesiKabupaten.kabupaten.label).toBe('kab-pelalawan')
  })
  it('sesi kabupaten tidak dikenal → token kabupaten saja yang dihapus', async () => {
    simpanSesi('konsol.kns_dina', 'konsol')
    simpanSesi('kab.kab_tidak_ada', 'kabupaten')
    expect(await pengalihan(muatSesiKabupaten(konteks()))).toMatchObject({ to: '/kabupaten/admin/masuk' })
    expect(ambilTokenSesi('kabupaten')).toBeNull()
    expect(ambilTokenSesi('konsol')).toBe('konsol.kns_dina')
  })
})

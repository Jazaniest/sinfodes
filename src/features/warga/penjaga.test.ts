import { QueryClient } from '@tanstack/react-query'
import { isRedirect } from '@tanstack/react-router'
import { describe, expect, it } from 'vitest'
import { ambilTokenSesi } from '@/api/client'
import { simpanSesi } from '@/app/sesi'
import { AKUN_UJI, AKUN_WARGA_UJI, masukSebagai, masukSebagaiWarga, pakaiApiTiruan } from '@/test/api-tiruan'
import { muatSesiWarga } from './penjaga'

pakaiApiTiruan()

const konteks = () => ({
  context: { queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
  location: { href: '/warga/riwayat' },
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

describe('penjaga layanan warga (SPEC §3.5)', () => {
  it('sesi admin saja tidak cukup: dialihkan ke /warga/masuk, alamat asal dibawa (fokus review 1)', async () => {
    masukSebagai(AKUN_UJI.operator)
    expect(await pengalihan(muatSesiWarga(konteks()))).toMatchObject({ to: '/warga/masuk', search: { ke: '/warga/riwayat' } })
  })
  it('sesi warga sah → sesi warga di konteks rute', async () => {
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    expect((await muatSesiWarga(konteks())).sesiWarga.penduduk.nama).toBe('Siti Rahmah')
  })
  it('sesi warga habis → token warga dihapus dan dialihkan; sesi admin tetap (fokus review 1)', async () => {
    simpanSesi('demo.pgn_rosmiati')
    simpanSesi('warga.pdk_tidak_ada', 'warga')
    expect(await pengalihan(muatSesiWarga(konteks()))).toMatchObject({ to: '/warga/masuk' })
    expect(ambilTokenSesi('warga')).toBeNull()
    expect(localStorage.getItem('sinfodes.sesi.warga')).toBeNull()
    expect(ambilTokenSesi()).toBe('demo.pgn_rosmiati')
  })
})

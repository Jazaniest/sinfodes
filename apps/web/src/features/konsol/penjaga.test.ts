import { QueryClient } from '@tanstack/react-query'
import { isRedirect } from '@tanstack/react-router'
import { describe, expect, it } from 'vitest'
import { ambilTokenSesi } from '@/api/client'
import { simpanSesi } from '@/app/sesi'
import { AKUN_KONSOL_UJI, AKUN_UJI, masukKonsolSebagai, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { muatSesiKonsol } from './penjaga'

pakaiApiTiruan()

const konteks = () => ({
  context: { queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
  location: { href: '/konsol/desa' },
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

describe('penjaga Konsol (SPEC §3.5)', () => {
  it('sesi panel admin saja tidak cukup: dialihkan ke /konsol/masuk, alamat asal dibawa (fokus review 2)', async () => {
    masukSebagai(AKUN_UJI.operator)
    expect(await pengalihan(muatSesiKonsol(konteks()))).toMatchObject({ to: '/konsol/masuk', search: { ke: '/konsol/desa' } })
  })
  it('sesi konsol sah → sesi konsol di konteks rute', async () => {
    masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
    expect((await muatSesiKonsol(konteks())).sesiKonsol.pengguna.nama).toBe('Dina')
  })
  it('sesi konsol tidak dikenal → token konsol dihapus dan dialihkan; sesi admin tetap (fokus review 2)', async () => {
    simpanSesi('demo.pgn_rosmiati')
    simpanSesi('konsol.kns_tidak_ada', 'konsol')
    expect(await pengalihan(muatSesiKonsol(konteks()))).toMatchObject({ to: '/konsol/masuk' })
    expect(ambilTokenSesi('konsol')).toBeNull()
    expect(localStorage.getItem('sinfodes.sesi.konsol')).toBeNull()
    expect(ambilTokenSesi()).toBe('demo.pgn_rosmiati')
  })
})

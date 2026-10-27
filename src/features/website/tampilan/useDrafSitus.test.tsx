import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ambilIdentitasPublik } from '@/api/publik'
import { ambilSitus, daftarRiwayat, simpanDraf, terbitkan } from '@/api/website'
import { susunanBawaan } from '@/domain/website/susunan'
import { TEMA_WARTA_BAWAAN } from '@/domain/website/tema'
import { ID_SUNGAI_SIALANG } from '@/mocks/data/desa-demo'
import { ambilDb } from '@/mocks/db'
import { serverUji } from '@/mocks/node'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { contohSesi } from '@/test/sesi'
import { SesiAdminKonteks } from '../../admin/sesi-konteks'
import { useKeadaanDrafSitus, type IsiDraf } from './useDrafSitus'

pakaiApiTiruan({ dbSegarTiapUji: true })

const TEMA = TEMA_WARTA_BAWAAN('#1F4E79')
const permintaan: string[] = []

// Skema respons dimuat malas lewat import(); uji ini memakai timer palsu, jadi modulnya dimuat dulu supaya impor pertama
// (transformasi berkas yang memakan waktu nyata) tidak terjadi di tengah menunggu timer.
beforeAll(async () => {
  await Promise.all([import('@/domain/website/situs'), import('@/domain/publik/schema')])
})

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
  vi.setSystemTime(SEKARANG_UJI)
  masukSebagai(AKUN_UJI.operator)
  permintaan.length = 0
  serverUji.events.on('request:start', (peristiwa) => {
    permintaan.push(`${peristiwa.request.method} ${new URL(peristiwa.request.url).pathname}`)
  })
})

const hitungPutDraf = () => permintaan.filter((p) => p.endsWith('/website/situs/draf')).length

function mulai() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return renderHook(() => useKeadaanDrafSitus(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <SesiAdminKonteks value={contohSesi('operator')}>{children}</SesiAdminKonteks>
      </QueryClientProvider>
    ),
  })
}

const selesai = () =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(0)
  })
const detik = (n: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(n * 1000)
  })

const ubahWarna = (warna: string) => (i: IsiDraf): IsiDraf => ({
  ...i,
  tema: { ...i.tema, warnaUtama: warna, warnaAksen: warna },
})

describe('keadaan draf situs (rencana 7F-2 Tugas 2)', () => {
  it('satu perubahan: satu PUT draf 1 detik kemudian, status tersimpan dengan waktunya', async () => {
    const { result } = mulai()
    await selesai()
    expect(result.current.isi).not.toBeNull()
    expect(result.current.adaDraf).toBe(false)
    act(() => result.current.ubah(ubahWarna('#2F5D3A')))
    expect(result.current.status).toBe('menyimpan')
    await detik(1)
    expect(hitungPutDraf()).toBe(1)
    expect(result.current.status).toBe('tersimpan')
    expect(result.current.adaDraf).toBe(true)
    expect(result.current.tersimpanPada).toMatch(/^2026-09-24T09:00/)
    const dok = ambilDb().situs.find((s) => s.desaId === ID_SUNGAI_SIALANG)
    expect(dok?.draf?.tema.warnaUtama).toBe('#2F5D3A')
  })
  it('dua perubahan berurutan dalam 1 detik cukup satu PUT', async () => {
    const { result } = mulai()
    await selesai()
    act(() => result.current.ubah(ubahWarna('#2F5D3A')))
    await detik(0.5)
    act(() => result.current.ubah((i) => ({ ...i, tema: { ...i.tema, sudut: 'bulat' } })))
    await detik(1)
    expect(hitungPutDraf()).toBe(1)
    expect(result.current.isi?.tema.sudut).toBe('bulat')
  })
  it('meninggalkan halaman sebelum 1 detik tetap mengirim perubahan terakhir', async () => {
    const { result, unmount } = mulai()
    await selesai()
    act(() => result.current.ubah(ubahWarna('#2F5D3A')))
    unmount()
    await selesai()
    expect(hitungPutDraf()).toBe(1)
    expect(ambilDb().situs.find((s) => s.desaId === ID_SUNGAI_SIALANG)?.draf?.tema.warnaUtama).toBe('#2F5D3A')
  })
  it('isian yang tidak lolos skema tidak dikirim dan status menjadi tidak-sah', async () => {
    const { result } = mulai()
    await selesai()
    act(() => result.current.ubah((i) => ({ ...i, tema: { ...i.tema, warnaUtama: '#12345' } })))
    expect(result.current.status).toBe('tidak-sah')
    await detik(2)
    expect(hitungPutDraf()).toBe(0)
  })
  it('kontras gagal juga menahan simpanan draf', async () => {
    const { result } = mulai()
    await selesai()
    act(() => result.current.ubah(ubahWarna('#FFD400')))
    expect(result.current.status).toBe('tidak-sah')
    await detik(2)
    expect(hitungPutDraf()).toBe(0)
  })
  it('draf diubah di tempat lain: perubahan berikutnya mendapat 409, status bentrok, simpan otomatis berhenti', async () => {
    const { result } = mulai()
    await selesai()
    act(() => result.current.ubah(ubahWarna('#2F5D3A')))
    await detik(1)
    expect(result.current.status).toBe('tersimpan')
    // Tab lain menyimpan draf yang sama lebih dulu sehingga ID draf di server berubah.
    const dok = ambilDb().situs.find((s) => s.desaId === ID_SUNGAI_SIALANG)
    await act(async () => {
      await simpanDraf(dok!.draf!.id, { tema: { ...TEMA, warnaUtama: '#9A3B2A', warnaAksen: '#9A3B2A' }, susunan: susunanBawaan() })
    })
    act(() => result.current.ubah((i) => ({ ...i, tema: { ...i.tema, sudut: 'tajam' } })))
    await detik(1)
    expect(result.current.status).toBe('bentrok')
    const setelahBentrok = hitungPutDraf()
    act(() => result.current.ubah((i) => ({ ...i, tema: { ...i.tema, kepadatan: 'rapat' } })))
    await detik(2)
    expect(hitungPutDraf()).toBe(setelahBentrok)
  })
  it('muat ulang mengambil draf terbaru dan menyalakan simpan otomatis lagi', async () => {
    const { result } = mulai()
    await selesai()
    act(() => result.current.ubah(ubahWarna('#2F5D3A')))
    await detik(1)
    const dok = ambilDb().situs.find((s) => s.desaId === ID_SUNGAI_SIALANG)
    await act(async () => {
      await simpanDraf(dok!.draf!.id, { tema: { ...TEMA, warnaUtama: '#9A3B2A', warnaAksen: '#9A3B2A' }, susunan: susunanBawaan() })
    })
    act(() => result.current.ubah((i) => ({ ...i, tema: { ...i.tema, sudut: 'tajam' } })))
    await detik(1)
    expect(result.current.status).toBe('bentrok')
    act(() => result.current.muatUlang())
    await selesai()
    expect(result.current.status).toBe('tersimpan')
    expect(result.current.isi?.tema.warnaUtama).toBe('#9A3B2A')
    act(() => result.current.ubah((i) => ({ ...i, tema: { ...i.tema, kepadatan: 'rapat' } })))
    await detik(1)
    expect(result.current.status).toBe('tersimpan')
  })
  it('terbitkan dengan catatan: publik berubah dan tidak ada lagi draf', async () => {
    const { result } = mulai()
    await selesai()
    act(() => result.current.ubah(ubahWarna('#2F5D3A')))
    await detik(1)
    await act(async () => {
      await result.current.terbitkan('Ganti warna menjadi hijau.')
    })
    expect(result.current.adaDraf).toBe(false)
    expect(result.current.status).toBe('tersimpan')
    expect((await ambilIdentitasPublik('sungaisialang')).tema.warnaUtama).toBe('#2F5D3A')
    const situs = await ambilSitus()
    expect(situs.draf).toBeNull()
    expect(situs.terbit.catatan).toBe('Ganti warna menjadi hijau.')
  })
  it('buang mengembalikan isi ke versi terbit dan menghapus draf', async () => {
    const { result } = mulai()
    await selesai()
    act(() => result.current.ubah(ubahWarna('#2F5D3A')))
    await detik(1)
    await act(async () => {
      await result.current.buang()
    })
    expect(result.current.adaDraf).toBe(false)
    expect(result.current.isi?.tema.warnaUtama).toBe('#1F4E79')
    expect((await ambilSitus()).draf).toBeNull()
  })
  it('pulihkan versi lama mengisi draf, website publik belum berubah', async () => {
    await simpanDraf(null, { tema: { ...TEMA, warnaUtama: '#2F5D3A', warnaAksen: '#2F5D3A' }, susunan: susunanBawaan() })
    await terbitkan('Hijau.')
    await simpanDraf(null, { tema: { ...TEMA, warnaUtama: '#14607A', warnaAksen: '#14607A' }, susunan: susunanBawaan() })
    await terbitkan('Biru.')
    const { result } = mulai()
    await selesai()
    const riwayat = await daftarRiwayat()
    const versiHijau = riwayat.data.find((v) => v.catatan === 'Hijau.')
    expect(versiHijau).toBeDefined()
    await act(async () => {
      await result.current.pulihkan(versiHijau!.id)
    })
    expect(result.current.adaDraf).toBe(true)
    expect(result.current.isi?.tema.warnaUtama).toBe('#2F5D3A')
    expect((await ambilIdentitasPublik('sungaisialang')).tema.warnaUtama).toBe('#14607A')
  })
})

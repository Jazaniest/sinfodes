import { QueryClient } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ambilTokenSesi } from '@/api/client'
import { kunciWarga } from '@/api/warga'
import { hapusSesi, simpanSesi } from '@/app/sesi'
import { contohSesiWarga } from '@/test/sesi'
import { keluarWargaSampaiServer, pasangSesiWarga } from './masuk-warga'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  hapusSesi('warga')
})

const pasang = () => {
  const qc = new QueryClient()
  pasangSesiWarga('kuki', contohSesiWarga(), qc)
  return qc
}

describe('keluar warga sampai ke server (SPEC-V0.3 §8.1)', () => {
  it('mode nyata: memanggil POST /warga/sesi/keluar, lalu menghapus penanda dan cache lokal', async () => {
    vi.stubEnv('VITE_DEMO', 'false')
    const panggilan: string[] = []
    vi.stubGlobal('fetch', vi.fn((url: URL, init?: RequestInit) => {
      panggilan.push(`${init?.method} ${new URL(url).pathname}`)
      return Promise.resolve(new Response(null, { status: 204 }))
    }))
    const qc = pasang()
    await keluarWargaSampaiServer(qc)
    expect(panggilan).toEqual(['POST /api/v1/warga/sesi/keluar'])
    expect(ambilTokenSesi('warga')).toBeNull()
    expect(localStorage.getItem('sinfodes.sesi.warga')).toBeNull()
    expect(qc.getQueryData(kunciWarga.sesi)).toBeUndefined()
  })

  it('jaringan gagal: sesi lokal tetap dihapus dan tidak ada galat yang bocor ke pemanggil', async () => {
    vi.stubEnv('VITE_DEMO', 'false')
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('jaringan putus'))))
    const qc = pasang()
    await expect(keluarWargaSampaiServer(qc)).resolves.toBeUndefined()
    expect(ambilTokenSesi('warga')).toBeNull()
    expect(qc.getQueryData(kunciWarga.sesi)).toBeUndefined()
  })

  it('mode demo: tidak memanggil server (API tiruan tidak punya rutenya), hanya membersihkan lokal', async () => {
    vi.stubEnv('VITE_DEMO', 'true')
    const fetchTiruan = vi.fn()
    vi.stubGlobal('fetch', fetchTiruan)
    simpanSesi('warga.pdk_siti_rahmah', 'warga')
    await keluarWargaSampaiServer(new QueryClient())
    expect(fetchTiruan).not.toHaveBeenCalled()
    expect(ambilTokenSesi('warga')).toBeNull()
  })
})

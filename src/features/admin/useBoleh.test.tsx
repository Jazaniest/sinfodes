import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import type { SesiAdmin } from '@/domain/pengguna/schema'
import { contohSesi } from '@/test/sesi'
import { SesiAdminKonteks } from './sesi-konteks'
import { useBoleh } from './useBoleh'

const berkas = import.meta.glob('/src/features/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

function pakai(peran: Parameters<typeof contohSesi>[0], status: SesiAdmin['desa']['status']) {
  const sesi = contohSesi(peran)
  const pembungkus = ({ children }: { children: ReactNode }) => (
    <SesiAdminKonteks value={{ ...sesi, desa: { ...sesi.desa, status } }}>{children}</SesiAdminKonteks>
  )
  return renderHook(() => useBoleh(), { wrapper: pembungkus }).result.current
}

describe('useBoleh (rencana 7D-2 Tugas 4)', () => {
  it('desa Aktif: sama dengan hak akses peran', () => {
    const boleh = pakai('sekdes', 'Aktif')
    expect(boleh('penduduk.ubah')).toBe(true)
    expect(boleh('langganan.bayar')).toBe(true)
  })
  it('desa Ditangguhkan: kemampuan tulis hilang, lihat dan Langganan tetap', () => {
    const boleh = pakai('sekdes', 'Ditangguhkan')
    expect(boleh('penduduk.ubah')).toBe(false)
    expect(boleh('surat.tandatangani')).toBe(false)
    expect(boleh('penduduk.lihat')).toBe(true)
    expect(boleh('langganan.bayar')).toBe(true)
    expect(boleh('akses-sinfodes.kelola')).toBe(true)
  })
  it('penjaga: layar tidak memeriksa hak akses dengan boleh(peran, …) langsung, karena itu melewati penangguhan', () => {
    const pelanggar = Object.entries(berkas)
      .filter(([nama]) => !/\.test\.tsx?$/.test(nama))
      .filter(([, isi]) => /(?<![\w.])boleh\((pengguna\.peran|sesi\.pengguna\.peran|peran)\b/.test(isi))
      .map(([nama]) => nama)
    expect(pelanggar).toEqual([])
  })
})

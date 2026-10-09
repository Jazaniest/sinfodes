import { describe, expect, it } from 'vitest'
import type { Peran } from '@/domain/pengguna/schema'
import { MENU_ADMIN, menuAktif, menuUntuk, type ItemMenu } from './navigasi'

const label = (peran: Peran) => menuUntuk(peran).flatMap((k) => k.item.map((i) => i.label))
const item = (nama: string): ItemMenu => {
  const i = MENU_ADMIN.flatMap((k) => k.item).find((x) => x.label === nama)
  if (!i) throw new Error(`Menu ${nama} tidak ada`)
  return i
}

describe('menu admin (SPEC §5.1, §5.2)', () => {
  it('operator: Beranda, Layanan Surat, dan Kependudukan', () =>
    expect(label('operator')).toEqual(['Beranda', 'Layanan Surat', 'Kependudukan']))
  it('kelompok mengikuti SPEC: Pelayanan sebelum Data desa', () =>
    expect(menuUntuk('kades').map((k) => k.judul)).toEqual([null, 'Pelayanan', 'Data desa']))
  it('Kepala Dusun melihat Layanan Surat (dusunnya)', () => expect(label('kadus')).toContain('Layanan Surat'))
  it('Kaur Keuangan: Beranda saja; kelompok kosong disembunyikan', () => expect(menuUntuk('kaur-keuangan')).toEqual([MENU_ADMIN[0]]))
  it('angka menu Layanan Surat memakai kunci "surat"; menu lain tanpa angka', () => {
    expect(item('Layanan Surat').hitungan).toBe('surat')
    expect(item('Kependudukan').hitungan).toBeNull()
  })
  it('menu aktif mengikuti awalan alamat', () => {
    expect(menuAktif(item('Beranda'), '/admin')).toBe(true)
    expect(menuAktif(item('Beranda'), '/admin/')).toBe(true)
    expect(menuAktif(item('Beranda'), '/admin/kependudukan/penduduk')).toBe(false)
    expect(menuAktif(item('Kependudukan'), '/admin/kependudukan/keluarga/kk_syahrial')).toBe(true)
    expect(menuAktif(item('Kependudukan'), '/admin/kependudukan-lain')).toBe(false)
    expect(menuAktif(item('Layanan Surat'), '/admin/surat/srt_abc123')).toBe(true)
    expect(menuAktif(item('Layanan Surat'), '/admin/suratku')).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'
import { MENU_ADMIN, menuAktif, menuUntuk } from './navigasi'

describe('menu admin (SPEC §5.1, §5.2)', () => {
  it('operator: Beranda dan Kependudukan', () =>
    expect(menuUntuk('operator').flatMap((k) => k.item.map((i) => i.label))).toEqual(['Beranda', 'Kependudukan']))
  it('Kaur Keuangan: Beranda saja; kelompok kosong disembunyikan', () =>
    expect(menuUntuk('kaur-keuangan')).toEqual([MENU_ADMIN[0]]))
  it('menu aktif mengikuti awalan alamat', () => {
    const [beranda] = MENU_ADMIN[0].item
    const [kependudukan] = MENU_ADMIN[1].item
    expect(menuAktif(beranda, '/admin')).toBe(true)
    expect(menuAktif(beranda, '/admin/')).toBe(true)
    expect(menuAktif(beranda, '/admin/kependudukan/penduduk')).toBe(false)
    expect(menuAktif(kependudukan, '/admin/kependudukan/keluarga/kk_syahrial')).toBe(true)
    expect(menuAktif(kependudukan, '/admin/kependudukan-lain')).toBe(false)
  })
})

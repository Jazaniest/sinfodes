import { describe, expect, it } from 'vitest'
import { pengaturanSuratSchema } from './pengaturan'
import { pengaturanBawaan, pindahPengaturanLama } from './pengaturan-bawaan'
import { TATA_LETAK_SIAP } from './tata-letak-siap'

describe('pengaturan surat desa (SPEC-V0.2 12.2)', () => {
  it('bawaan memakai tata letak standar; salinannya tidak berbagi isi dengan bawaan bersama', () => {
    const a = pengaturanBawaan('desa_a')
    expect(a.tataLetak).toEqual(TATA_LETAK_SIAP.standar)
    a.tataLetak.kertas.margin.kiri = 35
    a.tataLetak.kop.baris.push('baris lain')
    expect(TATA_LETAK_SIAP.standar.kertas.margin.kiri).toBe(30)
    expect(TATA_LETAK_SIAP.standar.kop.baris).toHaveLength(4)
    expect(pengaturanSuratSchema.parse(pengaturanBawaan('desa_a'))).toEqual(pengaturanBawaan('desa_a'))
  })
  it('kertas dan huruf lama pindah ke tata letak: F4 + Arimo menjadi standar yang diubah', () => {
    const t = pindahPengaturanLama({ kertas: 'F4', huruf: 'Arimo' })
    expect(t).toMatchObject({ siap: null, kertas: { ukuran: 'F4' }, huruf: { keluarga: 'Arimo', ukuranPt: 12, spasi: 1.15 } })
    expect(t.kertas.margin).toEqual(TATA_LETAK_SIAP.standar.kertas.margin)
    expect(t.kop).toEqual(TATA_LETAK_SIAP.standar.kop)
  })
  it('A4 + Tinos lama sama persis dengan standar, jadi tetap bertanda siap', () => {
    expect(pindahPengaturanLama({ kertas: 'A4', huruf: 'Tinos' })).toEqual(TATA_LETAK_SIAP.standar)
  })
  it('pengaturan tanpa tata letak (bentuk lama) ditolak oleh skema', () => {
    const tanpa: Partial<ReturnType<typeof pengaturanBawaan>> = pengaturanBawaan('desa_a')
    delete tanpa.tataLetak
    expect(pengaturanSuratSchema.safeParse({ ...tanpa, kertas: 'A4', huruf: 'Tinos' }).success).toBe(false)
  })
})

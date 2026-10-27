import { describe, expect, it } from 'vitest'
import { contohPenduduk } from '@/test/contoh'
import { contohJenis } from '@/test/contoh-surat'
import { periksaPemohon } from './pemohon'

const siti = contohPenduduk()
const PINDAH = { jenis: 'pindah' as const, pendudukIds: ['pdk_contoh'] }

describe('periksaPemohon (SPEC §7.4 layar 2, fokus review 1)', () => {
  it('pemohon hidup dengan data lengkap: tanpa blokir dan peringatan', () =>
    expect(periksaPemohon(contohJenis('SKD'), siti, null, null)).toEqual({ blokir: null, peringatan: [] }))
  it('pemohon Meninggal atau Pindah memblokir', () => {
    expect(periksaPemohon(contohJenis('SKD'), contohPenduduk({ statusDasar: 'Meninggal' }), null, null).blokir).toEqual({
      kolom: 'pemohon',
      pesan: 'Siti Rahmah berstatus Meninggal. Surat tidak bisa dibuat atas nama penduduk yang sudah meninggal atau pindah.',
    })
    expect(periksaPemohon(contohJenis('SKD'), contohPenduduk({ statusDasar: 'Pindah' }), null, null).blokir?.kolom).toBe('pemohon')
  })
  it('pengantar pindah untuk orang yang kepindahannya tercatat: boleh', () => {
    const pindah = contohPenduduk({ statusDasar: 'Pindah' })
    expect(periksaPemohon(contohJenis('SPP'), pindah, null, PINDAH).blokir).toBeNull()
    expect(periksaPemohon(contohJenis('SPP'), pindah, null, null).blokir?.kolom).toBe('pemohon')
    expect(periksaPemohon(contohJenis('SPP'), pindah, null, { jenis: 'pindah', pendudukIds: ['pdk_lain'] }).blokir?.kolom).toBe('pemohon')
  })
  it('surat kematian: yang diterangkan harus sudah dicatat meninggal', () => {
    expect(periksaPemohon(contohJenis('SKM'), siti, null, null).blokir).toEqual({ kolom: 'subjek', pesan: 'Pilih penduduk yang meninggal.' })
    expect(periksaPemohon(contohJenis('SKM'), siti, contohPenduduk({ nama: 'Ahmad' }), null).blokir).toEqual({
      kolom: 'subjek',
      pesan: 'Ahmad belum dicatat meninggal. Catat kematiannya lebih dulu di Mutasi.',
    })
    expect(periksaPemohon(contohJenis('SKM'), siti, contohPenduduk({ nama: 'Ahmad', statusDasar: 'Meninggal' }), null).blokir).toBeNull()
  })
  it('surat kelahiran: bayi wajib dipilih; bayi tanpa NIK tidak diperingatkan', () => {
    expect(periksaPemohon(contohJenis('SKL'), siti, null, null).blokir).toEqual({
      kolom: 'subjek',
      pesan: 'Pilih bayi yang diterangkan surat ini.',
    })
    const bayi = contohPenduduk({ nama: 'Nayla', nik: null, pekerjaan: null, statusPerkawinan: null })
    expect(periksaPemohon(contohJenis('SKL'), siti, bayi, null)).toEqual({ blokir: null, peringatan: [] })
  })
  it('data belum lengkap hanya diperingatkan (boleh lanjut)', () => {
    expect(periksaPemohon(contohJenis('SKD'), contohPenduduk({ nik: null, pekerjaan: null, statusPerkawinan: null }), null, null)).toEqual({
      blokir: null,
      peringatan: ['Siti Rahmah belum punya NIK', 'Pekerjaan belum diisi', 'Status perkawinan belum diisi'],
    })
    expect(periksaPemohon(contohJenis('SKBM'), siti, null, null).peringatan).toEqual(['Status perkawinan tercatat Kawin Tercatat'])
  })
})

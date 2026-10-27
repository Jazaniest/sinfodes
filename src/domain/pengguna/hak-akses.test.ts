import { describe, expect, it } from 'vitest'
import { boleh, bolehDi, cakupanDusun, HAK_AKSES, KEMAMPUAN_TULIS, kemampuanEfektif } from './hak-akses'
import type { Pengguna } from './schema'

describe('hak akses (SPEC §5.1)', () => {
  it.each([
    ['operator', 'penduduk.ubah', true],
    ['operator', 'surat.paraf', false],
    ['operator', 'pengguna.kelola', false],
    ['sekdes', 'surat.paraf', true],
    ['sekdes', 'pengguna.kelola', true],
    ['kades', 'surat.tandatangani', true],
    ['kades', 'penduduk.lihat', true],
    ['kades', 'penduduk.ubah', false],
    ['kaur-keuangan', 'keuangan.sinkron', true],
    ['kaur-keuangan', 'penduduk.lihat', false],
    ['kadus', 'pengaduan.tanggapi', true],
    ['kadus', 'penduduk.ubah', false],
    ['kadus', 'keuangan.lihat', false],
    // Tandai laporan ke kabupaten sudah dikirim (SPEC-V0.2 §8.3 butir 4, keputusan rencana 7B-2).
    ['sekdes', 'keuangan.lapor', true],
    ['kades', 'keuangan.lapor', true],
    ['kaur-keuangan', 'keuangan.lapor', true],
    ['operator', 'keuangan.lapor', false],
    ['kadus', 'keuangan.lapor', false],
    ['bantuan', 'keuangan.lapor', false],
    // Siaran kabupaten (SPEC-V0.2 §8.4): dilihat Operator, Sekdes, Kades; tindak lanjut oleh Kades atau Sekdes (keputusan rencana 7B-3).
    ['operator', 'siaran.lihat', true],
    ['sekdes', 'siaran.lihat', true],
    ['kades', 'siaran.lihat', true],
    ['kaur-keuangan', 'siaran.lihat', false],
    ['kadus', 'siaran.lihat', false],
    ['bantuan', 'siaran.lihat', false],
    ['sekdes', 'siaran.tindak', true],
    ['kades', 'siaran.tindak', true],
    ['operator', 'siaran.tindak', false],
    ['kaur-keuangan', 'siaran.tindak', false],
    ['kadus', 'siaran.tindak', false],
    ['bantuan', 'siaran.tindak', false],
    // Langganan (SPEC-V0.2 §10, keputusan rencana 7D-1 butir 10): hanya pimpinan dan bendahara desa.
    ...(['langganan.lihat', 'langganan.bayar'] as const).flatMap((k) => [
      ['kades', k, true],
      ['sekdes', k, true],
      ['kaur-keuangan', k, true],
      ['operator', k, false],
      ['kadus', k, false],
      ['bantuan', k, false],
    ] as const),
  ] as const)('%s → %s = %s', (peran, kemampuan, harap) => expect(boleh(peran, kemampuan)).toBe(harap))

  it('kepala dusun dibatasi ke dusunnya, peran lain tidak', () => {
    const dasar: Pengguna = {
      id: 'pgn_x', desaId: 'desa_x', nama: 'Sukardi', jabatan: 'Kepala Dusun II', peran: 'kadus',
      dusunId: 'dsn_ss_2', email: 'x@y.id', aktif: true, nip: null,
    }
    expect(cakupanDusun(dasar)).toBe('dsn_ss_2')
    expect(cakupanDusun({ ...dasar, peran: 'operator', dusunId: null })).toBeNull()
  })
})

describe('modul desa (SPEC-V0.2 12.3, rencana 7H-1 Tugas 1)', () => {
  it('modul.kelola hanya untuk Sekretaris Desa', () => {
    for (const [peran, harap] of [
      ['sekdes', true], ['operator', false], ['kades', false], ['kaur-keuangan', false], ['kadus', false], ['bantuan', false],
    ] as const) {
      expect(boleh(peran, 'modul.kelola'), peran).toBe(harap)
    }
  })
  it('Kesehatan mati: kesehatan.lihat dicabut dari semua peran, kemampuan lain tetap', () => {
    for (const peran of Object.keys(HAK_AKSES) as (keyof typeof HAK_AKSES)[]) {
      const efektif = kemampuanEfektif(peran, 'Aktif', { kesehatan: false })
      expect(efektif.has('kesehatan.lihat'), peran).toBe(false)
      expect([...efektif].sort(), peran).toEqual([...HAK_AKSES[peran]].filter((k) => k !== 'kesehatan.lihat').sort())
    }
  })
  it('Kesehatan nyala: sama dengan HAK_AKSES; bolehDi mengikuti modul', () => {
    expect([...kemampuanEfektif('kadus', 'Aktif', { kesehatan: true })].sort()).toEqual([...HAK_AKSES.kadus].sort())
    expect(bolehDi('kadus', 'Aktif', 'kesehatan.lihat', { kesehatan: true })).toBe(true)
    expect(bolehDi('kadus', 'Aktif', 'kesehatan.lihat', { kesehatan: false })).toBe(false)
    expect(bolehDi('kadus', 'Aktif', 'pengaduan.lihat', { kesehatan: false })).toBe(true)
  })
  it('modul mati dan desa Ditangguhkan bekerja bersama', () => {
    const efektif = kemampuanEfektif('sekdes', 'Ditangguhkan', { kesehatan: false })
    expect(efektif.has('kesehatan.lihat')).toBe(false)
    expect(efektif.has('penduduk.ubah')).toBe(false)
    expect(efektif.has('penduduk.lihat')).toBe(true)
  })
  it('modul.kelola dicabut saat Ditangguhkan (mengubah data desa)', () => {
    expect(bolehDi('sekdes', 'Aktif', 'modul.kelola')).toBe(true)
    expect(bolehDi('sekdes', 'Ditangguhkan', 'modul.kelola')).toBe(false)
  })
})

describe('desa Ditangguhkan (SPEC-V0.2 §10.5, rencana 7D-2 Tugas 4)', () => {
  it('Sekretaris Desa: tidak ada satu pun kemampuan tulis, tetapi Langganan, Akses Sinfodes, dan semua kemampuan lihat tetap', () => {
    const efektif = kemampuanEfektif('sekdes', 'Ditangguhkan')
    for (const k of KEMAMPUAN_TULIS) expect(efektif.has(k), k).toBe(false)
    for (const k of ['langganan.bayar', 'langganan.lihat', 'akses-sinfodes.kelola', 'penduduk.lihat', 'surat.lihat', 'keuangan.lihat', 'siaran.lihat'] as const) {
      expect(efektif.has(k), k).toBe(true)
    }
  })
  it('semua kemampuan tulis memang dimiliki sekurangnya satu peran (daftar tidak basi)', () => {
    for (const k of KEMAMPUAN_TULIS) expect(Object.values(HAK_AKSES).some((s) => s.has(k)), k).toBe(true)
  })
  it('status lain tidak mengubah apa pun', () => {
    for (const status of ['Aktif', 'Uji coba', 'Persiapan'] as const) {
      expect([...kemampuanEfektif('sekdes', status)].sort()).toEqual([...HAK_AKSES.sekdes].sort())
    }
  })
  it('bolehDi: tulis ditolak saat Ditangguhkan, lihat dan bayar tetap', () => {
    expect(bolehDi('operator', 'Aktif', 'penduduk.ubah')).toBe(true)
    expect(bolehDi('operator', 'Ditangguhkan', 'penduduk.ubah')).toBe(false)
    expect(bolehDi('operator', 'Ditangguhkan', 'penduduk.lihat')).toBe(true)
    expect(bolehDi('kaur-keuangan', 'Ditangguhkan', 'langganan.bayar')).toBe(true)
    expect(bolehDi('kaur-keuangan', 'Ditangguhkan', 'keuangan.sinkron')).toBe(false)
    expect(bolehDi('kades', 'Ditangguhkan', 'akses-sinfodes.kelola')).toBe(true)
    expect(bolehDi('kades', 'Ditangguhkan', 'surat.tandatangani')).toBe(false)
  })
})

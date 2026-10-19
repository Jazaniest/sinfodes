import { describe, expect, it } from 'vitest'
import { boleh, cakupanDusun } from './hak-akses'
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
  ] as const)('%s → %s = %s', (peran, kemampuan, harap) => expect(boleh(peran, kemampuan)).toBe(harap))

  it('kepala dusun dibatasi ke dusunnya, peran lain tidak', () => {
    const dasar: Pengguna = {
      id: 'pgn_x', desaId: 'desa_x', nama: 'Sukardi', jabatan: 'Kepala Dusun II', peran: 'kadus',
      dusunId: 'dsn_ss_2', email: 'x@y.id', aktif: true,
    }
    expect(cakupanDusun(dasar)).toBe('dsn_ss_2')
    expect(cakupanDusun({ ...dasar, peran: 'operator', dusunId: null })).toBeNull()
  })
})

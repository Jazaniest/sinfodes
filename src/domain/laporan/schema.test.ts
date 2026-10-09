import { describe, expect, it } from 'vitest'
import { kalimatPerbaikan, laporanDataSchema, type IsiPerbaikan, type LaporanData } from './schema'

const isiPerbaikan: IsiPerbaikan = {
  jenis: 'perbaikan', pendudukId: 'pdk_syahrial', field: 'pekerjaan', nilaiBaru: 'Wiraswasta', catatan: null,
}
const laporan: LaporanData = {
  id: 'lap_1', desaId: 'desa_sungai_sialang', dusunId: 'dsn_ss_1', dibuatPada: '2026-09-23T07:00:00+07:00',
  pelapor: { pendudukId: 'pdk_siti_rahmah', nama: 'Siti Rahmah' }, status: 'baru', ditangani: null, isi: isiPerbaikan,
}

describe('laporan data dari warga (SPEC §6.3, §10)', () => {
  it('kalimat banner di profil', () => {
    expect(kalimatPerbaikan(isiPerbaikan)).toBe('Warga melaporkan: pekerjaan seharusnya Wiraswasta')
    expect(kalimatPerbaikan({ ...isiPerbaikan, field: 'tanggalLahir', nilaiBaru: '1987-04-19' })).toBe(
      'Warga melaporkan: tanggal lahir seharusnya 19 April 1987',
    )
  })
  it('field di luar daftar yang boleh dilaporkan ditolak (mis. NIK)', () =>
    expect(laporanDataSchema.safeParse({ ...laporan, isi: { ...isiPerbaikan, field: 'nik' } }).success).toBe(false))
  it('laporan kelahiran: jam dan isian rinci boleh kosong', () => {
    const isi = {
      jenis: 'kelahiran', ibuId: 'pdk_rosnani', nama: 'Nayla Safitri', jenisKelamin: 'P', tanggalLahir: '2026-09-21',
      jam: null, tempatDilahirkan: null, penolong: null, beratGram: null, panjangCm: null, catatan: null,
    }
    expect(laporanDataSchema.safeParse({ ...laporan, isi }).success).toBe(true)
  })
})

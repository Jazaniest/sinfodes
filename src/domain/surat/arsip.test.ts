import { describe, expect, it } from 'vitest'
import { BOM, keCsv } from '../format/csv'
import { barisCsvBukuAgenda, filterSuratKeluarSchema, isianSuratMasukSchema, labelPenandatangan, type BarisSuratKeluar } from './arsip'

const BARIS: BarisSuratKeluar = {
  id: 'srt_a', nomor: '470/578/SS/IX/2026', urut: 578, tanggal: '2026-09-24',
  jenis: { kode: 'SKD', nama: 'Surat Keterangan Domisili' }, untuk: 'Siti Rahmah',
  penandatangan: { nama: 'Hendri Saputra', peran: 'sekdes' }, kanal: 'loket', status: 'selesai',
}

describe('arsip surat keluar (SPEC §7.4 layar 5)', () => {
  it('penandatangan a.n. ditulis lengkap', () => {
    expect(labelPenandatangan({ nama: 'H. Muhammad Nasir', peran: 'kades' })).toBe('H. Muhammad Nasir')
    expect(labelPenandatangan({ nama: 'Hendri Saputra', peran: 'sekdes' })).toBe('a.n. Kepala Desa, Hendri Saputra')
  })
  it('Buku Agenda CSV: kepala kolom, nomor baris, tanggal panjang', () => {
    const baris = barisCsvBukuAgenda([BARIS, { ...BARIS, id: 'srt_b', urut: 579, nomor: '470/579/SS/IX/2026', status: 'dibatalkan' }])
    expect(baris[0]).toEqual(['No.', 'Nomor surat', 'Tanggal', 'Jenis surat', 'Untuk', 'Penandatangan', 'Kanal', 'Status'])
    expect(baris[1]).toEqual([
      1, '470/578/SS/IX/2026', '24 September 2026', 'Surat Keterangan Domisili', 'Siti Rahmah', 'a.n. Kepala Desa, Hendri Saputra', 'Loket', 'Selesai',
    ])
    expect(baris[2][7]).toBe('Dibatalkan')
    expect(keCsv(baris).startsWith(`${BOM}No.;Nomor surat;`)).toBe(true)
  })
  it('filter: halaman bawaan; bulan dan penandatangan dibatasi', () => {
    expect(filterSuratKeluarSchema.parse({})).toEqual({ page: 1, pageSize: 25 })
    expect(filterSuratKeluarSchema.safeParse({ bulan: '2026-13' }).success).toBe(false)
    expect(filterSuratKeluarSchema.safeParse({ penandatangan: 'operator' }).success).toBe(false)
  })
})

describe('isian surat masuk', () => {
  const SAH = {
    diterima: '2026-09-23', nomor: '005/123/Kec-TM/2026', tanggalSurat: '2026-09-21', pengirim: 'Camat Teluk Meranti',
    perihal: 'Undangan rapat koordinasi', disposisiKepada: 'Sekretaris Desa' as const, disposisiInstruksi: 'Hadiri dan laporkan.',
  }
  it('isian lengkap sah; tanpa disposisi juga sah', () => {
    expect(isianSuratMasukSchema.safeParse(SAH).success).toBe(true)
    expect(isianSuratMasukSchema.safeParse({ ...SAH, disposisiKepada: null, disposisiInstruksi: '' }).success).toBe(true)
  })
  it('pesan per kolom: wajib, urutan tanggal, instruksi tanpa tujuan', () => {
    const galat = (isi: object) => {
      const hasil = isianSuratMasukSchema.safeParse(isi)
      return hasil.success ? {} : Object.fromEntries(hasil.error.issues.map((i) => [i.path.join('.'), i.message]))
    }
    expect(galat({ ...SAH, nomor: '  ', perihal: '' })).toEqual({ nomor: 'Nomor surat wajib diisi', perihal: 'Perihal wajib diisi' })
    expect(galat({ ...SAH, tanggalSurat: '2026-09-25' })).toEqual({ tanggalSurat: 'Tanggal surat tidak boleh sesudah tanggal terima' })
    expect(galat({ ...SAH, disposisiKepada: null })).toEqual({ disposisiKepada: 'Pilih tujuan disposisi untuk instruksi ini' })
  })
})

import { describe, expect, it } from 'vitest'
import { BOM, keCsv } from '../format/csv'
import { barisCsvBukuAgenda, filterSuratKeluarSchema, isianSuratMasukSchema, labelPenandatangan, namaScanAman, type BarisSuratKeluar } from './arsip'
import { PESAN_CATATAN_NIK } from './permohonan'

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

describe('isian surat masuk: tanpa NIK (8F3 Ruling 14, fokus review 9)', () => {
  const SAH = {
    diterima: '2026-09-23', nomor: '005/123/Kec-TM/2026', tanggalSurat: '2026-09-21', pengirim: 'Camat Teluk Meranti',
    perihal: 'Undangan rapat koordinasi', disposisiKepada: 'Sekretaris Desa' as const, disposisiInstruksi: 'Hadiri dan laporkan.',
  }
  const galat = (isi: object) => {
    const hasil = isianSuratMasukSchema.safeParse(isi)
    return hasil.success ? {} : Object.fromEntries(hasil.error.issues.map((i) => [i.path.join('.'), i.message]))
  }
  it.each(['nomor', 'pengirim', 'perihal', 'disposisiInstruksi'] as const)('16 angka berurutan di %s ditolak dengan pesan catatan NIK', (kolom) => {
    expect(galat({ ...SAH, [kolom]: `ref 3175010101010001 selesai` })).toEqual({ [kolom]: PESAN_CATATAN_NIK })
  })
  it('15 angka dan 16 angka yang bersambung angka lain (17 angka) lolos', () => {
    expect(isianSuratMasukSchema.safeParse({ ...SAH, nomor: '317501010101000' }).success).toBe(true)
    expect(isianSuratMasukSchema.safeParse({ ...SAH, nomor: '31750101010100012' }).success).toBe(true)
  })
})

describe('namaScanAman (8F3 Ruling 2)', () => {
  it('membuang jalur Windows dan POSIX, menyisakan nama berkas', () => {
    expect(namaScanAman('C:\\kantor\\Surat Undangan.pdf')).toBe('Surat Undangan.pdf')
    expect(namaScanAman('/home/op/surat/Undangan Camat.PDF')).toBe('Undangan Camat.PDF')
  })
  it('membuang karakter kontrol dan pemisah baris', () => {
    expect(namaScanAman('Surat\u0000 \r\nMasuk\u0007.jpg')).toBe('Surat Masuk.jpg')
  })
  it('lebih dari 100 karakter dipotong dan ekstensi tetap', () => {
    const hasil = namaScanAman(`${'a'.repeat(150)}.pdf`)
    expect(hasil).toHaveLength(100)
    expect(hasil.endsWith('.pdf')).toBe(true)
  })
  it('memuat 16 angka berurutan: diganti scan + ekstensi', () => {
    expect(namaScanAman('KTP 3175010101010001.jpg')).toBe('scan.jpg')
  })
  it('kosong atau hanya spasi/jalur: scan', () => {
    expect(namaScanAman('')).toBe('scan')
    expect(namaScanAman('   ')).toBe('scan')
    expect(namaScanAman('C:\\folder\\')).toBe('scan')
  })
  it('ekstensi tanpa nama: scan + ekstensi', () => expect(namaScanAman('.pdf')).toBe('scan.pdf'))
})

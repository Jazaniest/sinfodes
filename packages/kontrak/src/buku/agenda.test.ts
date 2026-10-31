import { describe, expect, it } from 'vitest'
import { susunBukuAgenda, type BahanBukuAgenda } from './agenda'

const KELUAR = { terbitPada: '2026-09-24T10:00:00+07:00', nomor: '470/578/SS/IX/2026', pemohon: 'Siti Rahmah', jenis: 'Surat Keterangan Domisili' }
const MASUK = {
  diterima: '2026-09-24', dicatatPada: '2026-09-24T09:00:00+07:00', nomor: '005/123/Kec-TM/2026', tanggalSurat: '2026-09-21',
  pengirim: 'Camat Teluk Meranti', perihal: 'Undangan rapat koordinasi',
}
const bahan = (b: Partial<BahanBukuAgenda>): BahanBukuAgenda => ({ keluar: [], masuk: [], ...b })

describe('susunBukuAgenda (SPEC Lampiran B: Buku Agenda)', () => {
  it('kolom mengikuti format buku agenda', () => {
    expect(susunBukuAgenda(bahan({})).kolom).toEqual(['No', 'Tanggal dicatat', 'Surat', 'Nomor surat', 'Tanggal surat', 'Kepada/Dari', 'Isi singkat'])
  })
  it('surat keluar: tanggal dari waktu terbit, penerima pemohon, isi singkat nama jenis', () => {
    expect(susunBukuAgenda(bahan({ keluar: [KELUAR] })).baris).toEqual([
      ['1', '24 September 2026', 'Keluar', '470/578/SS/IX/2026', '24 September 2026', 'Siti Rahmah', 'Surat Keterangan Domisili'],
    ])
  })
  it('surat masuk: tanggal dicatat = diterima, tanggal surat sendiri, pengirim dan perihal', () => {
    expect(susunBukuAgenda(bahan({ masuk: [MASUK] })).baris).toEqual([
      ['1', '24 September 2026', 'Masuk', '005/123/Kec-TM/2026', '21 September 2026', 'Camat Teluk Meranti', 'Undangan rapat koordinasi'],
    ])
  })
  it('urut tanggal lalu waktu catat, apa pun urutan bahan', () => {
    const lebihAwal = { ...MASUK, diterima: '2026-09-23', dicatatPada: '2026-09-23T15:00:00+07:00', nomor: 'A-1' }
    const isi = susunBukuAgenda(bahan({ keluar: [KELUAR], masuk: [MASUK, lebihAwal] }))
    expect(isi.baris.map((b) => [b[0], b[2], b[3]])).toEqual([
      ['1', 'Masuk', 'A-1'],
      ['2', 'Masuk', '005/123/Kec-TM/2026'],
      ['3', 'Keluar', '470/578/SS/IX/2026'],
    ])
  })
  it('hari yang sama dibandingkan sebagai waktu, bukan teks (Z dan +07:00 bercampur)', () => {
    // 03.00 UTC = 10.00 WIB; surat masuk dicatat 09.30 WIB lebih awal walau teksnya lebih besar.
    const keluar = { ...KELUAR, terbitPada: '2026-09-24T03:00:00Z' }
    const masuk = { ...MASUK, dicatatPada: '2026-09-24T09:30:00+07:00' }
    expect(susunBukuAgenda(bahan({ keluar: [keluar], masuk: [masuk] })).baris.map((b) => b[2])).toEqual(['Masuk', 'Keluar'])
  })
  it('tanggal terbit dibaca menurut WIB: 23.30 WIB masih tanggal yang sama', () => {
    const keluar = { ...KELUAR, terbitPada: '2026-10-31T16:30:00Z' }
    expect(susunBukuAgenda(bahan({ keluar: [keluar] })).baris[0][1]).toBe('31 Oktober 2026')
  })
  it('surat dengan tanggal dan waktu catat yang sama berurut tetap, apa pun urutan bahan (nomor, lalu isi lain)', () => {
    const a = { ...KELUAR, nomor: '470/001/SS/IX/2026', terbitPada: '2026-09-24T10:00:00+07:00' }
    const b = { ...KELUAR, nomor: '470/002/SS/IX/2026', terbitPada: '2026-09-24T10:00:00+07:00' }
    const satu = susunBukuAgenda(bahan({ keluar: [a, b] })).baris.map((r) => r[3])
    const dua = susunBukuAgenda(bahan({ keluar: [b, a] })).baris.map((r) => r[3])
    expect(satu).toEqual(['470/001/SS/IX/2026', '470/002/SS/IX/2026'])
    expect(dua).toEqual(satu)
  })
  it('diperbarui = waktu terbaru di antara surat keluar dan surat masuk', () => {
    expect(susunBukuAgenda(bahan({ keluar: [KELUAR], masuk: [MASUK] })).diperbarui).toBe('2026-09-24T10:00:00+07:00')
    expect(susunBukuAgenda(bahan({ masuk: [MASUK] })).diperbarui).toBe('2026-09-24T09:00:00+07:00')
  })
  it('bahan kosong: tanpa baris dan diperbarui null', () => {
    expect(susunBukuAgenda(bahan({}))).toEqual({
      kolom: ['No', 'Tanggal dicatat', 'Surat', 'Nomor surat', 'Tanggal surat', 'Kepada/Dari', 'Isi singkat'], baris: [], diperbarui: null,
    })
  })
})

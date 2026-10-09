import { describe, expect, it } from 'vitest'
import { JENIS_SURAT_BAWAAN } from './bawaan'
import { periksaIsian, saringIsian, samaIsian, sisipanDalamTeks } from './jenis'

const jenis = (kode: string) => {
  const j = JENIS_SURAT_BAWAAN.find((x) => x.kode === kode)
  if (!j) throw new Error(`Jenis ${kode} tidak ada`)
  return j
}

describe('periksaIsian (SPEC §7.4 langkah 3, fokus review 3)', () => {
  it('isian wajib kosong atau hanya spasi', () =>
    expect(periksaIsian(jenis('SKTM'), { keperluan: '', instansiTujuan: '   ' })).toEqual({
      keperluan: 'Keperluan wajib diisi',
      instansiTujuan: 'Instansi tujuan wajib diisi',
    }))
  it('pilihan di luar daftar', () =>
    expect(periksaIsian(jenis('SKTM'), { keperluan: 'Beasiswa', instansiTujuan: 'SMA Negeri 1' })).toEqual({
      keperluan: 'Pilih salah satu keperluan',
    }))
  it('angka dan tanggal', () => {
    expect(periksaIsian(jenis('SKU'), { namaUsaha: 'a', jenisUsaha: 'b', alamatUsaha: 'c', mulaiUsaha: '20a9' })).toEqual({
      mulaiUsaha: 'Mulai usaha (tahun) harus berupa angka',
    })
    expect(
      periksaIsian(jenis('SKM'), { tanggalMeninggal: '2026-02-31', tempatMeninggal: 'Rumah', sebab: 'Sakit', pelapor: 'Amran' }),
    ).toEqual({ tanggalMeninggal: 'Tanggal meninggal tidak valid' })
  })
  it('isian tidak wajib boleh kosong; isian lengkap → tanpa galat', () =>
    expect(
      periksaIsian(jenis('SKTM'), { keperluan: 'Pendidikan', instansiTujuan: 'SMA Negeri 1 Teluk Meranti', anggotaDibantu: '' }),
    ).toEqual({}))
})

describe('isian lain', () => {
  it('saringIsian membuang kunci asing dan spasi di tepi', () =>
    expect(saringIsian(jenis('SKD'), { keperluan: '  pendaftaran sekolah  ', nik: '1405' })).toEqual({ keperluan: 'pendaftaran sekolah' }))
  it('samaIsian: kunci yang hilang sama dengan kosong; spasi di tepi diabaikan', () => {
    expect(samaIsian({ keperluan: '' }, {})).toBe(true)
    expect(samaIsian({ keperluan: 'sekolah ' }, { keperluan: 'sekolah' })).toBe(true)
    expect(samaIsian({ keperluan: 'sekolah' }, { keperluan: 'bank' })).toBe(false)
  })
  it('sisipanDalamTeks: urut kemunculan, tanpa duplikat', () =>
    expect(sisipanDalamTeks('[nama] untuk [keperluan]. Ya, [nama].')).toEqual(['nama', 'keperluan']))
})

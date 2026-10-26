import { describe, expect, it } from 'vitest'
import { JENIS_SURAT_BAWAAN } from './bawaan'
import {
  bolehDiarsipkan, bolehDihapus, dilayani, jenisKosong, periksaIsian, salinJenis, saringIsian, samaIsian, SISIPAN_UMUM, sisipanDalamTeks,
  statusJenis, STATUS_DAFTAR_JENIS, tambahJenisSchema, type JenisSurat,
} from './jenis'

const jenis = (kode: string) => {
  const j = JENIS_SURAT_BAWAAN.find((x) => x.kode === kode)
  if (!j) throw new Error(`Jenis ${kode} tidak ada`)
  return j
}

/** Jenis lengkap (dengan id, asal, dan arsip) dari bawaan, untuk uji status dan salinan. */
const lengkap = (kode: string, ubah: Partial<JenisSurat> = {}): JenisSurat => ({
  ...structuredClone(jenis(kode)), id: `js_x_${kode.toLowerCase()}`, desaId: 'desa_x', asal: 'bawaan', diarsipkan: null, ...ubah,
})

describe('status dan izin jenis buatan desa (SPEC-V0.2 12.1)', () => {
  it('statusJenis: arsip mengalahkan aktif; sisanya mengikuti saklar aktif', () => {
    expect(statusJenis(lengkap('SKD', { aktif: true }))).toBe('aktif')
    expect(statusJenis(lengkap('SKD', { aktif: false }))).toBe('dihentikan')
    expect(statusJenis(lengkap('SKD', { aktif: false, diarsipkan: '2026-09-01T00:00:00+07:00' }))).toBe('diarsipkan')
    expect(statusJenis(lengkap('SKD', { aktif: true, diarsipkan: '2026-09-01T00:00:00+07:00' }))).toBe('diarsipkan')
  })
  it('dilayani: hanya yang menyala dan tidak diarsipkan', () => {
    expect(dilayani({ aktif: true, diarsipkan: null })).toBe(true)
    expect(dilayani({ aktif: false, diarsipkan: null })).toBe(false)
    expect(dilayani({ aktif: true, diarsipkan: '2026-09-01T00:00:00+07:00' })).toBe(false)
  })
  it('STATUS_DAFTAR_JENIS memuat ketiga status', () => expect([...STATUS_DAFTAR_JENIS]).toEqual(['aktif', 'dihentikan', 'diarsipkan']))
  it('bolehDihapus: false untuk bawaan dan untuk jenis desa yang sudah dipakai; true untuk jenis desa yang belum dipakai', () => {
    expect(bolehDihapus(lengkap('SKD'), false)).toBe(false)
    expect(bolehDihapus(lengkap('SKD', { asal: 'desa' }), true)).toBe(false)
    expect(bolehDihapus(lengkap('SKD', { asal: 'desa' }), false)).toBe(true)
  })
  it('bolehDiarsipkan: hanya jenis desa yang belum diarsipkan', () => {
    expect(bolehDiarsipkan(lengkap('SKD'))).toBe(false)
    expect(bolehDiarsipkan(lengkap('SKD', { asal: 'desa' }))).toBe(true)
    expect(bolehDiarsipkan(lengkap('SKD', { asal: 'desa', diarsipkan: '2026-09-01T00:00:00+07:00' }))).toBe(false)
  })
})

describe('jenis baru (SPEC-V0.2 12.1)', () => {
  it('tambahJenisSchema menolak kode terlalu pendek, terlalu panjang, atau bukan huruf kapital, dengan pesan persis', () => {
    for (const kode of ['A', 'ABCDEF', 'ab', 'AB1']) {
      const hasil = tambahJenisSchema.safeParse({ dari: null, kode, nama: 'Surat Uji' })
      expect(hasil.success, kode).toBe(false)
      expect(hasil.error?.issues[0]?.message, kode).toBe('Kode 2-5 huruf kapital.')
    }
  })
  it('tambahJenisSchema menolak nama kosong atau spasi saja, dan menerima masukan sah dengan nama dirapikan', () => {
    const kosong = tambahJenisSchema.safeParse({ dari: null, kode: 'SPK', nama: '   ' })
    expect(kosong.success).toBe(false)
    expect(kosong.error?.issues[0]?.message).toBe('Nama jenis surat wajib diisi.')
    expect(tambahJenisSchema.parse({ dari: 'js_x_skd', kode: 'SPK', nama: ' Surat Pengantar Kerja ' })).toEqual({
      dari: 'js_x_skd', kode: 'SPK', nama: 'Surat Pengantar Kerja',
    })
  })
  it('jenisKosong: klasifikasi 470, subjek pemohon, satu syarat KTP-el, tanpa paraf, tanpa masa berlaku, mati, asal desa', () => {
    const j = jenisKosong({ id: 'desa_x' }, 'SPK', 'Surat Pengantar Kerja')
    expect(j).toMatchObject({
      desaId: 'desa_x', kode: 'SPK', nama: 'Surat Pengantar Kerja', klasifikasi: '470', subjek: 'pemohon', isian: [],
      bolehAtasNama: true, wajibParaf: false, masaBerlakuBulan: null, online: false, syarat: ['KTP-el pemohon'],
      aktif: false, asal: 'desa', diarsipkan: null,
    })
    expect(j.teks).toBe('Yang bertanda tangan di bawah ini menerangkan bahwa [nama] adalah warga Desa [namaDesa].')
  })
  it('jenisKosong: sisipan di teks pembukanya semuanya sisipan yang dikenal', () => {
    const dikenal = new Set<string>(SISIPAN_UMUM.map((s) => s.kunci))
    for (const s of sisipanDalamTeks(jenisKosong({ id: 'desa_x' }, 'SPK', 'Surat').teks)) expect(dikenal.has(s), s).toBe(true)
  })
  it('salinJenis: isian dan teks tersalin utuh, identitas diganti, asal desa, mati, belum diarsipkan', () => {
    const sumber = lengkap('SKTM', { aktif: true, diarsipkan: '2026-09-01T00:00:00+07:00' })
    const salinan = salinJenis(sumber, 'SKTK', 'Surat Keterangan Tidak Kuat')
    expect(salinan).toMatchObject({
      desaId: 'desa_x', kode: 'SKTK', nama: 'Surat Keterangan Tidak Kuat', asal: 'desa', aktif: false, diarsipkan: null,
      klasifikasi: sumber.klasifikasi, subjek: sumber.subjek, isian: sumber.isian, teks: sumber.teks, syarat: sumber.syarat,
      wajibParaf: sumber.wajibParaf, masaBerlakuBulan: sumber.masaBerlakuBulan, online: sumber.online,
    })
    expect('id' in salinan).toBe(false)
  })
  it('salinJenis: salinan dalam, mengubah salinan tidak mengubah sumber (fokus review 5)', () => {
    const sumber = lengkap('SKTM')
    const labelAwal = sumber.isian[0]!.label
    const pilihanAwal = [...(sumber.isian[0]!.pilihan ?? [])]
    const syaratAwal = [...sumber.syarat]
    const salinan = salinJenis(sumber, 'SKTK', 'Salinan')
    salinan.isian[0]!.label = 'Diubah'
    salinan.isian[0]!.pilihan?.push('Baru')
    salinan.syarat.push('Dokumen baru')
    expect(sumber.isian[0]!.label).toBe(labelAwal)
    expect(sumber.isian[0]!.pilihan).toEqual(pilihanAwal)
    expect(sumber.syarat).toEqual(syaratAwal)
  })
})

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

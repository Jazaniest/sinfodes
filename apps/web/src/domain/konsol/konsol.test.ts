import { describe, expect, it } from 'vitest'
import { galatDariZod } from '../format/galat-isian'
import {
  daftarMingguTerakhir, hitungPerhatian, kalimatPerhatian, kalimatPlatform, labelTriwulan, slugDesa,
  type KeadaanDesaKonsol,
} from './aturan'
import { PESAN_ALAMAT_TIDAK_SAH } from '../alamat/alamat'
import { penggunaKonsolSchema, tambahDesaSchema } from './schema'

const SEKARANG = new Date('2026-09-24T02:00:00Z')
const lalu = (hari: number) => new Date(SEKARANG.getTime() - hari * 86_400_000).toISOString()

describe('aturan Konsol Sinfodes (SPEC §11)', () => {
  it('periode tagihan per triwulan', () => {
    expect(labelTriwulan('2026-09-24')).toBe('Triwulan III 2026')
    expect(labelTriwulan('2026-10-01')).toBe('Triwulan IV 2026')
    expect(labelTriwulan('2027-01-15')).toBe('Triwulan I 2027')
  })
  it('Perlu perhatian: desa aktif diam 14 hari, desa persiapan diam 7 hari di langkah mana pun, dan tagihan lewat', () => {
    const daftar: KeadaanDesaKonsol[] = [
      { status: 'Aktif', aktivitasTerakhir: lalu(14), langkahBerikut: null },
      { status: 'Aktif', aktivitasTerakhir: lalu(13), langkahBerikut: null },
      { status: 'Uji coba', aktivitasTerakhir: null, langkahBerikut: null },
      { status: 'Ditangguhkan', aktivitasTerakhir: lalu(60), langkahBerikut: null },
      { status: 'Persiapan', aktivitasTerakhir: lalu(7), langkahBerikut: 'impor' },
      { status: 'Persiapan', aktivitasTerakhir: lalu(3), langkahBerikut: 'impor' },
      { status: 'Persiapan', aktivitasTerakhir: lalu(30), langkahBerikut: 'identitas' },
    ]
    expect(hitungPerhatian(daftar, 1, SEKARANG)).toEqual([
      { jenis: 'tidak-aktif', jumlah: 2 },
      { jenis: 'berhenti-persiapan', jumlah: 2 },
      { jenis: 'tagihan-lewat', jumlah: 1 },
    ])
    expect(hitungPerhatian(daftar, 1, SEKARANG, 2)[0]).toEqual({ jenis: 'bukti-menunggu', jumlah: 2 })
    // Pemantau: tanpa butir tagihan; butir bernilai nol tidak dikirim.
    expect(hitungPerhatian(daftar.slice(1, 2), null, SEKARANG)).toEqual([])
  })
  it('kalimat Perlu perhatian dan angka platform', () => {
    expect(kalimatPerhatian({ jenis: 'tidak-aktif', jumlah: 3 })).toBe('3 desa tidak aktif 14 hari')
    expect(kalimatPerhatian({ jenis: 'berhenti-persiapan', jumlah: 2 })).toBe('2 desa berhenti di langkah persiapan')
    expect(kalimatPerhatian({ jenis: 'tagihan-lewat', jumlah: 1 })).toBe('1 tagihan lewat jatuh tempo')
    expect(kalimatPerhatian({ jenis: 'bukti-menunggu', jumlah: 2 })).toBe('2 bukti bayar menunggu verifikasi')
    expect(kalimatPlatform({ desa: { aktif: 26, ujiCoba: 5, persiapan: 7, ditangguhkan: 2 }, kabupatenMitra: 2 })).toBe(
      '26 desa aktif, 5 uji coba, 7 dalam persiapan, dan 2 ditangguhkan. 2 kabupaten mitra.',
    )
    expect(kalimatPlatform({ desa: { aktif: 1, ujiCoba: 0, persiapan: 0, ditangguhkan: 0 }, kabupatenMitra: 0 })).toBe(
      '1 desa aktif, 0 uji coba, 0 dalam persiapan, dan 0 ditangguhkan. Belum ada kabupaten mitra.',
    )
  })
  it('Senin 12 minggu terakhir, terlama dulu; minggu terakhir memuat hari ini (WIB)', () => {
    const minggu = daftarMingguTerakhir(SEKARANG, 12)
    expect(minggu).toHaveLength(12)
    expect(minggu.at(-1)).toBe('2026-09-21')
    expect(minggu[0]).toBe('2026-07-06')
    // Senin pukul 23.30 WIB masih minggu yang sama.
    expect(daftarMingguTerakhir(new Date('2026-09-21T16:30:00Z'), 1)).toEqual(['2026-09-21'])
  })
  it('slug desa dari nama', () => {
    expect(slugDesa('Sungai Sialang')).toBe('sungai-sialang')
    expect(slugDesa('  Koto Damar (Baru) ')).toBe('koto-damar-baru')
  })
  it('akun Konsol hanya Tim Sinfodes: peran pemantau pindah ke kabupaten (SPEC-V0.2 §7)', () => {
    const tim = { id: 'k', nama: 'Dina', jabatan: 'Tim Sinfodes', peran: 'tim', email: 'dina@sinfodes.id' }
    expect(penggunaKonsolSchema.safeParse(tim).success).toBe(true)
    expect(penggunaKonsolSchema.safeParse({ ...tim, peran: 'pemantau' }).success).toBe(false)
  })
  it('isian Tambah desa: setiap galat menunjuk kolomnya (fokus review 3)', () => {
    const hasil = tambahDesaSchema.safeParse({ nama: ' A ', kecamatan: '', kodeDesa: '1015', paket: 'Dasar', email: 'admin@desa', alamat: 'Desa A' })
    expect(hasil.success).toBe(false)
    if (hasil.success) return
    expect(galatDariZod(hasil.error)).toEqual({
      nama: 'Nama desa minimal 3 huruf.',
      kecamatan: 'Pilih kecamatan.',
      kodeDesa: 'Kode desa 4 angka berawalan 2, mis. 2015.',
      email: 'Email admin belum benar.',
      alamat: PESAN_ALAMAT_TIDAK_SAH,
    })
    expect(
      tambahDesaSchema.parse({
        nama: ' Koto Damar ', kecamatan: '14.01.17', kodeDesa: '2061', paket: 'Lengkap', email: ' Admin@KotoDamar.desa.id ', alamat: ' KotoDamar ',
      }),
    ).toEqual({ nama: 'Koto Damar', kecamatan: '14.01.17', kodeDesa: '2061', paket: 'Lengkap', email: 'admin@kotodamar.desa.id', alamat: 'kotodamar' })
  })
  it('nama desa tanpa huruf atau angka ditolak, karena slug dan alamat websitenya akan kosong', () => {
    const hasil = tambahDesaSchema.safeParse({ nama: '!!! ', kecamatan: '14.01.17', kodeDesa: '2061', paket: 'Dasar', email: 'a@b.id', alamat: 'kotodamar' })
    expect(hasil.success).toBe(false)
    if (hasil.success) return
    expect(galatDariZod(hasil.error)).toEqual({ nama: 'Nama desa harus memuat huruf atau angka.' })
  })
})

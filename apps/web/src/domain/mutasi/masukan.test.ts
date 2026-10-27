import { describe, expect, it } from 'vitest'
import { hubunganBayi, masukanDatangSchema, masukanLahirSchema } from './masukan'

const BAYI = {
  nama: 'Aisyah Putri', jenisKelamin: 'P', tempatLahir: 'Pelalawan', tanggalLahir: '2026-09-20', jam: '04:15',
  tempatDilahirkan: 'Puskesmas', jenisKelahiran: 'Tunggal', anakKe: 3, penolong: 'Bidan/Perawat', beratGram: 3100, panjangCm: 49,
} as const

describe('masukan mutasi (SPEC §6.6)', () => {
  it('lahir: berat dan panjang dalam batas wajar', () => {
    const dasar = { ibuId: 'pdk_siti_rahmah', ayahId: 'pdk_syahrial', pelapor: 'Syahrial' }
    expect(masukanLahirSchema.safeParse({ ...dasar, bayi: BAYI }).success).toBe(true)
    expect(masukanLahirSchema.safeParse({ ...dasar, bayi: { ...BAYI, beratGram: 120 } }).success).toBe(false)
    expect(masukanLahirSchema.safeParse({ ...dasar, bayi: { ...BAYI, jam: '25:00' } }).success).toBe(false)
  })
  it('datang: NIK asal wajib untuk setiap anggota', () => {
    const anggota = {
      nik: null, nama: 'Sutrisno', jenisKelamin: 'L', golonganDarah: 'Tidak Tahu', agama: 'Islam', kewarganegaraan: 'WNI',
      tempatLahir: 'Klaten', tanggalLahir: '1988-05-12', nomorAktaLahir: null, hubunganKeluarga: 'Kepala Keluarga',
      namaAyah: '', namaIbu: '', pendidikan: 'SLTA/Sederajat', pekerjaan: 'Wiraswasta', statusPerkawinan: 'Kawin Tercatat',
      ktpEl: 'Sudah rekam', telepon: null, catatan: null,
    }
    const masukan = {
      nomorSkpwni: '3310/SKPWNI/2026/0042',
      asal: { provinsi: 'Jawa Tengah', kabupaten: 'Klaten', kecamatan: 'Wedi', desa: 'Pandes', alamat: '' },
      tanggal: '2026-09-22',
      keluarga: { jenis: 'baru', dusunId: 'dsn_ss_3', rw: '005', rt: '012' },
      statusPenduduk: 'Tetap',
      anggota: [anggota],
    }
    expect(masukanDatangSchema.safeParse(masukan).success).toBe(false)
    expect(masukanDatangSchema.safeParse({ ...masukan, anggota: [{ ...anggota, nik: '3310011205888999' }] }).success).toBe(true)
  })
  it('hubungan bayi mengikuti hubungan ibunya di KK', () => {
    expect(hubunganBayi('Istri')).toBe('Anak')
    expect(hubunganBayi('Kepala Keluarga')).toBe('Anak')
    expect(hubunganBayi('Anak')).toBe('Cucu')
    expect(hubunganBayi('Menantu')).toBe('Cucu')
    expect(hubunganBayi('Famili Lain')).toBe('Famili Lain')
  })
})

describe('laporan kelahiran (2A-3)', () => {
  it('masukan Lahir boleh membawa ID laporan warga', () => {
    expect(masukanLahirSchema.shape.laporanId.safeParse('lap_kelahiran_rosnani').success).toBe(true)
    expect(masukanLahirSchema.shape.laporanId.safeParse(undefined).success).toBe(true)
    expect(masukanLahirSchema.shape.laporanId.safeParse('').success).toBe(false)
  })
})

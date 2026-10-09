import { describe, expect, it } from 'vitest'
import { contohPenduduk } from '@/test/contoh'
import {
  anggotaDatangKosong, buatSkemaDatang, buatSkemaLahir, buatSkemaMeninggal, isianDatangAwal, isianLahirAwal, isianMeninggalAwal, keMasukanDatang,
  keMasukanLahir, keMasukanMeninggal,
} from './isian'

const HARI_INI = new Date('2026-09-24T02:00:00Z')

const pesanDari = (hasil: { error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
  Object.fromEntries((hasil.error?.issues ?? []).map((i) => [i.path.map(String).join('.'), i.message]))

describe('isian alur mutasi (SPEC §6.6)', () => {
  it('lahir: isian awal bertanggal hari ini; kolom wajib diberi pesan', () => {
    const awal = isianLahirAwal(HARI_INI, 'Pelalawan')
    expect(awal).toMatchObject({ tanggalLahir: '2026-09-24', tempatLahir: 'Pelalawan', jenisKelahiran: 'Tunggal' })
    expect(pesanDari(buatSkemaLahir(HARI_INI).safeParse(awal))).toMatchObject({
      ibu: 'Pilih ibu', nama: 'Nama bayi wajib diisi', jenisKelamin: 'Pilih jenis kelamin', jam: 'Jam lahir wajib diisi',
      beratGram: 'Berat 500–6.000 gram', panjangCm: 'Panjang 30–65 cm', pelapor: 'Nama pelapor wajib diisi',
    })
  })
  it('lahir: isian lengkap → masukan API', () => {
    const isian = {
      ...isianLahirAwal(HARI_INI, 'Pelalawan'), ibu: contohPenduduk({ id: 'pdk_siti_rahmah' }), nama: 'Aisyah Putri',
      jenisKelamin: 'P' as const, tempatDilahirkan: 'Puskesmas' as const, jam: '04:15', anakKe: 3, penolong: 'Bidan/Perawat' as const,
      beratGram: 3100, panjangCm: 49, pelapor: 'Syahrial',
    }
    expect(buatSkemaLahir(HARI_INI).safeParse(isian).success).toBe(true)
    expect(keMasukanLahir(isian)).toMatchObject({ ibuId: 'pdk_siti_rahmah', ayahId: null, bayi: { nama: 'Aisyah Putri', beratGram: 3100 } })
  })
  it('meninggal: tanggal tidak boleh sebelum lahir; pengganti hanya dikirim bila wajib', () => {
    const almarhum = contohPenduduk({ id: 'pdk_syahrial', tanggalLahir: '1987-04-09' })
    const isian = {
      ...isianMeninggalAwal(almarhum, HARI_INI), tanggal: '1980-01-01', jam: '21:40', tempat: 'Rumah', sebab: 'Sakit biasa/tua' as const,
      yangMenerangkan: 'Tenaga kesehatan' as const, pelapor: 'Siti Rahmah', penggantiKepalaId: 'pdk_siti_rahmah',
    }
    expect(pesanDari(buatSkemaMeninggal(HARI_INI).safeParse(isian)).tanggal).toBe('Tanggal meninggal tidak boleh sebelum tanggal lahir')
    const sah = { ...isian, tanggal: '2026-09-23' }
    expect(keMasukanMeninggal(sah, true).penggantiKepalaId).toBe('pdk_siti_rahmah')
    expect(keMasukanMeninggal(sah, false).penggantiKepalaId).toBeNull()
  })
})

describe('isian kedatangan', () => {
  const ISTILAH = { dusun: 'Dusun', rw: 'RW', rt: 'RT' }
  it('KK baru wajib tepat satu kepala keluarga; NIK asal wajib', () => {
    const isian = {
      ...isianDatangAwal(HARI_INI), keluargaJenis: 'baru' as const,
      anggota: [{ ...anggotaDatangKosong('Famili Lain'), nama: 'Sutrisno' }],
    }
    expect(pesanDari(buatSkemaDatang(HARI_INI, ISTILAH).safeParse(isian))).toMatchObject({
      'anggota.root': 'KK baru harus punya tepat satu kepala keluarga',
      'anggota.0.nik': 'NIK asal wajib diisi',
    })
  })
  it('keMasukanDatang: KTP-el menurut umur, field kosong jadi null', () => {
    const anggota = {
      ...anggotaDatangKosong('Kepala Keluarga'), nik: '3310011205888999', nama: 'Sutrisno', jenisKelamin: 'L' as const,
      tempatLahir: 'Klaten', tanggalLahir: '1988-05-12', agama: 'Islam' as const,
    }
    const anak = { ...anggota, nik: '3310010303158998', nama: 'Bima', tanggalLahir: '2015-03-03', hubunganKeluarga: 'Anak' as const }
    const isian = {
      ...isianDatangAwal(HARI_INI), nomorSkpwni: '3310/SKPWNI/2026/0042', provinsi: 'Jawa Tengah', kabupaten: 'Klaten',
      kecamatan: 'Wedi', desa: 'Pandes', keluargaJenis: 'baru' as const, dusunId: 'dsn_ss_3', rw: '005', rt: '012', anggota: [anggota, anak],
    }
    const masukan = keMasukanDatang(isian, HARI_INI)
    expect(masukan.anggota.map((a) => a.ktpEl)).toEqual(['Sudah rekam', 'Belum wajib'])
    expect(masukan.anggota[0]).toMatchObject({ pendidikan: null, golonganDarah: 'Tidak Tahu', kewarganegaraan: 'WNI' })
    expect(masukan.keluarga).toEqual({ jenis: 'baru', dusunId: 'dsn_ss_3', rw: '005', rt: '012' })
  })
})

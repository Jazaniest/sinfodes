import { describe, expect, it } from 'vitest'
import { buatNik } from '@/domain/penduduk/nik'
import { contohPenduduk } from '@/test/contoh'
import { buatSkemaIsian, cocokIsianPenduduk, isianDariPenduduk, isianKosong, keMasukan, perubahanBiodata } from './isian'

const HARI_INI = new Date('2026-09-24T02:00:00Z')
const ISTILAH = { dusun: 'Dusun', rw: 'RW', rt: 'RT' }
const KK = { id: 'kk_syahrial', nomorKk: '1405092011238004', namaKepala: 'Syahrial', dusunId: 'dsn_ss_1', rw: '002', rt: '004', jumlahAnggota: 4 }

describe('isian formulir penduduk (SPEC §6.4)', () => {
  it('isian kosong → pesan per kolom wajib', () => {
    const hasil = buatSkemaIsian(HARI_INI, ISTILAH).safeParse(isianKosong(null))
    expect(hasil.success).toBe(false)
    const pesan = Object.fromEntries((hasil.error?.issues ?? []).map((i) => [String(i.path[0]), i.message]))
    expect(pesan).toMatchObject({
      nama: 'Nama lengkap wajib diisi',
      jenisKelamin: 'Pilih jenis kelamin',
      agama: 'Pilih agama',
      tempatLahir: 'Tempat lahir wajib diisi',
      tanggalLahir: 'Tanggal lahir wajib diisi',
      keluarga: 'Pilih KK, atau buat KK baru',
      hubunganKeluarga: 'Pilih hubungan dalam keluarga',
    })
    expect(pesan.nik).toBeUndefined()
  })
  it('KK baru meminta wilayah; NIK tidak lengkap dan telepon salah diberi pesan', () => {
    const isian = { ...isianKosong(null), keluargaJenis: 'baru' as const, nik: '140509', telepon: '62812' }
    const pesan = Object.fromEntries(
      (buatSkemaIsian(HARI_INI, ISTILAH).safeParse(isian).error?.issues ?? []).map((i) => [String(i.path[0]), i.message]),
    )
    expect(pesan).toMatchObject({
      dusunId: 'Pilih dusun', rw: 'Pilih RW', rt: 'Pilih RT', nik: 'NIK harus 16 angka — baru 6', telepon: 'Nomor telepon diawali 08, 10–13 angka',
    })
    expect(pesan.keluarga).toBeUndefined()
  })
  it('keMasukan: kosong jadi null, telepon dibersihkan, KK ada atau baru', () => {
    const isian = {
      ...isianKosong(KK), nik: buatNik({ kodeWilayah: '140509', tanggalLahir: '2015-05-10', jenisKelamin: 'L', nomorUrut: 9876 }),
      nama: 'Fajar Ramadhan', jenisKelamin: 'L' as const, agama: 'Islam' as const, tempatLahir: 'Teluk Meranti',
      tanggalLahir: '2015-05-10', hubunganKeluarga: 'Anak' as const, telepon: '0812-7740 2231',
    }
    expect(keMasukan(isian)).toMatchObject({
      nomorAktaLahir: null, pendidikan: null, catatan: null, telepon: '081277402231', keluarga: { jenis: 'ada', id: 'kk_syahrial' },
    })
    expect(keMasukan({ ...isian, keluargaJenis: 'baru', dusunId: 'dsn_ss_3', rw: '005', rt: '012', hubunganKeluarga: 'Kepala Keluarga' }).keluarga).toEqual({
      jenis: 'baru', dusunId: 'dsn_ss_3', rw: '005', rt: '012',
    })
  })
  it('perubahanBiodata hanya berisi field yang berubah', () => {
    const asli = contohPenduduk()
    const isian = isianDariPenduduk(asli, KK)
    expect(perubahanBiodata(asli, keMasukan(isian))).toEqual({})
    expect(perubahanBiodata(asli, keMasukan({ ...isian, pekerjaan: 'Wiraswasta' }))).toEqual({ pekerjaan: 'Wiraswasta' })
  })
  it('cocokIsianPenduduk menolak bentuk lain (draf rusak)', () => {
    expect(cocokIsianPenduduk(isianKosong(null))).toBe(true)
    expect(cocokIsianPenduduk({ nama: 'Fajar' })).toBe(false)
    expect(cocokIsianPenduduk(null)).toBe(false)
  })
})

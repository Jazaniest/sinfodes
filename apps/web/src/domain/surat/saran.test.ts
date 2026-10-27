import { describe, expect, it } from 'vitest'
import { contohPenduduk } from '@/test/contoh'
import { contohJenis } from '@/test/contoh-surat'
import type { Mutasi } from '../mutasi/schema'
import type { Penduduk } from '../penduduk/schema'
import { saranDariMutasi } from './saran'

const OLEH = { id: 'pgn_rosmiati', nama: 'Rosmiati' }
const dasar = { desaId: 'desa_sungai_sialang', tanggal: '2026-09-21', dicatatOleh: OLEH, dicatatPada: '2026-09-24T08:00:00+07:00' }
const ayah = contohPenduduk({ id: 'pdk_ayah', nama: 'Zulkifli' })
const ibu = contohPenduduk({ id: 'pdk_ibu', nama: 'Rosnani' })
const bayi = contohPenduduk({ id: 'pdk_bayi', nama: 'Nayla Safitri', nik: null })
const orang = new Map<string, Penduduk>([ayah, ibu, bayi].map((p) => [p.id, p]))
const cari = (id: string) => orang.get(id)
const LAHIR: Mutasi = {
  ...dasar, id: 'mts_lahir', jenis: 'lahir', pendudukIds: ['pdk_bayi'],
  rincian: {
    jam: '05:20', tempatDilahirkan: 'Puskesmas', tempatLahir: 'Pelalawan', jenisKelahiran: 'Tunggal', anakKe: 3, penolong: 'Bidan/Perawat',
    beratGram: 3050, panjangCm: 49, ibuId: 'pdk_ibu', ayahId: 'pdk_ayah', pelapor: 'Zulkifli',
  },
}
const MENINGGAL: Mutasi = {
  ...dasar, id: 'mts_meninggal', jenis: 'meninggal', pendudukIds: ['pdk_ayah'],
  rincian: { jam: '14:10', tempat: 'Rumah', sebab: 'Sakit biasa/tua', yangMenerangkan: 'Lainnya', pelapor: 'Rosnani' },
}
const PINDAH: Mutasi = {
  ...dasar, id: 'mts_pindah', jenis: 'pindah', pendudukIds: ['pdk_ayah', 'pdk_ibu'],
  rincian: {
    tujuan: { provinsi: 'Riau', kabupaten: 'Kota Pekanbaru', kecamatan: 'Tampan', desa: 'Simpang Baru', alamat: 'Jl. Garuda Sakti No. 14' },
    alasan: 'Pekerjaan',
  },
}

describe('saranDariMutasi (SPEC §6.6, §7.3)', () => {
  it('kelahiran: pelapor dari mutasi, pemohon ayah yang masih hidup', () =>
    expect(saranDariMutasi(contohJenis('SKL'), LAHIR, cari, [])).toEqual({ mutasiId: 'mts_lahir', pemohonId: 'pdk_ayah', isian: { pelapor: 'Zulkifli' } }))
  it('kelahiran: ayah sudah tidak tercatat hidup → ibu', () => {
    const cariTanpaAyah = (id: string) => (id === 'pdk_ayah' ? { ...ayah, statusDasar: 'Meninggal' as const } : cari(id))
    expect(saranDariMutasi(contohJenis('SKL'), LAHIR, cariTanpaAyah, []).pemohonId).toBe('pdk_ibu')
  })
  it('kematian: tanggal, tempat, sebab, pelapor; pemohon anggota keluarga yang masih hidup', () =>
    expect(saranDariMutasi(contohJenis('SKM'), MENINGGAL, cari, [{ ...ayah, statusDasar: 'Meninggal' }, ibu])).toEqual({
      mutasiId: 'mts_meninggal',
      pemohonId: 'pdk_ibu',
      isian: { tanggalMeninggal: '2026-09-21', tempatMeninggal: 'Rumah', sebab: 'Sakit biasa/tua', pelapor: 'Rosnani' },
    }))
  it('pindah: alamat tujuan lengkap, alasan, dan semua anggota yang pindah', () =>
    expect(saranDariMutasi(contohJenis('SPP'), PINDAH, cari, [])).toEqual({
      mutasiId: 'mts_pindah',
      pemohonId: 'pdk_ayah',
      isian: {
        alamatTujuan: 'Jl. Garuda Sakti No. 14, Simpang Baru, Kec. Tampan, Kota Pekanbaru, Riau',
        alasan: 'Pekerjaan',
        anggotaPindah: 'Zulkifli, Rosnani',
      },
    }))
  it('tanpa mutasi, atau mutasi yang tidak cocok dengan jenis surat → kosong', () => {
    const kosong = { mutasiId: null, pemohonId: null, isian: {} }
    expect(saranDariMutasi(contohJenis('SKL'), null, cari, [])).toEqual(kosong)
    expect(saranDariMutasi(contohJenis('SKL'), MENINGGAL, cari, [])).toEqual(kosong)
    expect(saranDariMutasi(contohJenis('SKD'), LAHIR, cari, [])).toEqual(kosong)
  })
})

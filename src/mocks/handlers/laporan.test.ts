import { describe, expect, it } from 'vitest'
import { ambilBeranda } from '@/api/beranda'
import { GalatApi } from '@/api/galat'
import { ambilLaporan, daftarLaporan, terapkanLaporan, tolakLaporan } from '@/api/laporan'
import { catatLahir } from '@/api/mutasi'
import { ambilPenduduk, ambilRiwayatPenduduk } from '@/api/penduduk'
import type { MasukanLahir } from '@/domain/mutasi/masukan'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'

pakaiApiTiruan({ dbSegarTiapUji: true })

async function galatDari(janji: Promise<unknown>): Promise<GalatApi> {
  try {
    await janji
  } catch (e) {
    if (e instanceof GalatApi) return e
    throw e
  }
  throw new Error('Seharusnya gagal')
}

const LAHIR: MasukanLahir = {
  ibuId: 'pdk_rosnani', ayahId: 'pdk_zulkifli', pelapor: 'Zulkifli', laporanId: 'lap_kelahiran_rosnani',
  bayi: {
    nama: 'Nayla Safitri', jenisKelamin: 'P', tempatLahir: 'Pelalawan', tanggalLahir: '2026-09-21', jam: '05:20',
    tempatDilahirkan: 'Puskesmas', jenisKelahiran: 'Tunggal', anakKe: 3, penolong: 'Bidan/Perawat', beratGram: 3050, panjangCm: 49,
  },
}

describe('laporan data warga (SPEC §5.3, §6.3)', () => {
  it('daftar laporan baru, terlama dulu; bisa disaring per penduduk', async () => {
    masukSebagai(AKUN_UJI.operator)
    expect((await daftarLaporan({ status: 'baru' })).data.map((l) => l.id)).toEqual(['lap_pekerjaan_syahrial', 'lap_kelahiran_rosnani'])
    expect((await daftarLaporan({ jenis: 'perbaikan', pendudukId: 'pdk_syahrial' })).data).toHaveLength(1)
    expect((await daftarLaporan({ pendudukId: 'pdk_siti_rahmah' })).data).toHaveLength(0)
  })
  it('Terapkan: data berubah, Riwayat mencatat petugas, laporan selesai; Terapkan lagi → CONFLICT (fokus review 2)', async () => {
    masukSebagai(AKUN_UJI.operator)
    const { laporan, penduduk } = await terapkanLaporan('lap_pekerjaan_syahrial')
    expect(penduduk.pekerjaan).toBe('Wiraswasta')
    expect(laporan).toMatchObject({ status: 'diterapkan', ditangani: { oleh: { nama: 'Rosmiati' }, alasan: null } })
    expect(await ambilRiwayatPenduduk('pdk_syahrial')).toContainEqual(
      expect.objectContaining({ jenis: 'ubah', field: 'pekerjaan', nilaiLama: 'Nelayan/Perikanan', nilaiBaru: 'Wiraswasta' }),
    )
    expect((await galatDari(terapkanLaporan('lap_pekerjaan_syahrial'))).kode).toBe('CONFLICT')
    expect((await ambilBeranda()).tindakan?.map((t) => t.jenis)).not.toContain('laporan-perbaikan')
  })
  it('Tolak dengan alasan; sesudahnya tidak bisa diterapkan dan data tidak berubah', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    const { laporan } = await tolakLaporan('lap_pekerjaan_syahrial', 'Masih tercatat di kelompok nelayan.')
    expect(laporan).toMatchObject({ status: 'ditolak', ditangani: { alasan: 'Masih tercatat di kelompok nelayan.' } })
    expect((await galatDari(terapkanLaporan('lap_pekerjaan_syahrial'))).kode).toBe('CONFLICT')
    expect((await ambilPenduduk('pdk_syahrial')).pekerjaan).toBe('Nelayan/Perikanan')
  })
  it('peran tanpa hak ubah → FORBIDDEN (fokus review 1); laporan kelahiran tidak bisa diterapkan langsung', async () => {
    masukSebagai(AKUN_UJI.kades)
    expect((await galatDari(terapkanLaporan('lap_pekerjaan_syahrial'))).kode).toBe('FORBIDDEN')
    expect((await galatDari(tolakLaporan('lap_pekerjaan_syahrial', null))).kode).toBe('FORBIDDEN')
    masukSebagai(AKUN_UJI.operator)
    expect((await galatDari(terapkanLaporan('lap_kelahiran_rosnani'))).kode).toBe('VALIDATION')
  })
  it('Kepala Dusun II tidak melihat laporan dari dusun lain', async () => {
    masukSebagai(AKUN_UJI.kadus)
    expect((await daftarLaporan({})).data).toEqual([])
  })
  it('Catat kelahiran dari laporan: laporan selesai dan tidak bisa dipakai lagi (fokus review 2)', async () => {
    masukSebagai(AKUN_UJI.operator)
    const hasil = await catatLahir(LAHIR)
    expect(hasil.penduduk[0]).toMatchObject({ nama: 'Nayla Safitri', keluargaId: 'kk_zulkifli' })
    expect((await ambilLaporan('lap_kelahiran_rosnani')).status).toBe('diterapkan')
    expect((await galatDari(catatLahir(LAHIR))).kode).toBe('CONFLICT')
    expect((await ambilBeranda()).tindakan?.map((t) => t.jenis)).toEqual(['permohonan-menunggu', 'laporan-perbaikan', 'surat-dikembalikan', 'data-belum-lengkap'])
  })
})

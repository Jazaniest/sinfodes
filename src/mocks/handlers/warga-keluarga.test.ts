// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { GalatApi } from '@/api/galat'
import { ambilKeluargaWarga, kirimLaporanWarga } from '@/api/warga'
import type { KirimLaporanWarga } from '@/domain/warga/keluarga'
import { ambilDb } from '@/mocks/db'
import { AKUN_WARGA_UJI, masukSebagaiWarga, pakaiApiTiruan } from '@/test/api-tiruan'

pakaiApiTiruan({ dbSegarTiapUji: true })

const foto = (nama: string) => new File([new Uint8Array(300 * 1024)], nama, { type: 'image/jpeg' })
const laporanNurAini = (ubah: Partial<KirimLaporanWarga> = {}): KirimLaporanWarga => ({
  kunci: 'kunci-uji-lap-0001',
  pendudukId: 'pdk_nur_aini',
  field: 'golonganDarah',
  nilaiBaru: 'A',
  catatan: 'Sesuai kartu golongan darah dari puskesmas.',
  ...ubah,
})

async function galatDari(janji: Promise<unknown>): Promise<GalatApi> {
  try {
    await janji
  } catch (e) {
    if (e instanceof GalatApi) return e
    throw e
  }
  throw new Error('Seharusnya gagal')
}

describe('Keluarga saya (SPEC §10)', () => {
  it('anggota KK yang hidup, kepala keluarga dulu; nomor KK dan alamat; laporan yang masih ditinjau', async () => {
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    const k = await ambilKeluargaWarga()
    expect(k.anggota.map((a) => a.nama)).toEqual(['Syahrial', 'Siti Rahmah', 'Nur Aini', 'Muhammad Alif'])
    expect(k.anggota.find((a) => a.id === 'pdk_siti_rahmah')?.nik).toBe('1405095203918002')
    expect(k.nomorKk).toMatch(/^\d{16}$/)
    expect(k.alamat).toBe('RT 004/RW 002, Dusun I Kampung Tengah, Desa Sungai Sialang')
    expect(k.laporan).toEqual([
      expect.objectContaining({ namaPenduduk: 'Syahrial', field: 'pekerjaan', nilaiBaru: 'Wiraswasta', status: 'baru' }),
    ])
  })
})

describe('laporan data dari warga (SPEC §10, §5.3)', () => {
  it('laporan dengan foto masuk antrean operator; operator mendapat notifikasi', async () => {
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    const hasil = await kirimLaporanWarga(laporanNurAini(), foto('kartu-goldar.jpg'))
    expect(hasil).toMatchObject({ namaPenduduk: 'Nur Aini', field: 'golonganDarah', nilaiBaru: 'A', status: 'baru' })
    const l = ambilDb().laporanData.find((x) => x.id === hasil.id)
    expect(l).toMatchObject({ pelapor: { pendudukId: 'pdk_siti_rahmah' }, lampiran: { berkas: 'kartu-goldar.jpg', ukuranKb: 300 } })
    expect(ambilDb().notifikasi.some((n) => n.penggunaId === 'pgn_rosmiati' && n.jenis === 'laporan-data')).toBe(true)
  })
  it('foto boleh tidak dilampirkan; Kirim ulang dengan kunci sama tidak membuat laporan ganda (fokus review 1)', async () => {
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    const jumlahAwal = ambilDb().laporanData.length
    const pertama = await kirimLaporanWarga(laporanNurAini(), null)
    const ulang = await kirimLaporanWarga(laporanNurAini(), null)
    expect(ulang).toEqual(pertama)
    expect(ambilDb().laporanData.length).toBe(jumlahAwal + 1)
    expect(ambilDb().laporanData.find((x) => x.id === pertama.id)?.lampiran).toBeNull()
  })
  it('nilai tidak sah, sama dengan data sekarang, atau field yang masih ditinjau ditolak (fokus review 5)', async () => {
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    expect((await galatDari(kirimLaporanWarga(laporanNurAini({ field: 'pekerjaan', nilaiBaru: 'Pengusaha sukses' }), null))).fields.nilaiBaru).toBe(
      'Pilih pekerjaan dari daftar.',
    )
    expect(
      (await galatDari(kirimLaporanWarga(laporanNurAini({ pendudukId: 'pdk_siti_rahmah', field: 'agama', nilaiBaru: 'Islam' }), null))).fields
        .nilaiBaru,
    ).toBe('Nilai ini sama dengan agama yang tercatat sekarang.')
    const ganda = await galatDari(kirimLaporanWarga(laporanNurAini({ pendudukId: 'pdk_syahrial', field: 'pekerjaan', nilaiBaru: 'Pedagang' }), null))
    expect(ganda).toMatchObject({ kode: 'CONFLICT', message: 'Laporan untuk data ini masih ditinjau kantor desa.' })
  })
  it('anggota di luar KK ditolak (fokus review 3)', async () => {
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    expect((await galatDari(kirimLaporanWarga(laporanNurAini({ pendudukId: 'pdk_zulkifli' }), null))).fields.pendudukId).toBe(
      'Pilih anggota keluarga Anda sendiri.',
    )
  })
})

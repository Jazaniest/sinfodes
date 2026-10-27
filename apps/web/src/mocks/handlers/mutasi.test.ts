import { describe, expect, it } from 'vitest'
import { GalatApi } from '@/api/galat'
import { ambilKeluarga } from '@/api/keluarga'
import { ambilRingkasanMutasi, catatLahir, catatMeninggal, daftarMutasi } from '@/api/mutasi'
import { ambilPenduduk, ambilRingkasanPenduduk, ambilRiwayatPenduduk } from '@/api/penduduk'
import type { MasukanLahir, MasukanMeninggal } from '@/domain/mutasi/masukan'
import { ambilDb } from '@/mocks/db'
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
  ibuId: 'pdk_siti_rahmah',
  ayahId: 'pdk_syahrial',
  pelapor: 'Syahrial',
  bayi: {
    nama: 'Aisyah Putri', jenisKelamin: 'P', tempatLahir: 'Pelalawan', tanggalLahir: '2026-09-20', jam: '04:15',
    tempatDilahirkan: 'Puskesmas', jenisKelahiran: 'Tunggal', anakKe: 3, penolong: 'Bidan/Perawat', beratGram: 3100, panjangCm: 49,
  },
}

const MENINGGAL: MasukanMeninggal = {
  pendudukId: 'pdk_syahrial', tanggal: '2026-09-23', jam: '21:40', tempat: 'Rumah', sebab: 'Sakit biasa/tua',
  yangMenerangkan: 'Tenaga kesehatan', pelapor: 'Siti Rahmah', penggantiKepalaId: null,
}

describe('GET /mutasi (SPEC §6.6)', () => {
  it('ringkasan bulan berjalan: 3 lahir, 1 meninggal, 2 datang, 4 pindah', async () => {
    masukSebagai(AKUN_UJI.operator)
    expect(await ambilRingkasanMutasi('2026-09')).toEqual({ bulan: '2026-09', lahir: 3, meninggal: 1, pindah: 4, datang: 2 })
  })
  it('daftar per bulan dan jenis, terbaru dulu, beserta nama penduduknya', async () => {
    masukSebagai(AKUN_UJI.operator)
    const bulanIni = await daftarMutasi({ bulan: '2026-09' })
    expect(bulanIni.meta.total).toBe(10)
    const tanggal = bulanIni.data.map((b) => b.mutasi.tanggal)
    expect(tanggal).toEqual([...tanggal].sort().reverse())
    expect(bulanIni.data.every((b) => b.penduduk.length === b.mutasi.pendudukIds.length)).toBe(true)
    expect((await daftarMutasi({ bulan: '2026-09', jenis: 'lahir' })).meta.total).toBe(3)
  })
  it('Kepala Dusun hanya melihat mutasi dusunnya (fokus review 1 dari 2A-1)', async () => {
    masukSebagai(AKUN_UJI.kadus)
    const { data } = await daftarMutasi({ pageSize: 100 })
    const db = ambilDb()
    for (const b of data) {
      expect(b.penduduk.some((p) => db.penduduk.find((x) => x.id === p.id)?.dusunId === 'dsn_ss_2')).toBe(true)
    }
  })
})

describe('POST /mutasi/lahir (SPEC §6.6)', () => {
  it('bayi tanpa NIK masuk ke KK ibunya; tercatat di Buku Mutasi, Riwayat, dan Buku hari ini', async () => {
    masukSebagai(AKUN_UJI.operator)
    const { mutasi, penduduk } = await catatLahir(LAHIR)
    const [bayi] = penduduk
    expect(bayi).toMatchObject({
      nik: null, keluargaId: 'kk_syahrial', hubunganKeluarga: 'Anak', namaIbu: 'Siti Rahmah', namaAyah: 'Syahrial',
      statusDasar: 'Hidup', ktpEl: 'Belum wajib',
    })
    expect(mutasi).toMatchObject({ jenis: 'lahir', tanggal: '2026-09-20', pendudukIds: [bayi.id] })
    expect((await ambilKeluarga('kk_syahrial')).anggota).toHaveLength(5)
    expect((await ambilRingkasanMutasi('2026-09')).lahir).toBe(4)
    expect((await ambilRiwayatPenduduk(bayi.id)).map((e) => e.jenis)).toEqual(['mutasi'])
    expect(ambilDb().aktivitas.at(-1)?.ringkasan).toBe('Kelahiran dicatat · Aisyah Putri')
  })
  it('ibu harus perempuan yang masih hidup', async () => {
    masukSebagai(AKUN_UJI.operator)
    const galat = await galatDari(catatLahir({ ...LAHIR, ibuId: 'pdk_syahrial' }))
    expect(galat.fields.ibuId).toMatch(/perempuan yang masih hidup/)
  })
  it('tanggal lahir setelah hari ini ditolak', async () => {
    masukSebagai(AKUN_UJI.operator)
    const galat = await galatDari(catatLahir({ ...LAHIR, bayi: { ...LAHIR.bayi, tanggalLahir: '2026-09-25' } }))
    expect(galat.fields['bayi.tanggalLahir']).toBe('Tanggal lahir tidak boleh setelah hari ini')
  })
})

describe('POST /mutasi/meninggal (SPEC §6.6)', () => {
  it('kepala keluarga meninggal → pengganti wajib dipilih (fokus review 3)', async () => {
    masukSebagai(AKUN_UJI.operator)
    const galat = await galatDari(catatMeninggal(MENINGGAL))
    expect(galat.fields.penggantiKepalaId).toMatch(/Pilih kepala keluarga pengganti/)
  })
  it('status Meninggal, keluar dari KK, pengganti jadi kepala; jiwa berkurang', async () => {
    masukSebagai(AKUN_UJI.operator)
    await catatMeninggal({ ...MENINGGAL, penggantiKepalaId: 'pdk_siti_rahmah' })
    expect((await ambilPenduduk('pdk_syahrial')).statusDasar).toBe('Meninggal')
    const { keluarga, anggota } = await ambilKeluarga('kk_syahrial')
    expect(keluarga.kepalaKeluargaId).toBe('pdk_siti_rahmah')
    expect(anggota.map((a) => a.id)).not.toContain('pdk_syahrial')
    expect(anggota[0]).toMatchObject({ id: 'pdk_siti_rahmah', hubunganKeluarga: 'Kepala Keluarga' })
    expect((await ambilRingkasanPenduduk()).jiwa).toBe(2811)
  })
  it('dicatat dua kali → ditolak, tidak membuat mutasi ganda (fokus review 2)', async () => {
    masukSebagai(AKUN_UJI.operator)
    await catatMeninggal({ ...MENINGGAL, penggantiKepalaId: 'pdk_siti_rahmah' })
    const jumlah = ambilDb().mutasi.length
    const galat = await galatDari(catatMeninggal({ ...MENINGGAL, penggantiKepalaId: 'pdk_siti_rahmah' }))
    expect(galat.fields.pendudukId).toBe('Syahrial sudah berstatus Meninggal')
    expect(ambilDb().mutasi.length).toBe(jumlah)
  })
  it('Kepala Desa dan Kepala Dusun ditolak (fokus review 1)', async () => {
    for (const akun of [AKUN_UJI.kades, AKUN_UJI.kadus]) {
      masukSebagai(akun)
      expect((await galatDari(catatLahir(LAHIR))).kode).toBe('FORBIDDEN')
      expect((await galatDari(catatMeninggal(MENINGGAL))).kode).toBe('FORBIDDEN')
    }
  })
})

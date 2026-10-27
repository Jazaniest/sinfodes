import { describe, expect, it } from 'vitest'
import { GalatApi } from '@/api/galat'
import { ambilKeluarga, daftarKeluarga, gantiKepala, pecahKeluarga } from '@/api/keluarga'
import { ambilPenduduk, ambilRingkasanPenduduk, ambilRiwayatPenduduk, cariPenduduk } from '@/api/penduduk'
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

const PECAH = { anggotaIds: ['pdk_siti_rahmah', 'pdk_muhammad_alif'], kepalaBaruId: 'pdk_siti_rahmah', dusunId: 'dsn_ss_1', rw: '002', rt: '004' }

describe('POST /keluarga/:id/ganti-kepala (SPEC §6.5)', () => {
  it('kepala baru di urutan pertama; hubungan keduanya berganti dan tercatat di Riwayat', async () => {
    masukSebagai(AKUN_UJI.operator)
    const detail = await gantiKepala('kk_syahrial', { kepalaBaruId: 'pdk_siti_rahmah', hubunganKepalaLama: 'Suami' })
    expect(detail.keluarga.kepalaKeluargaId).toBe('pdk_siti_rahmah')
    expect(detail.anggota[0]).toMatchObject({ id: 'pdk_siti_rahmah', hubunganKeluarga: 'Kepala Keluarga' })
    expect((await ambilPenduduk('pdk_syahrial')).hubunganKeluarga).toBe('Suami')
    const [terbaru] = await ambilRiwayatPenduduk('pdk_syahrial')
    expect(terbaru).toMatchObject({ field: 'hubunganKeluarga', nilaiLama: 'Kepala Keluarga', nilaiBaru: 'Suami' })
    expect(ambilDb().aktivitas.at(-1)).toMatchObject({ jenis: 'keluarga-ganti-kepala', rujukan: { jenis: 'keluarga', id: 'kk_syahrial' } })
  })
  it('kepala baru harus anggota KK ini', async () => {
    masukSebagai(AKUN_UJI.operator)
    const galat = await galatDari(gantiKepala('kk_syahrial', { kepalaBaruId: 'pdk_tidak_ada', hubunganKepalaLama: 'Suami' }))
    expect(galat.fields.kepalaBaruId).toBe('Pilih salah satu anggota KK ini')
  })
})

describe('POST /keluarga/:id/pecah (SPEC §6.5)', () => {
  it('anggota yang keluar membentuk KK baru; KK lama tetap dengan kepalanya', async () => {
    masukSebagai(AKUN_UJI.operator)
    const baru = await pecahKeluarga('kk_syahrial', PECAH)
    expect(baru.keluarga.kepalaKeluargaId).toBe('pdk_siti_rahmah')
    expect(baru.anggota.map((a) => a.id)).toEqual(['pdk_siti_rahmah', 'pdk_muhammad_alif'])
    expect(baru.anggota[0].hubunganKeluarga).toBe('Kepala Keluarga')
    expect(baru.anggota[1].hubunganKeluarga).toBe('Anak')
    expect(baru.anggota.every((a) => a.keluargaId === baru.keluarga.id)).toBe(true)
    expect((await ambilKeluarga('kk_syahrial')).anggota.map((a) => a.id)).toEqual(['pdk_syahrial', 'pdk_nur_aini'])
    expect((await ambilRingkasanPenduduk()).kk).toBe(807)
  })
  it('kepala keluarga tidak ikut dipecah', async () => {
    masukSebagai(AKUN_UJI.operator)
    const galat = await galatDari(pecahKeluarga('kk_syahrial', { ...PECAH, anggotaIds: ['pdk_syahrial', 'pdk_nur_aini'], kepalaBaruId: 'pdk_nur_aini' }))
    expect(galat.fields.anggotaIds).toMatch(/Ganti kepala keluarga lebih dulu/)
  })
  it('kepala baru harus salah satu yang keluar', async () => {
    masukSebagai(AKUN_UJI.operator)
    const galat = await galatDari(pecahKeluarga('kk_syahrial', { ...PECAH, kepalaBaruId: 'pdk_nur_aini' }))
    expect(galat.fields.kepalaBaruId).toMatch(/salah satu anggota yang keluar/)
  })
  it('Kepala Desa dan Kepala Dusun ditolak (fokus review 1)', async () => {
    for (const akun of [AKUN_UJI.kades, AKUN_UJI.kadus]) {
      masukSebagai(akun)
      expect((await galatDari(pecahKeluarga('kk_syahrial', PECAH))).kode).toBe('FORBIDDEN')
      expect((await galatDari(gantiKepala('kk_syahrial', { kepalaBaruId: 'pdk_siti_rahmah', hubunganKepalaLama: 'Suami' }))).kode).toBe(
        'FORBIDDEN',
      )
    }
  })
})

describe('KK tanpa anggota (fokus review 3)', () => {
  it('hilang dari daftar dan hitungan KK, tetapi detail dan nomor KK mantan anggotanya tetap terbaca', async () => {
    masukSebagai(AKUN_UJI.operator)
    const kk = ambilDb().keluarga.find((k) => k.id === 'kk_syahrial')
    if (!kk) throw new Error('KK contoh tidak ada')
    kk.anggotaIds = []
    expect((await ambilRingkasanPenduduk()).kk).toBe(805)
    expect((await daftarKeluarga({ pageSize: 100 })).meta.total).toBe(805)
    expect((await ambilKeluarga('kk_syahrial')).anggota).toEqual([])
    const [siti] = (await cariPenduduk('1405095203918002', {})).data
    expect(siti.nomorKk).toBe('1405092011238004')
  })
})

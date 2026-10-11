import { describe, expect, it } from 'vitest'
import { GalatApi } from '@/api/galat'
import { daftarBalita, daftarPosyandu } from '@/api/kesehatan'
import { catatLahir, catatMeninggal } from '@/api/mutasi'
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
  ibuId: 'pdk_siti_rahmah',
  ayahId: 'pdk_syahrial',
  pelapor: 'Syahrial',
  bayi: {
    nama: 'Aisyah Putri', jenisKelamin: 'P', tempatLahir: 'Pelalawan', tanggalLahir: '2026-09-20', jam: '04:15',
    tempatDilahirkan: 'Puskesmas', jenisKelahiran: 'Tunggal', anakKe: 3, penolong: 'Bidan/Perawat', beratGram: 3100, panjangCm: 49,
  },
}

describe('kesehatan (SPEC §8)', () => {
  it('posyandu: jadwal bulan ini dan berikutnya; jumlah balita seluruh posyandu 211', async () => {
    masukSebagai(AKUN_UJI.operator)
    const { data } = await daftarPosyandu()
    expect(data.map((p) => [p.nama, p.jadwalBulanIni, p.jadwalBerikut])).toEqual([
      ['Posyandu Melati', '2026-09-08', '2026-10-13'],
      ['Posyandu Mawar', '2026-09-09', '2026-10-14'],
      ['Posyandu Kenanga', '2026-09-15', '2026-10-20'],
      ['Posyandu Anggrek', '2026-09-17', '2026-10-15'],
    ])
    expect(data.reduce((n, p) => n + p.jumlahBalita, 0)).toBe(211)
  })
  it('balita: umur dalam bulan, ibu, dan pengukuran; filter posyandu dan status', async () => {
    masukSebagai(AKUN_UJI.operator)
    expect((await daftarBalita({})).meta.total).toBe(211)
    const melati = await daftarBalita({ posyandu: 'psy_ss_1', pageSize: 100 })
    const alif = melati.data.find((b) => b.id === 'pdk_muhammad_alif')
    expect(alif).toMatchObject({ umurBulan: 34, ibu: { id: 'pdk_siti_rahmah', nama: 'Siti Rahmah' }, posyanduId: 'psy_ss_1', status: 'normal' })
    expect(alif?.pengukuran).toHaveLength(12)
    const pendek = await daftarBalita({ status: 'pendek', pageSize: 100 })
    expect(pendek.data.length).toBeGreaterThan(0)
    expect(pendek.data.every((b) => b.status === 'pendek')).toBe(true)
  })
  it('Kepala Dusun II: posyandu dan balita dusunnya saja; Kaur Keuangan tidak berhak (fokus review 1, 4)', async () => {
    masukSebagai(AKUN_UJI.kadus)
    const { data } = await daftarPosyandu()
    expect(data.map((p) => p.nama)).toEqual(['Posyandu Mawar'])
    const balita = await daftarBalita({ pageSize: 100 })
    expect(balita.meta.total).toBe(data[0].jumlahBalita)
    expect(balita.data.every((b) => b.dusunId === 'dsn_ss_2')).toBe(true)
    masukSebagai(AKUN_UJI.kaurKeuangan)
    expect((await galatDari(daftarBalita({}))).kode).toBe('FORBIDDEN')
  })
  it('bayi yang baru dicatat tampil Belum diukur; balita yang meninggal hilang dari daftar dan jumlah (fokus review 5)', async () => {
    masukSebagai(AKUN_UJI.operator)
    const {
      penduduk: [bayi],
    } = await catatLahir(LAHIR)
    const melati = await daftarBalita({ posyandu: 'psy_ss_1', pageSize: 100 })
    expect(melati.data.find((b) => b.id === bayi.id)).toMatchObject({ status: null, pengukuran: [], umurBulan: 0, ibu: { id: 'pdk_siti_rahmah' } })
    const sebelum = (await daftarPosyandu()).data[1].jumlahBalita
    const [korban] = (await daftarBalita({ posyandu: 'psy_ss_2' })).data
    await catatMeninggal({
      pendudukId: korban.id, tanggal: '2026-09-23', jam: '03:10', tempat: 'Rumah', sebab: 'Sakit biasa/tua',
      yangMenerangkan: 'Tenaga kesehatan', pelapor: 'Keluarga', penggantiKepalaId: null,
    })
    expect((await daftarBalita({ pageSize: 100, posyandu: 'psy_ss_2' })).data.some((b) => b.id === korban.id)).toBe(false)
    expect((await daftarPosyandu()).data[1].jumlahBalita).toBe(sebelum - 1)
  })
})

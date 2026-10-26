// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { GalatApi } from '@/api/galat'
import { ambilBeranda } from '@/api/beranda'
import { daftarBalita, daftarPosyandu } from '@/api/kesehatan'
import { ambilModul, ubahModul } from '@/api/modul'
import { ambilLayananPublik } from '@/api/publik'
import { ambilSesi } from '@/api/sesi'
import { ambilBerandaWarga } from '@/api/warga'
import { ambilDb } from '@/mocks/db'
import { AKUN_DESA_BARU_UJI, AKUN_UJI, AKUN_WARGA_UJI, masukSebagai, masukSebagaiWarga, pakaiApiTiruan } from '@/test/api-tiruan'

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

const PESAN_MATI = 'Modul Kesehatan tidak aktif di desa ini.'
const matikan = () => {
  masukSebagai(AKUN_UJI.sekdes)
  return ubahModul({ kesehatan: false })
}

describe('modul desa (SPEC-V0.2 12.3)', () => {
  it('bawaan: Sungai Sialang menyala; Tanjung Lamo mati; desa fiktif rekaman menyala', () => {
    const modul = (desaId: string) => ambilDb().modulDesa.find((m) => m.desaId === desaId)
    expect(modul('desa_sungai_sialang')?.kesehatan).toBe(true)
    expect(modul('desa_tanjung_lamo')?.kesehatan).toBe(false)
    const rekaman = ambilDb().desa.filter((d) => !['desa_sungai_sialang', 'desa_tanjung_lamo'].includes(d.id) && ambilDb().rekamDesa.some((r) => r.desaId === d.id))
    expect(rekaman.length).toBeGreaterThan(30)
    expect(rekaman.every((d) => modul(d.id)?.kesehatan === true)).toBe(true)
    expect(ambilDb().desa.every((d) => modul(d.id) !== undefined)).toBe(true)
  })
  it('GET dan PUT: hanya Sekretaris Desa; peran lain 403 persis', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    expect(await ambilModul()).toEqual({ kesehatan: true })
    for (const akun of [AKUN_UJI.operator, AKUN_UJI.kades, AKUN_UJI.kadus, AKUN_UJI.kaurKeuangan]) {
      masukSebagai(akun)
      expect(await galatDari(ubahModul({ kesehatan: false }))).toMatchObject({
        kode: 'FORBIDDEN', status: 403, message: 'Hanya Sekretaris Desa yang mengatur modul.',
      })
      expect((await galatDari(ambilModul())).status).toBe(403)
    }
    expect(ambilDb().modulDesa.find((m) => m.desaId === 'desa_sungai_sialang')?.kesehatan).toBe(true)
  })
  it('PUT dengan isian salah → 422; PUT mengembalikan keadaan baru', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    expect((await galatDari(ubahModul({ kesehatan: 'ya' } as never))).kode).toBe('VALIDATION')
    expect(await ubahModul({ kesehatan: false })).toEqual({ kesehatan: false })
    expect(await ambilModul()).toEqual({ kesehatan: false })
  })
  it('mati: sesi membawa modul; Kepala Dusun mendapat 403 persis di GET /kesehatan/*', async () => {
    await matikan()
    expect((await ambilSesi()).modul).toEqual({ kesehatan: false })
    masukSebagai(AKUN_UJI.kadus)
    expect((await ambilSesi()).modul).toEqual({ kesehatan: false })
    expect(await galatDari(daftarPosyandu())).toMatchObject({ kode: 'FORBIDDEN', status: 403, message: PESAN_MATI })
    expect(await galatDari(daftarBalita({}))).toMatchObject({ kode: 'FORBIDDEN', status: 403, message: PESAN_MATI })
  })
  it('mati: jadwal posyandu hilang dari Layanan website, Beranda warga, dan Beranda Kepala Dusun; data di db utuh', async () => {
    const jumlahPosyandu = ambilDb().posyandu.length
    const jumlahUkur = ambilDb().pengukuranBalita.length
    await matikan()
    expect((await ambilLayananPublik('sungaisialang')).posyandu).toEqual([])
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    expect((await ambilBerandaWarga()).posyandu).toBeNull()
    masukSebagai(AKUN_UJI.kadus)
    expect((await ambilBeranda()).posyandu).toBeNull()
    expect(ambilDb().posyandu).toHaveLength(jumlahPosyandu)
    expect(ambilDb().pengukuranBalita).toHaveLength(jumlahUkur)
  })
  it('menyalakan lagi mengembalikan semuanya', async () => {
    await matikan()
    masukSebagai(AKUN_UJI.sekdes)
    await ubahModul({ kesehatan: true })
    expect((await ambilLayananPublik('sungaisialang')).posyandu).toHaveLength(4)
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    expect((await ambilBerandaWarga()).posyandu?.nama).toBeTruthy()
    masukSebagai(AKUN_UJI.kadus)
    expect((await ambilBeranda()).posyandu).not.toBeNull()
    expect((await daftarPosyandu()).data.length).toBeGreaterThan(0)
  })
  it('mematikan modul desa tidak memengaruhi desa lain', async () => {
    await matikan()
    expect(ambilDb().modulDesa.filter((m) => m.kesehatan).length).toBeGreaterThan(30)
    masukSebagai(AKUN_DESA_BARU_UJI)
    expect((await ambilSesi()).modul).toEqual({ kesehatan: false })
  })
})

import { describe, expect, it } from 'vitest'
import { GalatApi } from '@/api/galat'
import { ambilDetailDesaKonsol, undangSekdes } from '@/api/konsol'
import { masuk } from '@/api/sesi'
import { ID_SUNGAI_SIALANG, ID_TANJUNG_LAMO } from '@/mocks/data/desa-demo'
import { ambilDb } from '@/mocks/db'
import { AKUN_KONSOL_UJI, masukKonsolSebagai, pakaiApiTiruan } from '@/test/api-tiruan'

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

const SEKDES = { nama: 'Rahmawati', email: 'sekdes@tanjunglamo.desa.id' }
const langkahPengguna = (d: { persiapan: { langkah: string; selesai: boolean }[] }) => d.persiapan.find((l) => l.langkah === 'pengguna')?.selesai

describe('POST /konsol/desa/:id/sekdes (tahap 6C)', () => {
  it('Tanjung Lamo belum punya Sekretaris Desa: Tim mengundangnya; akun langsung aktif dan langkah Tambah pengguna selesai', async () => {
    masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
    const awal = await ambilDetailDesaKonsol(ID_TANJUNG_LAMO)
    expect(awal).toMatchObject({ bisaUndangSekdes: true, kontak: { sekdes: null } })
    expect(langkahPengguna(awal)).toBe(false)
    expect(await undangSekdes(ID_TANJUNG_LAMO, { nama: ' Rahmawati ', email: 'SEKDES@tanjunglamo.desa.id' })).toEqual(SEKDES)
    const sesudah = await ambilDetailDesaKonsol(ID_TANJUNG_LAMO)
    expect(sesudah).toMatchObject({ bisaUndangSekdes: false, kontak: { sekdes: SEKDES } })
    expect(langkahPengguna(sesudah)).toBe(true)
    expect(ambilDb().pengguna.find((p) => p.email === SEKDES.email)).toMatchObject({
      desaId: ID_TANJUNG_LAMO, peran: 'sekdes', jabatan: 'Sekretaris Desa', dusunId: null, aktif: true,
    })
    expect((await masuk(SEKDES.email, 'demo')).sesi.pengguna.peran).toBe('sekdes')
  })
  it('undangan ditolak bila desa sudah punya Sekretaris Desa aktif (fokus review 4)', async () => {
    masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
    await undangSekdes(ID_TANJUNG_LAMO, SEKDES)
    expect(await galatDari(undangSekdes(ID_TANJUNG_LAMO, { nama: 'Lain', email: 'lain@tanjunglamo.desa.id' }))).toMatchObject({
      kode: 'CONFLICT',
      message: 'Desa ini sudah punya Sekretaris Desa aktif: Rahmawati.',
    })
    expect(await galatDari(undangSekdes(ID_SUNGAI_SIALANG, { nama: 'Lain', email: 'lain@sungaisialang.desa.id' }))).toMatchObject({
      kode: 'CONFLICT',
      message: 'Desa ini sudah punya Sekretaris Desa aktif: Hendri Saputra.',
    })
  })
  it('email terpakai ditolak di kolomnya; isian kosong ditandai per kolom (fokus review 4)', async () => {
    masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
    expect(await galatDari(undangSekdes(ID_TANJUNG_LAMO, { nama: 'Rahmawati', email: 'rosmiati@sungaisialang.desa.id' }))).toMatchObject({
      kode: 'CONFLICT',
      fields: { email: 'Email ini sudah dipakai akun lain.' },
    })
    expect(await galatDari(undangSekdes(ID_TANJUNG_LAMO, { nama: '', email: 'bukan-email' }))).toMatchObject({
      kode: 'VALIDATION',
      fields: { nama: 'Nama wajib diisi', email: 'Email belum benar.' },
    })
  })
  it('desa contoh dan desa yang tidak ada ditolak (fokus review 4)', async () => {
    masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
    const contoh = ambilDb().rekamDesa[0].desaId
    expect((await ambilDetailDesaKonsol(contoh)).bisaUndangSekdes).toBe(false)
    expect(await galatDari(undangSekdes(contoh, SEKDES))).toMatchObject({ kode: 'CONFLICT', message: 'Akun desa contoh tidak bisa diubah di demo.' })
    expect((await galatDari(undangSekdes('desa_tidak_ada', SEKDES))).kode).toBe('NOT_FOUND')
    expect(ambilDb().pengguna.some((p) => p.email === SEKDES.email)).toBe(false)
  })
})

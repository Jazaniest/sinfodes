import { galatSchema } from '@sinfodes/kontrak/api'
import { ID_SUNGAI_SIALANG } from '@sinfodes/demo/data/desa-demo'
import { bangkitkanDb } from '@sinfodes/demo/generator'
import type { DbDemo } from '@sinfodes/demo/tipe-db'
import { SEKARANG_UJI } from '@sinfodes/demo/uji-akun'
import { detailKeluargaSchema, type DetailKeluarga } from '@sinfodes/kontrak/keluarga/schema'
import { entriRiwayatSchema } from '@sinfodes/kontrak/penduduk/riwayat'
import { ringkasanPendudukSchema } from '@sinfodes/kontrak/penduduk/schema'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buatDbUji, penyandiUji, type DbUji } from '../../../test/basisdata'
import { ambil, kirimJson, masukLewatRute, rakitApp } from '../../../test/rakit-app'

const SS = 'http://sungaisialang.sinfodes.localhost'
const TL = 'http://tanjunglamo.sinfodes.localhost'
const PESAN_TIDAK_BERHAK = 'Peran Anda tidak berhak mengubah data kependudukan.'

let uji: DbUji
let dunia: DbDemo
let app: ReturnType<typeof rakitApp>['app']
let kuki: string
beforeAll(async () => {
  uji = await buatDbUji()
  dunia = bangkitkanDb(SEKARANG_UJI)
  app = rakitApp({ klien: uji.klien, penyandi: await penyandiUji(uji.sqlMigrasi) }).app
  kuki = (await masukLewatRute(app, SS, 'rosmiati@sungaisialang.desa.id', 'demo', '10.6.0.1')).kuki as string
})
afterAll(async () => {
  await uji?.tutup()
})

const ganti = async (id: string, badan: unknown, kukiPakai: string | null = kuki, basis = SS): Promise<Response> =>
  kirimJson(app, basis, `/api/v1/keluarga/${id}/ganti-kepala`, badan, kukiPakai)
const pecah = async (id: string, badan: unknown, kukiPakai: string | null = kuki, basis = SS): Promise<Response> =>
  kirimJson(app, basis, `/api/v1/keluarga/${id}/pecah`, badan, kukiPakai)
const galat = async (r: Response) => galatSchema.parse(await r.json()).error
const detail = async (r: Response): Promise<DetailKeluarga> => detailKeluargaSchema.parse(await r.json())
const kkTotal = async (): Promise<number> => ringkasanPendudukSchema.parse(await (await ambil(app, `${SS}/api/v1/penduduk/ringkasan`, kuki)).json()).kk
const riwayatDari = async (id: string) => entriRiwayatSchema.array().parse(await (await ambil(app, `${SS}/api/v1/penduduk/${id}/riwayat`, kuki)).json())
const hitung = async (tabel: string, kondisi = 'true'): Promise<number> => Number((await uji.sqlMigrasi.unsafe(`select count(*)::int as n from ${tabel} where ${kondisi}`))[0].n)

// KK Syahrial dipakai uji ganti kepala; uji pecah memakai KK lain yang berisi minimal tiga anggota, supaya keduanya tak saling mengganggu.
const SYAHRIAL = 'pdk_syahrial'
const SITI = 'pdk_siti_rahmah'
const kandidat = (): DbDemo['keluarga'] => dunia.keluarga.filter((k) => k.desaId === ID_SUNGAI_SIALANG && k.id !== 'kk_syahrial' && k.anggotaIds.length >= 5)
/** KK ke-n yang berisi minimal lima anggota; tiap uji memakai KK sendiri supaya urutan uji tidak saling memengaruhi. */
const kkUji = (n: number): NonNullable<DbDemo['keluarga'][number]> => kandidat()[n]
const kkPecah = () => kkUji(0)
const masukanPecah = (ubah: Record<string, unknown> = {}) => {
  const kk = kkPecah()
  return { anggotaIds: [kk.anggotaIds[1], kk.anggotaIds[2]], kepalaBaruId: kk.anggotaIds[1], dusunId: kk.dusunId, rw: kk.rw, rt: kk.rt, ...ubah }
}

describe('POST /keluarga/:id/ganti-kepala (SPEC §6.5)', () => {
  it('kepala baru di urutan pertama; hubungan keduanya berganti dan tercatat di Riwayat dan aktivitas', async () => {
    const r = await ganti('kk_syahrial', { kepalaBaruId: SITI, hubunganKepalaLama: 'Suami' })
    expect(r.status).toBe(200)
    const d = await detail(r)
    expect(d.keluarga.kepalaKeluargaId).toBe(SITI)
    expect(d.anggota[0]).toMatchObject({ id: SITI, hubunganKeluarga: 'Kepala Keluarga' })
    expect(d.anggota.map((a) => a.nama)).toEqual(['Siti Rahmah', 'Syahrial', 'Nur Aini', 'Muhammad Alif'])
    expect(d.keluarga.anggotaIds).toEqual(d.anggota.map((a) => a.id))
    expect(d.anggota.find((a) => a.id === SYAHRIAL)?.hubunganKeluarga).toBe('Suami')

    const [lama] = await riwayatDari(SYAHRIAL)
    expect(lama).toMatchObject({ jenis: 'ubah', field: 'hubunganKeluarga', nilaiLama: 'Kepala Keluarga', nilaiBaru: 'Suami', oleh: { id: 'pgn_rosmiati', nama: 'Rosmiati' } })
    const [baru] = await riwayatDari(SITI)
    expect(baru).toMatchObject({ jenis: 'ubah', field: 'hubunganKeluarga', nilaiLama: 'Istri', nilaiBaru: 'Kepala Keluarga' })
    const [kk] = await uji.sqlMigrasi`select kepala_keluarga_id from keluarga where id = 'kk_syahrial'`
    expect(kk.kepala_keluarga_id).toBe(SITI)
    const a = await uji.sqlMigrasi`select ringkasan, dusun_id, oleh_id, rujukan_jenis, rujukan_id from aktivitas where jenis = 'keluarga-ganti-kepala' and rujukan_id = 'kk_syahrial' and waktu = ${SEKARANG_UJI}`
    expect(a).toHaveLength(1)
    expect(a[0]).toMatchObject({ ringkasan: 'Kepala keluarga diganti · KK Siti Rahmah', oleh_id: 'pgn_rosmiati', rujukan_jenis: 'keluarga' })
    const diubah = await uji.sqlMigrasi`select diubah_pada from penduduk where id in (${SYAHRIAL}, ${SITI})`
    for (const b of diubah) expect((b.diubah_pada as Date).getTime()).toBe(SEKARANG_UJI.getTime())
  })

  it('kepala baru harus anggota Hidup KK ini dan bukan kepala saat ini (fokus 7)', async () => {
    const bukanAnggota = await ganti('kk_syahrial', { kepalaBaruId: 'pdk_tidak_ada', hubunganKepalaLama: 'Suami' })
    expect(bukanAnggota.status).toBe(422)
    expect((await galat(bukanAnggota)).fields?.kepalaBaruId).toBe('Pilih salah satu anggota KK ini')
    expect((await galat(await ganti('kk_syahrial', { kepalaBaruId: SITI, hubunganKepalaLama: 'Suami' }))).fields?.kepalaBaruId).toBe('Penduduk ini sudah menjadi kepala keluarga')

    const nur = dunia.keluarga.find((k) => k.id === 'kk_syahrial')?.anggotaIds[2] as string
    await uji.sqlMigrasi`update penduduk set status_dasar = 'Pindah' where id = ${nur}`
    try {
      expect((await galat(await ganti('kk_syahrial', { kepalaBaruId: nur, hubunganKepalaLama: 'Suami' }))).fields?.kepalaBaruId).toBe('Pilih salah satu anggota KK ini')
    } finally {
      await uji.sqlMigrasi`update penduduk set status_dasar = 'Hidup' where id = ${nur}`
    }
    const dariLain = kkPecah().anggotaIds[1]
    expect((await galat(await ganti('kk_syahrial', { kepalaBaruId: dariLain, hubunganKepalaLama: 'Suami' }))).fields?.kepalaBaruId).toBe('Pilih salah satu anggota KK ini')
  })

  it('isian tidak valid 422, KK tak dikenal 404, desa lain 404', async () => {
    expect((await ganti('kk_syahrial', { kepalaBaruId: SYAHRIAL, hubunganKepalaLama: 'Kepala Keluarga' })).status).toBe(422)
    expect((await ganti('kk_syahrial', {})).status).toBe(422)
    const tidakAda = await ganti('kk_tidak_ada', { kepalaBaruId: SITI, hubunganKepalaLama: 'Suami' })
    expect(tidakAda.status).toBe(404)
    expect((await galat(tidakAda)).message).toBe('Data keluarga tidak ditemukan.')
    const yusri = (await masukLewatRute(app, TL, 'operator@tanjunglamo.desa.id', 'demo', '10.6.0.2')).kuki as string
    expect((await ganti('kk_syahrial', { kepalaBaruId: SYAHRIAL, hubunganKepalaLama: 'Suami' }, yusri, TL)).status).toBe(404)
  })
})

describe('POST /keluarga/:id/pecah (SPEC §6.5)', () => {
  it('anggota yang keluar membentuk KK baru; KK lama tetap dengan kepalanya', async () => {
    const kk = kkPecah()
    const [kepalaBaru, anak] = [kk.anggotaIds[1], kk.anggotaIds[2]]
    const kkSebelum = await kkTotal()
    const r = await pecah(kk.id, masukanPecah({ hubungan: { [anak]: 'Anak' } }))
    expect(r.status).toBe(201)
    const baru = await detail(r)
    expect(baru.keluarga.kepalaKeluargaId).toBe(kepalaBaru)
    expect(baru.keluarga.nomorKk).toMatch(/^140509240926[89]\d{3}$/)
    expect(baru.keluarga.id).not.toBe(kk.id)
    expect(baru.keluarga).toMatchObject({ dusunId: kk.dusunId, rw: kk.rw, rt: kk.rt, tanggalTerbit: '2026-09-24' })
    expect(baru.anggota.map((a) => a.id)).toEqual([kepalaBaru, anak])
    expect(baru.anggota[0].hubunganKeluarga).toBe('Kepala Keluarga')
    expect(baru.anggota[1].hubunganKeluarga).toBe('Anak')
    expect(baru.anggota.every((a) => a.keluargaId === baru.keluarga.id)).toBe(true)

    const lama = detailKeluargaSchema.parse(await (await ambil(app, `${SS}/api/v1/keluarga/${kk.id}`, kuki)).json())
    expect(lama.anggota.map((a) => a.id)).toEqual(kk.anggotaIds.filter((id) => ![kepalaBaru, anak].includes(id)))
    expect(lama.keluarga.kepalaKeluargaId).toBe(kk.kepalaKeluargaId)
    expect(await kkTotal()).toBe(kkSebelum + 1)

    const urutan = await uji.sqlMigrasi`select id, urutan_kk from penduduk where keluarga_id = ${baru.keluarga.id} order by urutan_kk`
    expect(urutan.map((b) => [b.id, b.urutan_kk])).toEqual([[kepalaBaru, 0], [anak, 1]])
    const a = await uji.sqlMigrasi`select ringkasan, dusun_id, rujukan_jenis, rujukan_id from aktivitas where jenis = 'keluarga-pecah' and rujukan_id = ${baru.keluarga.id}`
    expect(a).toHaveLength(1)
    expect(a[0].ringkasan).toMatch(/^KK dipecah · .+ \(2 orang\) membentuk KK baru$/)
    expect(a[0]).toMatchObject({ dusun_id: kk.dusunId, rujukan_jenis: 'keluarga' })
    // Hubungan kepala baru berubah, sehingga tercatat di Riwayat-nya.
    const riwayat = await riwayatDari(kepalaBaru)
    expect(riwayat.some((e) => e.jenis === 'ubah' && e.field === 'hubunganKeluarga' && e.nilaiBaru === 'Kepala Keluarga' && e.waktu.startsWith('2026-09-24'))).toBe(true)
  })

  it('penolakan: kepala lama tidak ikut, anggota harus anggota KK ini, kepala baru dari yang keluar, wilayah sah, minimal satu anggota', async () => {
    const kk = kkUji(1)
    const dasar = { anggotaIds: [kk.anggotaIds[1]], kepalaBaruId: kk.anggotaIds[1], dusunId: kk.dusunId, rw: kk.rw, rt: kk.rt }
    const kepalaIkut = await pecah(kk.id, { ...dasar, anggotaIds: [kk.kepalaKeluargaId, kk.anggotaIds[2]], kepalaBaruId: kk.anggotaIds[2] })
    expect(kepalaIkut.status).toBe(422)
    expect((await galat(kepalaIkut)).fields?.anggotaIds).toMatch(/Ganti kepala keluarga lebih dulu/)
    expect((await galat(await pecah(kk.id, { ...dasar, anggotaIds: [kkPecah().anggotaIds[1]], kepalaBaruId: kkPecah().anggotaIds[1] }))).fields?.anggotaIds).toBe('Anggota yang dipilih harus anggota KK ini')
    expect((await galat(await pecah(kk.id, { ...dasar, kepalaBaruId: kk.anggotaIds[2] }))).fields?.kepalaBaruId).toMatch(/salah satu anggota yang keluar/)
    expect((await galat(await pecah(kk.id, { ...dasar, dusunId: kk.dusunId, rw: '009', rt: '999' }))).fields?.dusunId).toBe('Wilayah tidak dikenal')
    expect((await galat(await pecah(kk.id, { ...dasar, anggotaIds: [] }))).fields?.anggotaIds).toBe('Pilih minimal satu anggota')
    expect((await pecah('kk_tidak_ada', dasar)).status).toBe(404)
  })

  it('Kepala Desa dan Kepala Dusun ditolak untuk ganti kepala dan pecah (fokus 4)', async () => {
    for (const [i, email] of ['kades@sungaisialang.desa.id', 'sukardi@sungaisialang.desa.id'].entries()) {
      const k = (await masukLewatRute(app, SS, email, 'demo', `10.6.1.${i}`)).kuki as string
      for (const r of [await pecah('kk_syahrial', masukanPecah(), k), await ganti('kk_syahrial', { kepalaBaruId: SITI, hubunganKepalaLama: 'Suami' }, k)]) {
        expect(r.status, email).toBe(403)
        expect((await galat(r)).message).toBe(PESAN_TIDAK_BERHAK)
      }
    }
    expect((await pecah('kk_syahrial', masukanPecah(), null)).status).toBe(401)
  })

  it('dua pecah serentak pada anggota yang sama: satu menang, satu ditolak karena anggota sudah pindah (kunci baris KK, fokus 1)', async () => {
    const kk = kkUji(2)
    const badan = { anggotaIds: [kk.anggotaIds[1]], kepalaBaruId: kk.anggotaIds[1], dusunId: kk.dusunId, rw: kk.rw, rt: kk.rt }
    const kkSebelum = await hitung('keluarga')
    const [a, b] = await Promise.all([pecah(kk.id, badan), pecah(kk.id, badan)])
    expect([a.status, b.status].sort()).toEqual([201, 422])
    expect(await hitung('keluarga')).toBe(kkSebelum + 1)
  })

  it('kunci baris KK benar-benar menahan pecah sampai kunci dilepas (bukti deterministik, fokus 1)', async () => {
    const kk = kkUji(3)
    const badan = { anggotaIds: [kk.anggotaIds[2]], kepalaBaruId: kk.anggotaIds[2], dusunId: kk.dusunId, rw: kk.rw, rt: kk.rt }
    let selesai = false
    let hasil: Promise<Response> | undefined
    await uji.sqlMigrasi.begin(async (tx) => {
      await tx`select id from keluarga where id = ${kk.id} for no key update`
      hasil = pecah(kk.id, badan).then((r) => {
        selesai = true
        return r
      })
      await new Promise((r) => setTimeout(r, 500))
      expect(selesai).toBe(false)
    })
    expect((await hasil)?.status).toBe(201)
  })

  it('kegagalan di tengah penulisan membatalkan semuanya: tidak ada KK baru dan tidak ada anggota yang pindah (fokus 6)', async () => {
    const kk = kkUji(4)
    const badan = { anggotaIds: [kk.anggotaIds[3]], kepalaBaruId: kk.anggotaIds[3], dusunId: kk.dusunId, rw: kk.rw, rt: kk.rt }
    await uji.sqlMigrasi.unsafe(`create function uji_gagal_aktivitas2() returns trigger language plpgsql as $$ begin raise exception 'uji gagal'; end $$`)
    await uji.sqlMigrasi.unsafe('grant execute on function uji_gagal_aktivitas2() to public')
    await uji.sqlMigrasi.unsafe('create trigger uji_gagal2 before insert on aktivitas for each row execute function uji_gagal_aktivitas2()')
    const kkSebelum = await hitung('keluarga')
    const riwayatSebelum = await hitung('riwayat_penduduk')
    try {
      expect((await pecah(kk.id, badan)).status).toBe(500)
      expect((await ganti(kk.id, { kepalaBaruId: kk.anggotaIds[1], hubunganKepalaLama: 'Orang Tua' })).status).toBe(500)
    } finally {
      await uji.sqlMigrasi.unsafe('drop trigger uji_gagal2 on aktivitas')
      await uji.sqlMigrasi.unsafe('drop function uji_gagal_aktivitas2()')
    }
    expect(await hitung('keluarga')).toBe(kkSebelum)
    expect(await hitung('riwayat_penduduk')).toBe(riwayatSebelum)
    const [b] = await uji.sqlMigrasi`select keluarga_id from penduduk where id = ${kk.anggotaIds[3]}`
    expect(b.keluarga_id).toBe(kk.id)
    const [k] = await uji.sqlMigrasi`select kepala_keluarga_id from keluarga where id = ${kk.id}`
    expect(k.kepala_keluarga_id).toBe(kk.kepalaKeluargaId)
  })
})

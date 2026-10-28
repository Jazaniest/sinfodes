import { ID_SUNGAI_SIALANG } from '@sinfodes/demo/data/desa-demo'
import { bangkitkanDb } from '@sinfodes/demo/generator'
import type { DbDemo } from '@sinfodes/demo/tipe-db'
import { SEKARANG_UJI } from '@sinfodes/demo/uji-akun'
import { daftarSchema, galatSchema } from '@sinfodes/kontrak/api'
import { formatTanggal, waktuIsoWib } from '@sinfodes/kontrak/format/tanggal'
import { barisKeluargaSchema, detailKeluargaSchema } from '@sinfodes/kontrak/keluarga/schema'
import { ringkasanMutasiSchema } from '@sinfodes/kontrak/mutasi/buku'
import { hasilMutasiSchema, type AnggotaDatang, type MasukanDatang, type MasukanPindah } from '@sinfodes/kontrak/mutasi/masukan'
import { buatNik, periksaNik } from '@sinfodes/kontrak/penduduk/nik'
import { entriRiwayatSchema } from '@sinfodes/kontrak/penduduk/riwayat'
import { barisPendudukSchema, pendudukSchema, ringkasanPendudukSchema } from '@sinfodes/kontrak/penduduk/schema'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buatDbUji, penyandiUji, type DbUji } from '../../../test/basisdata'
import { ambil, kirimJson, masukLewatRute, rakitApp } from '../../../test/rakit-app'
import type { EfekSilang } from './efek-silang'

const SS = 'http://sungaisialang.sinfodes.localhost'
const PESAN_UBAH = 'Peran Anda tidak berhak mengubah data kependudukan.'

let uji: DbUji
let dunia: DbDemo
let app: ReturnType<typeof rakitApp>['app']
let kuki: Record<'operator' | 'kades' | 'kadus' | 'kaur', string>
const efek = {
  panggilan: [] as { ids: readonly string[]; alasan: string; sejak: string }[],
  gagal: false,
  async tandaiPenerimaDitinjau(_db: unknown, ids: readonly string[], alasan: string, sejak: string): Promise<void> {
    if (efek.gagal) throw new Error('efek silang gagal (uji)')
    efek.panggilan.push({ ids, alasan, sejak })
  },
}
beforeAll(async () => {
  uji = await buatDbUji()
  dunia = bangkitkanDb(SEKARANG_UJI)
  app = rakitApp({ klien: uji.klien, penyandi: await penyandiUji(uji.sqlMigrasi), efekSilang: efek as unknown as EfekSilang }).app
  const masuk = async (email: string, ip: string) => (await masukLewatRute(app, SS, email, 'demo', ip)).kuki as string
  kuki = {
    operator: await masuk('rosmiati@sungaisialang.desa.id', '10.2.0.1'),
    kades: await masuk('kades@sungaisialang.desa.id', '10.2.0.2'),
    kadus: await masuk('sukardi@sungaisialang.desa.id', '10.2.0.3'),
    kaur: await masuk('nurhayati@sungaisialang.desa.id', '10.2.0.4'),
  }
})
afterAll(async () => {
  await uji?.tutup()
})

const pindah = async (badan: unknown, k: string | null = kuki.operator): Promise<Response> => kirimJson(app, SS, '/api/v1/mutasi/pindah', badan, k)
const datang = async (badan: unknown, k: string | null = kuki.operator): Promise<Response> => kirimJson(app, SS, '/api/v1/mutasi/datang', badan, k)
const galat = async (r: Response) => galatSchema.parse(await r.json()).error
const hasil = async (r: Response) => hasilMutasiSchema.parse(await r.json())
const detailKk = async (id: string) => detailKeluargaSchema.parse(await (await ambil(app, `${SS}/api/v1/keluarga/${id}`, kuki.operator)).json())
const riwayatDari = async (id: string) => entriRiwayatSchema.array().parse(await (await ambil(app, `${SS}/api/v1/penduduk/${id}/riwayat`, kuki.operator)).json())
const ringkasanPenduduk = async () => ringkasanPendudukSchema.parse(await (await ambil(app, `${SS}/api/v1/penduduk/ringkasan`, kuki.operator)).json())
const ringkasanBulan = async () => ringkasanMutasiSchema.parse(await (await ambil(app, `${SS}/api/v1/mutasi/ringkasan?bulan=2026-09`, kuki.operator)).json())
const hitung = async (tabel: string, kondisi = 'true'): Promise<number> => Number((await uji.sqlMigrasi.unsafe(`select count(*)::int as n from ${tabel} where ${kondisi}`))[0].n)
const tunggu = (ms: number) => new Promise((r) => setTimeout(r, ms))
const orangDari = (id: string) => dunia.penduduk.find((p) => p.id === id) as NonNullable<DbDemo['penduduk'][number]>
const kkUji = (n: number, min = 4): NonNullable<DbDemo['keluarga'][number]> =>
  dunia.keluarga.filter((k) => k.desaId === ID_SUNGAI_SIALANG && !['kk_syahrial', 'kk_zulkifli'].includes(k.id) && k.anggotaIds.length >= min)[n]

const TUJUAN = { provinsi: 'Riau', kabupaten: 'Kota Pekanbaru', kecamatan: 'Tampan', desa: 'Simpang Baru', alamat: 'Jl. Garuda Sakti' }
const PINDAH: MasukanPindah = { pendudukIds: ['pdk_nur_aini'], tanggal: '2026-09-22', tujuan: TUJUAN, alasan: 'Pendidikan', penggantiKepalaId: null }

let urutNik = 9100
/** NIK sah yang belum dipakai uji lain; nomor urut naik terus supaya tiap uji mendapat NIK sendiri. */
const nikBaru = (tanggalLahir = '1988-05-12', jenisKelamin: 'L' | 'P' = 'L'): string => buatNik({ kodeWilayah: '331001', tanggalLahir, jenisKelamin, nomorUrut: urutNik++ })
function anggota(ubah: Partial<AnggotaDatang> = {}): AnggotaDatang {
  return {
    nik: nikBaru(), nama: 'Sutrisno', jenisKelamin: 'L', golonganDarah: 'Tidak Tahu', agama: 'Islam', kewarganegaraan: 'WNI', tempatLahir: 'Klaten',
    tanggalLahir: '1988-05-12', nomorAktaLahir: null, hubunganKeluarga: 'Kepala Keluarga', namaAyah: '', namaIbu: '', pendidikan: 'SLTA/Sederajat',
    pekerjaan: 'Wiraswasta', statusPerkawinan: 'Kawin Tercatat', ktpEl: 'Sudah rekam', telepon: null, catatan: null, ...ubah,
  }
}
const suparmi = (ubah: Partial<AnggotaDatang> = {}) =>
  anggota({ nik: nikBaru('1990-07-03', 'P'), nama: 'Suparmi', jenisKelamin: 'P', tanggalLahir: '1990-07-03', hubunganKeluarga: 'Istri', pekerjaan: 'Mengurus Rumah Tangga', telepon: '081377712345', ...ubah })
const datangBaru = (ubah: Partial<MasukanDatang> = {}): MasukanDatang => ({
  nomorSkpwni: '3310/SKPWNI/2026/0042', asal: { provinsi: 'Jawa Tengah', kabupaten: 'Klaten', kecamatan: 'Wedi', desa: 'Pandes', alamat: '' }, tanggal: '2026-09-22',
  keluarga: { jenis: 'baru', dusunId: 'dsn_ss_3', rw: '005', rt: '012' }, statusPenduduk: 'Tetap', anggota: [anggota(), suparmi()], ...ubah,
})

describe('POST /mutasi/pindah (SPEC-V0.2 §6.6)', () => {
  it('satu anggota pindah: status Pindah, keluar dari KK; tercatat di mutasi, aktivitas, dan efek silang', async () => {
    efek.panggilan.length = 0
    const jiwa = (await ringkasanPenduduk()).jiwa
    const r = await pindah(PINDAH)
    expect(r.status).toBe(201)
    const { mutasi, penduduk } = await hasil(r)
    expect(penduduk).toHaveLength(1)
    expect(penduduk[0]).toMatchObject({ id: 'pdk_nur_aini', statusDasar: 'Pindah', diubahPada: waktuIsoWib(SEKARANG_UJI) })
    expect(mutasi).toMatchObject({
      jenis: 'pindah', tanggal: '2026-09-22', pendudukIds: ['pdk_nur_aini'], dicatatOleh: { id: 'pgn_rosmiati', nama: 'Rosmiati' }, rincian: { tujuan: TUJUAN, alasan: 'Pendidikan' },
    })
    expect(pendudukSchema.parse(await (await ambil(app, `${SS}/api/v1/penduduk/pdk_nur_aini`, kuki.operator)).json()).statusDasar).toBe('Pindah')
    expect((await detailKk('kk_syahrial')).anggota).toHaveLength(3)
    expect((await ringkasanPenduduk()).jiwa).toBe(jiwa - 1)
    expect((await ringkasanBulan()).pindah).toBe(5)
    const akt = await uji.sqlMigrasi`select jenis, ringkasan, rujukan_id from aktivitas where rujukan_id = 'pdk_nur_aini' and jenis = 'mutasi-pindah'`
    expect(akt[0]).toMatchObject({ ringkasan: 'Pindah keluar dicatat · Nur Aini ke Kota Pekanbaru' })
    expect(efek.panggilan).toEqual([{ ids: ['pdk_nur_aini'], alasan: `Penerima pindah keluar desa pada ${formatTanggal('2026-09-22')}`, sejak: waktuIsoWib(SEKARANG_UJI) }])
    expect(await riwayatDari('pdk_nur_aini')).toContainEqual(expect.objectContaining({ jenis: 'mutasi', id: mutasi.id, mutasi: 'pindah', tanggal: '2026-09-22' }))
  })

  it('seluruh anggota KK pindah: KK hilang dari daftar dan hitungan, detail tetap; ringkasan aktivitas menyebut jumlah orang', async () => {
    const kk = kkUji(0)
    const kkSebelum = (await ringkasanPenduduk()).kk
    const r = await pindah({ ...PINDAH, pendudukIds: kk.anggotaIds })
    expect(r.status).toBe(201)
    const { mutasi, penduduk } = await hasil(r)
    expect(mutasi.pendudukIds).toEqual(kk.anggotaIds)
    expect(penduduk.map((p) => p.id)).toEqual(kk.anggotaIds)
    expect(penduduk.every((p) => p.statusDasar === 'Pindah')).toBe(true)
    expect((await ringkasanPenduduk()).kk).toBe(kkSebelum - 1)
    const daftar = daftarSchema(barisKeluargaSchema).parse(await (await ambil(app, `${SS}/api/v1/keluarga?pageSize=100`, kuki.operator)).json())
    expect(daftar.meta.total).toBe(kkSebelum - 1)
    const d = await detailKk(kk.id)
    expect(d.anggota).toEqual([])
    expect(d.keluarga.kepalaKeluargaId).toBe(kk.kepalaKeluargaId)
    const akt = await uji.sqlMigrasi`select ringkasan from aktivitas where rujukan_id = ${kk.anggotaIds[0]} and jenis = 'mutasi-pindah'`
    expect(akt[0].ringkasan).toBe(`Pindah keluar dicatat · ${orangDari(kk.anggotaIds[0]).nama} (${kk.anggotaIds.length} orang) ke Kota Pekanbaru`)
    expect(await hitung('mutasi_penduduk', `mutasi_id = '${mutasi.id}'`)).toBe(kk.anggotaIds.length)
  })

  it('kepala keluarga pindah: pengganti wajib dari yang tinggal; pengganti menjadi kepala di urutan pertama', async () => {
    const kk = kkUji(1)
    const kepala = kk.kepalaKeluargaId
    const lain = kk.anggotaIds.filter((id) => id !== kepala)
    const tanpa = await pindah({ ...PINDAH, pendudukIds: [kepala] })
    expect(tanpa.status).toBe(422)
    expect((await galat(tanpa)).fields?.penggantiKepalaId).toBe('Pilih kepala keluarga pengganti dari anggota yang tetap tinggal')
    const asing = await pindah({ ...PINDAH, pendudukIds: [kepala], penggantiKepalaId: kkUji(2).anggotaIds[0] })
    expect((await galat(asing)).fields?.penggantiKepalaId).toBe('Pengganti harus anggota KK yang tetap tinggal')
    expect(orangDari(kepala).statusDasar).toBe('Hidup')
    const r = await pindah({ ...PINDAH, pendudukIds: [kepala], penggantiKepalaId: lain[1] })
    expect(r.status).toBe(201)
    const d = await detailKk(kk.id)
    expect(d.keluarga.kepalaKeluargaId).toBe(lain[1])
    expect(d.anggota[0]).toMatchObject({ id: lain[1], hubunganKeluarga: 'Kepala Keluarga' })
    expect(d.anggota.map((a) => a.id)).toEqual([lain[1], ...lain.filter((id) => id !== lain[1])])
    expect(await riwayatDari(lain[1])).toContainEqual(expect.objectContaining({ jenis: 'ubah', field: 'hubunganKeluarga', nilaiBaru: 'Kepala Keluarga' }))
  })

  it('penduduk dari KK berbeda tidak bisa pindah bersama; tak dikenal, sudah Meninggal, dan tanggal masa depan ditolak', async () => {
    const lain = dunia.penduduk.find((p) => p.statusDasar === 'Hidup' && p.desaId === ID_SUNGAI_SIALANG && p.keluargaId !== 'kk_syahrial' && p.dusunId === 'dsn_ss_1' && !kkUji(0).anggotaIds.includes(p.id)) as NonNullable<DbDemo['penduduk'][number]>
    const lintas = await pindah({ ...PINDAH, pendudukIds: ['pdk_muhammad_alif', lain.id] })
    expect(lintas.status).toBe(422)
    expect((await galat(lintas)).fields?.pendudukIds).toBe('Penduduk yang pindah bersama harus dari KK yang sama')
    expect((await galat(await pindah({ ...PINDAH, pendudukIds: ['pdk_tidak_ada'] }))).fields?.pendudukIds).toBe('Penduduk tidak ditemukan')
    const almarhum = dunia.penduduk.find((p) => p.statusDasar === 'Meninggal' && p.desaId === ID_SUNGAI_SIALANG) as NonNullable<DbDemo['penduduk'][number]>
    expect((await galat(await pindah({ ...PINDAH, pendudukIds: [almarhum.id] }))).fields?.pendudukIds).toBe(`${almarhum.nama} sudah berstatus Meninggal`)
    const besok = await pindah({ ...PINDAH, pendudukIds: ['pdk_muhammad_alif'], tanggal: '2026-09-25' })
    expect(besok.status).toBe(422)
    expect((await galat(besok)).fields?.tanggal).toBe('Tanggal pindah tidak boleh setelah hari ini')
    expect(orangDari('pdk_muhammad_alif').statusDasar).toBe('Hidup')
    expect((await pindah({ ...PINDAH, pendudukIds: [] })).status).toBe(422)
  })

  it('id kembar dalam isian dianggap satu orang', async () => {
    const kk = kkUji(3)
    const biasa = kk.anggotaIds.find((id) => id !== kk.kepalaKeluargaId) as string
    const { mutasi, penduduk } = await hasil(await pindah({ ...PINDAH, pendudukIds: [biasa, biasa] }))
    expect(mutasi.pendudukIds).toEqual([biasa])
    expect(penduduk).toHaveLength(1)
  })

  it('dua pencatatan serentak untuk orang yang sama: satu 201, satu 422, satu mutasi (fokus 1)', async () => {
    const kk = kkUji(4)
    const biasa = kk.anggotaIds.find((id) => id !== kk.kepalaKeluargaId) as string
    const sebelum = await hitung('mutasi')
    const [a, b] = await Promise.all([pindah({ ...PINDAH, pendudukIds: [biasa] }), pindah({ ...PINDAH, pendudukIds: [biasa] })])
    expect([a.status, b.status].sort()).toEqual([201, 422])
    expect(await hitung('mutasi')).toBe(sebelum + 1)
  })

  it('status dibaca SESUDAH kunci KK didapat (bukti deterministik, fokus 1)', async () => {
    const kk = kkUji(5)
    const biasa = kk.anggotaIds.find((id) => id !== kk.kepalaKeluargaId) as string
    let selesai = false
    let jawaban: Promise<Response> | undefined
    await uji.sqlMigrasi.begin(async (tx) => {
      await tx`select id from keluarga where id = ${kk.id} for no key update`
      await tx`update penduduk set status_dasar = 'Pindah' where id = ${biasa}`
      jawaban = pindah({ ...PINDAH, pendudukIds: [biasa] }).then((r) => {
        selesai = true
        return r
      })
      await tunggu(500)
      expect(selesai).toBe(false)
    })
    expect((await jawaban)?.status).toBe(422)
    expect(await hitung('mutasi_penduduk', `penduduk_id = '${biasa}'`)).toBe(0)
    await uji.sqlMigrasi`update penduduk set status_dasar = 'Hidup' where id = ${biasa}`
  })

  it('efek silang yang gagal membatalkan status, mutasi, dan pergantian kepala (fokus 6)', async () => {
    const kk = kkUji(6)
    const sebelum = [await hitung('mutasi'), await hitung('riwayat_penduduk'), await hitung('aktivitas')]
    efek.gagal = true
    try {
      expect((await pindah({ ...PINDAH, pendudukIds: [kk.kepalaKeluargaId], penggantiKepalaId: kk.anggotaIds[1] })).status).toBe(500)
    } finally {
      efek.gagal = false
    }
    expect([await hitung('mutasi'), await hitung('riwayat_penduduk'), await hitung('aktivitas')]).toEqual(sebelum)
    const d = await detailKk(kk.id)
    expect(d.keluarga.kepalaKeluargaId).toBe(kk.kepalaKeluargaId)
    expect(d.anggota.map((a) => a.id)).toEqual(kk.anggotaIds)
  })

  it('Kades, Kepala Dusun, dan Kaur Keuangan 403; tanpa cookie 401', async () => {
    const sebelum = await hitung('mutasi')
    for (const k of [kuki.kades, kuki.kadus, kuki.kaur]) {
      const r = await pindah({ ...PINDAH, pendudukIds: ['pdk_muhammad_alif'] }, k)
      expect(r.status).toBe(403)
      expect((await galat(r)).message).toBe(PESAN_UBAH)
    }
    expect((await pindah({ ...PINDAH, pendudukIds: ['pdk_muhammad_alif'] }, null)).status).toBe(401)
    expect(await hitung('mutasi')).toBe(sebelum)
  })
})

describe('POST /mutasi/datang (SPEC-V0.2 §6.6)', () => {
  it('KK baru dengan NIK asal: kepala di urutan pertama, nomor KK baru hari ini, masuk preset pendatang, NIK tersandi', async () => {
    const masukan = datangBaru()
    const [jiwa, kkSebelum, datangBulan] = [(await ringkasanPenduduk()).jiwa, (await ringkasanPenduduk()).kk, (await ringkasanBulan()).datang]
    const r = await datang(masukan)
    expect(r.status).toBe(201)
    const { mutasi, penduduk } = await hasil(r)
    expect(penduduk.map((p) => p.nik)).toEqual(masukan.anggota.map((a) => a.nik))
    expect(penduduk.map((p) => p.telepon)).toEqual([null, '081377712345'])
    expect(penduduk.every((p) => p.statusPenduduk === 'Tetap' && p.statusDasar === 'Hidup' && p.dusunId === 'dsn_ss_3' && p.rw === '005' && p.rt === '012')).toBe(true)
    expect(penduduk[0].id).toMatch(/^pdk_/)
    if (mutasi.jenis !== 'datang') throw new Error('Jenis mutasi salah')
    expect(mutasi).toMatchObject({
      tanggal: '2026-09-22', pendudukIds: penduduk.map((p) => p.id), dicatatOleh: { id: 'pgn_rosmiati', nama: 'Rosmiati' },
      rincian: { nomorSkpwni: '3310/SKPWNI/2026/0042', asal: masukan.asal },
    })
    const { keluarga, anggota } = await detailKk(mutasi.rincian.keluargaId)
    expect(keluarga.kepalaKeluargaId).toBe(penduduk[0].id)
    expect(keluarga.nomorKk).toMatch(/^140509240926800\d$/)
    expect(keluarga.tanggalTerbit).toBe('2026-09-24')
    expect(anggota.map((a) => a.id)).toEqual(penduduk.map((p) => p.id))
    expect(await ringkasanPenduduk()).toMatchObject({ jiwa: jiwa + 2, kk: kkSebelum + 1 })
    expect((await ringkasanBulan()).datang).toBe(datangBulan + 1)
    const pendatang = daftarSchema(barisPendudukSchema).parse(await (await ambil(app, `${SS}/api/v1/penduduk?preset=pendatang-tahun-ini&pageSize=100`, kuki.operator)).json())
    expect(pendatang.data.map((p) => p.id)).toEqual(expect.arrayContaining(penduduk.map((p) => p.id)))
    const riwayat = await riwayatDari(penduduk[0].id)
    expect(riwayat.map((e) => e.jenis)).toEqual(['mutasi'])
    const baris = await uji.sqlMigrasi`select nik_sandi, nik_indeks, telepon_sandi, urutan_kk from penduduk where id in ${uji.sqlMigrasi(penduduk.map((p) => p.id))} order by urutan_kk`
    expect(baris.map((b) => b.urutan_kk)).toEqual([0, 1])
    for (const b of baris) expect(b.nik_sandi).toMatch(/^v1\./)
    expect(baris[1].telepon_sandi).toMatch(/^v1\./)
    const [teks] = await uji.sqlMigrasi`select string_agg(p::text, E'\n') as t from penduduk p where p.id = ${penduduk[0].id}`
    expect((teks.t as string).includes(masukan.anggota[0].nik)).toBe(false)
    expect(await uji.sqlMigrasi`select urutan from mutasi_penduduk where mutasi_id = ${mutasi.id} order by urutan`).toEqual([{ urutan: 0 }, { urutan: 1 }])
    const akt = await uji.sqlMigrasi`select jenis, ringkasan, dusun_id, rujukan_id from aktivitas where rujukan_id = ${penduduk[0].id}`
    expect(akt[0]).toMatchObject({ jenis: 'mutasi-datang', ringkasan: 'Kedatangan dicatat · Sutrisno (2 orang)', dusun_id: 'dsn_ss_3' })
  })

  it('kepala bukan anggota pertama dalam isian tetap diurutkan di depan', async () => {
    const istri = suparmi()
    const kepala = anggota()
    const { penduduk } = await hasil(await datang(datangBaru({ anggota: [istri, kepala] })))
    expect(penduduk.map((p) => p.nama)).toEqual(['Sutrisno', 'Suparmi'])
  })

  it('masuk ke KK yang ada: anggota di belakang yang sudah ada; kepala kedua ditolak; KK tak dikenal atau kosong ditolak', async () => {
    const kk = kkUji(7)
    const adik = anggota({ nama: 'Adik Pendatang', hubunganKeluarga: 'Famili Lain', tanggalLahir: '2001-03-03' })
    const r = await datang(datangBaru({ keluarga: { jenis: 'ada', id: kk.id }, anggota: [adik] }))
    expect(r.status).toBe(201)
    const { penduduk } = await hasil(r)
    const d = await detailKk(kk.id)
    expect(d.keluarga.kepalaKeluargaId).toBe(kk.kepalaKeluargaId)
    expect(d.anggota.map((a) => a.id)).toEqual([...kk.anggotaIds, penduduk[0].id])
    expect(penduduk[0]).toMatchObject({ keluargaId: kk.id, dusunId: kk.dusunId, rw: kk.rw, rt: kk.rt })
    const dua = await datang(datangBaru({ keluarga: { jenis: 'ada', id: kk.id }, anggota: [anggota({ hubunganKeluarga: 'Kepala Keluarga' })] }))
    expect(dua.status).toBe(422)
    expect((await galat(dua)).fields?.anggota).toBe('KK tujuan sudah punya kepala keluarga')
    const tak = await datang(datangBaru({ keluarga: { jenis: 'ada', id: 'kk_tidak_ada' }, anggota: [anggota({ hubunganKeluarga: 'Anak' })] }))
    expect((await galat(tak)).fields?.keluarga).toBe('KK tidak ditemukan')
    const kosong = kkUji(0)
    expect((await detailKk(kosong.id)).anggota).toEqual([])
    const keKosong = await datang(datangBaru({ keluarga: { jenis: 'ada', id: kosong.id }, anggota: [anggota({ hubunganKeluarga: 'Anak' })] }))
    expect((await galat(keKosong)).fields?.keluarga).toBe('KK tidak ditemukan')
  })

  it('NIK per anggota: sudah terdaftar (termasuk mantan penduduk), kembar dalam isian, dan tidak sah ditolak tanpa efek samping', async () => {
    const sebelum = [await hitung('penduduk'), await hitung('keluarga'), await hitung('mutasi')]
    const siti = await datang(datangBaru({ anggota: [anggota(), anggota({ nik: '1405095203918002', hubunganKeluarga: 'Istri' })] }))
    expect(siti.status).toBe(409)
    expect(await galat(siti)).toMatchObject({ code: 'CONFLICT', fields: { 'anggota.1.nik': 'NIK sudah terdaftar atas nama Siti Rahmah' } })
    const mantan = dunia.penduduk.find((p) => p.desaId === ID_SUNGAI_SIALANG && p.statusDasar === 'Meninggal' && p.nik !== null) as NonNullable<DbDemo['penduduk'][number]>
    const bekas = await datang(datangBaru({ anggota: [anggota({ nik: mantan.nik as string })] }))
    expect(bekas.status).toBe(409)
    expect((await galat(bekas)).fields?.['anggota.0.nik']).toBe(`NIK sudah terdaftar atas nama ${mantan.nama}`)
    const nik = nikBaru()
    const kembar = await datang(datangBaru({ anggota: [anggota({ nik }), anggota({ nik, hubunganKeluarga: 'Istri' })] }))
    expect(kembar.status).toBe(409)
    expect((await galat(kembar)).fields?.['anggota.1.nik']).toBe('NIK ini sudah dipakai anggota lain di isian ini')
    const rusak = '1405099913900001'
    expect(periksaNik(rusak, SEKARANG_UJI).status).toBe('tidak-valid')
    const tidakSah = await datang(datangBaru({ anggota: [anggota({ nik: rusak })] }))
    expect(tidakSah.status).toBe(422)
    expect((await galat(tidakSah)).fields?.['anggota.0.nik']).toBe((periksaNik(rusak, SEKARANG_UJI) as { pesan: string }).pesan)
    expect([await hitung('penduduk'), await hitung('keluarga'), await hitung('mutasi')]).toEqual(sebelum)
  })

  it('KK baru: tepat satu kepala, wilayah sah; tanggal datang dan tanggal lahir tidak di masa depan', async () => {
    const tanpa = await datang(datangBaru({ anggota: [anggota({ hubunganKeluarga: 'Famili Lain' }), suparmi({ hubunganKeluarga: 'Famili Lain' })] }))
    expect((await galat(tanpa)).fields?.anggota).toBe('KK baru harus punya tepat satu kepala keluarga')
    const dua = await datang(datangBaru({ anggota: [anggota(), suparmi({ hubunganKeluarga: 'Kepala Keluarga' })] }))
    expect((await galat(dua)).fields?.anggota).toBe('KK baru harus punya tepat satu kepala keluarga')
    const wilayah = await datang(datangBaru({ keluarga: { jenis: 'baru', dusunId: 'dsn_tidak_ada', rw: '005', rt: '012' } }))
    expect(wilayah.status).toBe(422)
    expect((await galat(wilayah)).fields?.dusunId).toBe('Wilayah tidak dikenal')
    const esok = await datang(datangBaru({ tanggal: '2026-09-25' }))
    expect((await galat(esok)).fields?.tanggal).toBe('Tanggal datang tidak boleh setelah hari ini')
    const lahirEsok = await datang(datangBaru({ anggota: [anggota({ tanggalLahir: '2026-09-25' })] }))
    expect((await galat(lahirEsok)).fields?.['anggota.0.tanggalLahir']).toBe('Tanggal lahir tidak boleh setelah hari ini')
  })

  it('lima belas anggota diterima, enam belas ditolak sebagai isian tidak valid', async () => {
    const lima = [anggota(), ...Array.from({ length: 14 }, (_, i) => anggota({ nama: `Anggota ${i + 1}`, hubunganKeluarga: 'Famili Lain', tanggalLahir: '1980-01-01' }))]
    const ok = await datang(datangBaru({ anggota: lima }))
    expect(ok.status).toBe(201)
    expect((await hasil(ok)).penduduk).toHaveLength(15)
    const enam = [...lima, anggota({ nama: 'Anggota 16', hubunganKeluarga: 'Famili Lain' })]
    expect((await datang(datangBaru({ anggota: enam }))).status).toBe(422)
  })

  it('NIK yang sama dari dua operator bersamaan: satu 201, satu 409 pada anggota.0.nik, satu KK baru (fokus 3)', async () => {
    const nik = nikBaru()
    const a = datangBaru({ nomorSkpwni: 'A', anggota: [anggota({ nik })] })
    const b = datangBaru({ nomorSkpwni: 'B', anggota: [anggota({ nik })] })
    const kkSebelum = await hitung('keluarga')
    let selesai = 0
    let jawaban: Promise<Response[]> | undefined
    await uji.sqlMigrasi.begin(async (tx) => {
      // Menahan kunci nomor KK: kedua permintaan lolos pemeriksaan NIK di muka lalu antre, sehingga tabrakan terjadi di indeks unik.
      await tx`select pg_advisory_xact_lock(hashtextextended(${`nomor-kk:${ID_SUNGAI_SIALANG}`}, 0))`
      jawaban = Promise.all([datang(a), datang(b)].map((p) => p.then((r) => (selesai++, r))))
      await tunggu(600)
      expect(selesai).toBe(0)
    })
    const [x, y] = (await jawaban) as Response[]
    expect([x.status, y.status].sort()).toEqual([201, 409])
    const kalah = x.status === 409 ? x : y
    expect((await galat(kalah)).fields?.['anggota.0.nik']).toBe('NIK sudah terdaftar')
    expect(await hitung('keluarga')).toBe(kkSebelum + 1)
    expect(await hitung('penduduk', `nama = 'Sutrisno' and status_dasar = 'Hidup' and nik_indeks is not null and urutan_kk = 0 and id in (select penduduk_id from mutasi_penduduk join mutasi on mutasi.id = mutasi_id where mutasi.rincian->>'nomorSkpwni' in ('A','B'))`)).toBe(1)
  })

  it('kegagalan di tengah penulisan membatalkan KK baru, semua penduduk, dan mutasi (fokus 6)', async () => {
    await uji.sqlMigrasi.unsafe(`create function uji_gagal_anggota() returns trigger language plpgsql as $$ begin if new.nama = 'Anggota Gagal' then raise exception 'uji gagal'; end if; return new; end $$`)
    await uji.sqlMigrasi.unsafe('grant execute on function uji_gagal_anggota() to public')
    await uji.sqlMigrasi.unsafe('create trigger uji_gagal_anggota before insert on penduduk for each row execute function uji_gagal_anggota()')
    const sebelum = [await hitung('penduduk'), await hitung('keluarga'), await hitung('mutasi'), await hitung('mutasi_penduduk')]
    try {
      const r = await datang(datangBaru({ anggota: [anggota(), suparmi({ nama: 'Anggota Gagal' })] }))
      expect(r.status).toBe(500)
    } finally {
      await uji.sqlMigrasi.unsafe('drop trigger uji_gagal_anggota on penduduk')
      await uji.sqlMigrasi.unsafe('drop function uji_gagal_anggota()')
    }
    expect([await hitung('penduduk'), await hitung('keluarga'), await hitung('mutasi'), await hitung('mutasi_penduduk')]).toEqual(sebelum)
  })

  it('Kades, Kepala Dusun, dan Kaur Keuangan 403; tanpa cookie 401; isian rusak 422', async () => {
    const sebelum = await hitung('mutasi')
    for (const k of [kuki.kades, kuki.kadus, kuki.kaur]) {
      const r = await datang(datangBaru(), k)
      expect(r.status).toBe(403)
      expect((await galat(r)).message).toBe(PESAN_UBAH)
    }
    expect((await datang(datangBaru(), null)).status).toBe(401)
    expect(await hitung('mutasi')).toBe(sebelum)
    const rusak = await datang({ ...datangBaru(), anggota: [] })
    expect(rusak.status).toBe(422)
    expect((await galat(rusak)).message).toBe('Isian belum lengkap atau tidak valid.')
  })
})

import { ID_SUNGAI_SIALANG } from '@sinfodes/demo/data/desa-demo'
import { bangkitkanDb } from '@sinfodes/demo/generator'
import type { DbDemo } from '@sinfodes/demo/tipe-db'
import { SEKARANG_UJI } from '@sinfodes/demo/uji-akun'
import { galatSchema } from '@sinfodes/kontrak/api'
import { formatTanggal, waktuIsoWib } from '@sinfodes/kontrak/format/tanggal'
import { detailKeluargaSchema } from '@sinfodes/kontrak/keluarga/schema'
import { laporanDataSchema } from '@sinfodes/kontrak/laporan/schema'
import { hubunganBayi, hasilMutasiSchema, type MasukanLahir, type MasukanMeninggal } from '@sinfodes/kontrak/mutasi/masukan'
import { ringkasanMutasiSchema } from '@sinfodes/kontrak/mutasi/buku'
import { entriRiwayatSchema } from '@sinfodes/kontrak/penduduk/riwayat'
import { pendudukSchema, ringkasanPendudukSchema } from '@sinfodes/kontrak/penduduk/schema'
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
    operator: await masuk('rosmiati@sungaisialang.desa.id', '10.3.0.1'),
    kades: await masuk('kades@sungaisialang.desa.id', '10.3.0.2'),
    kadus: await masuk('sukardi@sungaisialang.desa.id', '10.3.0.3'),
    kaur: await masuk('nurhayati@sungaisialang.desa.id', '10.3.0.4'),
  }
})
afterAll(async () => {
  await uji?.tutup()
})

const lahir = async (badan: unknown, k: string | null = kuki.operator): Promise<Response> => kirimJson(app, SS, '/api/v1/mutasi/lahir', badan, k)
const meninggal = async (badan: unknown, k: string | null = kuki.operator): Promise<Response> => kirimJson(app, SS, '/api/v1/mutasi/meninggal', badan, k)
const galat = async (r: Response) => galatSchema.parse(await r.json()).error
const hasil = async (r: Response) => hasilMutasiSchema.parse(await r.json())
const detailKk = async (id: string) => detailKeluargaSchema.parse(await (await ambil(app, `${SS}/api/v1/keluarga/${id}`, kuki.operator)).json())
const riwayatDari = async (id: string) => entriRiwayatSchema.array().parse(await (await ambil(app, `${SS}/api/v1/penduduk/${id}/riwayat`, kuki.operator)).json())
const ringkasanPenduduk = async () => ringkasanPendudukSchema.parse(await (await ambil(app, `${SS}/api/v1/penduduk/ringkasan`, kuki.operator)).json())
const ringkasanBulan = async () => ringkasanMutasiSchema.parse(await (await ambil(app, `${SS}/api/v1/mutasi/ringkasan?bulan=2026-09`, kuki.operator)).json())
const hitung = async (tabel: string, kondisi = 'true'): Promise<number> => Number((await uji.sqlMigrasi.unsafe(`select count(*)::int as n from ${tabel} where ${kondisi}`))[0].n)
const tunggu = (ms: number) => new Promise((r) => setTimeout(r, ms))

const LAHIR: MasukanLahir = {
  ibuId: 'pdk_siti_rahmah', ayahId: 'pdk_syahrial', pelapor: 'Syahrial',
  bayi: {
    nama: 'Aisyah Putri', jenisKelamin: 'P', tempatLahir: 'Pelalawan', tanggalLahir: '2026-09-20', jam: '04:15', tempatDilahirkan: 'Puskesmas',
    jenisKelahiran: 'Tunggal', anakKe: 3, penolong: 'Bidan/Perawat', beratGram: 3100, panjangCm: 49,
  },
}
const MENINGGAL: MasukanMeninggal = {
  pendudukId: 'pdk_syahrial', tanggal: '2026-09-23', jam: '21:40', tempat: 'Rumah', sebab: 'Sakit biasa/tua', yangMenerangkan: 'Tenaga kesehatan',
  pelapor: 'Siti Rahmah', penggantiKepalaId: null,
}
const lahirDari = (ibuId: string, ayahId: string | null, nama: string, ubah: Partial<MasukanLahir> = {}): MasukanLahir => ({ ...LAHIR, ibuId, ayahId, bayi: { ...LAHIR.bayi, nama }, ...ubah })

/** KK bukan persona dengan anggota Hidup minimal `min` orang; tiap uji memakai KK sendiri supaya urutan uji tidak saling memengaruhi. */
const kkUji = (n: number, min = 4): NonNullable<DbDemo['keluarga'][number]> =>
  dunia.keluarga.filter((k) => k.desaId === ID_SUNGAI_SIALANG && !['kk_syahrial', 'kk_zulkifli'].includes(k.id) && k.anggotaIds.length >= min)[n]
const orangDari = (id: string) => dunia.penduduk.find((p) => p.id === id) as NonNullable<DbDemo['penduduk'][number]>
/** KK ke-n dari belakang yang punya anggota perempuan, untuk uji kelahiran; jauh dari KK uji meninggal (dari depan) supaya tidak saling memengaruhi. */
const kkIbu = (n: number): NonNullable<DbDemo['keluarga'][number]> =>
  dunia.keluarga
    .filter((k) => k.desaId === ID_SUNGAI_SIALANG && !['kk_syahrial', 'kk_zulkifli'].includes(k.id) && k.anggotaIds.length >= 3 && k.anggotaIds.some((id) => orangDari(id).jenisKelamin === 'P'))
    .at(-1 - n) as NonNullable<DbDemo['keluarga'][number]>
const ibuDi = (kk: NonNullable<DbDemo['keluarga'][number]>) => kk.anggotaIds.map(orangDari).find((p) => p.jenisKelamin === 'P') as NonNullable<DbDemo['penduduk'][number]>

describe('POST /mutasi/lahir (SPEC-V0.2 §6.6)', () => {
  it('bayi tanpa NIK masuk ke KK ibunya di urutan terakhir; tercatat di Buku Mutasi, Riwayat, dan aktivitas', async () => {
    const jiwa = (await ringkasanPenduduk()).jiwa
    const r = await lahir(LAHIR)
    expect(r.status).toBe(201)
    const { mutasi, penduduk } = await hasil(r)
    const [bayi] = penduduk
    expect(bayi).toMatchObject({
      nik: null, nama: 'Aisyah Putri', keluargaId: 'kk_syahrial', hubunganKeluarga: 'Anak', namaIbu: 'Siti Rahmah', namaAyah: 'Syahrial', statusDasar: 'Hidup',
      statusPenduduk: 'Tetap', ktpEl: 'Belum wajib', golonganDarah: 'Tidak Tahu', kewarganegaraan: 'WNI', agama: orangDari('pdk_siti_rahmah').agama,
      pendidikan: 'Tidak/Belum Sekolah', pekerjaan: 'Belum/Tidak Bekerja', statusPerkawinan: 'Belum Kawin', tempatLahir: 'Pelalawan', tanggalLahir: '2026-09-20',
      dusunId: orangDari('pdk_siti_rahmah').dusunId, rw: orangDari('pdk_siti_rahmah').rw, rt: orangDari('pdk_siti_rahmah').rt,
    })
    expect(mutasi).toMatchObject({
      jenis: 'lahir', tanggal: '2026-09-20', pendudukIds: [bayi.id], dicatatOleh: { id: 'pgn_rosmiati', nama: 'Rosmiati' }, dicatatPada: waktuIsoWib(SEKARANG_UJI),
      rincian: { jam: '04:15', tempatDilahirkan: 'Puskesmas', tempatLahir: 'Pelalawan', jenisKelahiran: 'Tunggal', anakKe: 3, penolong: 'Bidan/Perawat', beratGram: 3100, panjangCm: 49, ibuId: 'pdk_siti_rahmah', ayahId: 'pdk_syahrial', pelapor: 'Syahrial' },
    })
    expect(mutasi.id).toMatch(/^mts_/)
    expect(bayi.id).toMatch(/^pdk_/)
    const kk = await detailKk('kk_syahrial')
    expect(kk.anggota).toHaveLength(5)
    expect(kk.anggota.at(-1)?.id).toBe(bayi.id)
    expect((await ringkasanPenduduk()).jiwa).toBe(jiwa + 1)
    expect((await ringkasanBulan()).lahir).toBe(4)
    expect((await riwayatDari(bayi.id)).map((e) => e.jenis)).toEqual(['mutasi'])
    const [b] = await uji.sqlMigrasi`select nik_sandi, nik_indeks, telepon_sandi from penduduk where id = ${bayi.id}`
    expect(b).toMatchObject({ nik_sandi: null, nik_indeks: null, telepon_sandi: null })
    const akt = await uji.sqlMigrasi`select jenis, ringkasan, dusun_id, oleh_id, rujukan_jenis, rujukan_id from aktivitas where rujukan_id = ${bayi.id}`
    expect(akt).toHaveLength(1)
    expect(akt[0]).toMatchObject({ jenis: 'mutasi-lahir', ringkasan: 'Kelahiran dicatat · Aisyah Putri', dusun_id: bayi.dusunId, oleh_id: 'pgn_rosmiati', rujukan_jenis: 'penduduk' })
    const baris = await uji.sqlMigrasi`select urutan from mutasi_penduduk where mutasi_id = ${mutasi.id}`
    expect(baris.map((x) => x.urutan)).toEqual([0])
  })

  it('hubungan bayi mengikuti hubungan ibunya (hubunganBayi kontrak)', async () => {
    const ibuPerHubungan = new Map<string, DbDemo['penduduk'][number]>()
    for (const p of [...dunia.penduduk].reverse()) {
      if (p.desaId !== ID_SUNGAI_SIALANG || p.jenisKelamin !== 'P' || p.statusDasar !== 'Hidup' || ['kk_syahrial', 'kk_zulkifli'].includes(p.keluargaId)) continue
      if (!ibuPerHubungan.has(p.hubunganKeluarga)) ibuPerHubungan.set(p.hubunganKeluarga, p)
    }
    expect(ibuPerHubungan.size).toBeGreaterThanOrEqual(3)
    let i = 0
    for (const [hubungan, ibu] of ibuPerHubungan) {
      const { penduduk } = await hasil(await lahir(lahirDari(ibu.id, null, `Bayi Hubungan ${++i}`)))
      expect(penduduk[0], hubungan).toMatchObject({ hubunganKeluarga: hubunganBayi(ibu.hubunganKeluarga), namaIbu: ibu.nama, namaAyah: '', keluargaId: ibu.keluargaId })
    }
  })

  it('ibu harus perempuan yang masih hidup; ayah laki-laki yang masih hidup atau kosong', async () => {
    const mantanIbu = dunia.penduduk.find((p) => p.desaId === ID_SUNGAI_SIALANG && p.jenisKelamin === 'P' && p.statusDasar !== 'Hidup') as NonNullable<DbDemo['penduduk'][number]>
    for (const ibuId of ['pdk_syahrial', 'pdk_tidak_ada', mantanIbu.id]) {
      const r = await lahir(lahirDari(ibuId, null, 'Bayi Salah Ibu'))
      expect(r.status, ibuId).toBe(422)
      expect((await galat(r)).fields?.ibuId, ibuId).toBe('Pilih ibu: penduduk perempuan yang masih hidup')
    }
    for (const ayahId of ['pdk_siti_rahmah', 'pdk_tidak_ada']) {
      const r = await lahir(lahirDari('pdk_siti_rahmah', ayahId, 'Bayi Salah Ayah'))
      expect(r.status, ayahId).toBe(422)
      expect((await galat(r)).fields?.ayahId, ayahId).toBe('Pilih ayah: penduduk laki-laki yang masih hidup')
    }
    expect(await hitung('penduduk', `nama like 'Bayi Salah%'`)).toBe(0)
  })

  it('tanggal lahir setelah hari ini ditolak menurut WIB; hari ini diterima', async () => {
    const r = await lahir(lahirDari('pdk_siti_rahmah', 'pdk_syahrial', 'Bayi Besok', { bayi: { ...LAHIR.bayi, nama: 'Bayi Besok', tanggalLahir: '2026-09-25' } }))
    expect(r.status).toBe(422)
    expect((await galat(r)).fields?.['bayi.tanggalLahir']).toBe('Tanggal lahir tidak boleh setelah hari ini')
    const hariIni = await lahir(lahirDari('pdk_siti_rahmah', 'pdk_syahrial', 'Bayi Hari Ini', { bayi: { ...LAHIR.bayi, nama: 'Bayi Hari Ini', tanggalLahir: '2026-09-24' } }))
    expect(hariIni.status).toBe(201)
    const larut = rakitApp({ klien: uji.klien, penyandi: await penyandiUji(uji.sqlMigrasi), waktu: () => new Date('2026-09-24T18:00:00Z') })
    const kukiLarut = (await masukLewatRute(larut.app, SS, 'rosmiati@sungaisialang.desa.id', 'demo', '10.3.0.9')).kuki as string
    const esok = await kirimJson(larut.app, SS, '/api/v1/mutasi/lahir', lahirDari('pdk_siti_rahmah', 'pdk_syahrial', 'Bayi WIB Esok', { bayi: { ...LAHIR.bayi, nama: 'Bayi WIB Esok', tanggalLahir: '2026-09-25' } }), kukiLarut)
    expect(esok.status).toBe(201)
  })

  it('isian tidak lengkap 422 dengan pesan per field', async () => {
    const r = await lahir({ ...LAHIR, bayi: { ...LAHIR.bayi, nama: '' } })
    expect(r.status).toBe(422)
    expect((await galat(r)).message).toBe('Isian belum lengkap atau tidak valid.')
    expect((await galat(await lahir({ ...LAHIR, bayi: { ...LAHIR.bayi, nama: '' } }))).fields).toHaveProperty(['bayi.nama'])
    expect((await lahir('bukan json')).status).toBe(422)
  })

  it('dari laporan warga: laporan selesai dan tidak bisa dipakai lagi; laporan lain atau tak dikenal ditolak', async () => {
    const dariLaporan: MasukanLahir = {
      ibuId: 'pdk_rosnani', ayahId: 'pdk_zulkifli', pelapor: 'Zulkifli', laporanId: 'lap_kelahiran_rosnani',
      bayi: { ...LAHIR.bayi, nama: 'Nayla Safitri', tanggalLahir: '2026-09-21', jam: '05:20', anakKe: 3, beratGram: 3050 },
    }
    for (const laporanId of ['lap_tidak_ada', 'lap_pekerjaan_syahrial']) {
      const r = await lahir({ ...dariLaporan, laporanId })
      expect(r.status, laporanId).toBe(422)
      expect((await galat(r)).fields?.laporanId, laporanId).toBe('Laporan kelahiran tidak ditemukan')
    }
    const r = await lahir(dariLaporan)
    expect(r.status).toBe(201)
    const { penduduk } = await hasil(r)
    expect(penduduk[0]).toMatchObject({ nama: 'Nayla Safitri', keluargaId: 'kk_zulkifli' })
    const laporan = laporanDataSchema.parse(await (await ambil(app, `${SS}/api/v1/laporan-data/lap_kelahiran_rosnani`, kuki.operator)).json())
    expect(laporan).toMatchObject({ status: 'diterapkan', ditangani: { oleh: { id: 'pgn_rosmiati', nama: 'Rosmiati' }, alasan: null } })
    const lagi = await lahir(dariLaporan)
    expect(lagi.status).toBe(409)
    expect((await galat(lagi)).message).toBe('Laporan kelahiran ini sudah ditangani.')
    expect(await hitung('penduduk', `nama = 'Nayla Safitri'`)).toBe(1)
    expect(await hitung('aktivitas', `jenis = 'laporan-diterapkan'`)).toBe(0)
  })

  it('laporan yang sama dari dua petugas serentak: satu 201, satu 409, satu bayi (fokus 4)', async () => {
    const ibu = ibuDi(kkIbu(0))
    await uji.sqlMigrasi`insert into laporan_data (id, desa_id, dusun_id, dibuat_pada, pelapor_penduduk_id, pelapor_nama, status, isi)
      values ('lap_lahir_serentak', ${ID_SUNGAI_SIALANG}, ${ibu.dusunId}, now(), 'pdk_siti_rahmah', 'Siti Rahmah', 'baru',
        ${uji.sqlMigrasi.json({ jenis: 'kelahiran', ibuId: ibu.id, nama: 'Bayi Serentak', jenisKelamin: 'L', tanggalLahir: '2026-09-22', jam: null, tempatDilahirkan: null, penolong: null, beratGram: null, panjangCm: null, catatan: null })})`
    const masukan = lahirDari(ibu.id, null, 'Bayi Serentak', { laporanId: 'lap_lahir_serentak' })
    const [a, b] = await Promise.all([lahir(masukan), lahir(masukan)])
    expect([a.status, b.status].sort()).toEqual([201, 409])
    expect(await hitung('penduduk', `nama = 'Bayi Serentak'`)).toBe(1)
  })

  it('lahir membaca status laporan SESUDAH mengunci barisnya (bukti deterministik, fokus 4)', async () => {
    const ibu = ibuDi(kkIbu(1))
    await uji.sqlMigrasi`insert into laporan_data (id, desa_id, dusun_id, dibuat_pada, pelapor_penduduk_id, pelapor_nama, status, isi)
      values ('lap_lahir_kunci', ${ID_SUNGAI_SIALANG}, ${ibu.dusunId}, now(), 'pdk_siti_rahmah', 'Siti Rahmah', 'baru',
        ${uji.sqlMigrasi.json({ jenis: 'kelahiran', ibuId: ibu.id, nama: 'Bayi Kunci', jenisKelamin: 'L', tanggalLahir: '2026-09-22', jam: null, tempatDilahirkan: null, penolong: null, beratGram: null, panjangCm: null, catatan: null })})`
    let selesai = false
    let jawaban: Promise<Response> | undefined
    await uji.sqlMigrasi.begin(async (tx) => {
      await tx`update laporan_data set status = 'diterapkan', ditangani_oleh_id = 'pgn_lain', ditangani_oleh_nama = 'Lain', ditangani_pada = now() where id = 'lap_lahir_kunci'`
      jawaban = lahir(lahirDari(ibu.id, null, 'Bayi Kunci', { laporanId: 'lap_lahir_kunci' })).then((r) => {
        selesai = true
        return r
      })
      await tunggu(500)
      expect(selesai).toBe(false)
    })
    expect((await jawaban)?.status).toBe(409)
    expect(await hitung('penduduk', `nama = 'Bayi Kunci'`)).toBe(0)
  })

  it('KK ibu dikunci: lahir menunggu pemegang kunci baris KK (bukti deterministik)', async () => {
    const kk = kkIbu(2)
    const ibu = ibuDi(kk)
    let selesai = false
    let jawaban: Promise<Response> | undefined
    await uji.sqlMigrasi.begin(async (tx) => {
      await tx`select id from keluarga where id = ${kk.id} for no key update`
      jawaban = lahir(lahirDari(ibu.id, null, 'Bayi Menunggu KK')).then((r) => {
        selesai = true
        return r
      })
      await tunggu(500)
      expect(selesai).toBe(false)
    })
    expect((await jawaban)?.status).toBe(201)
  })

  it('Kades, Kepala Dusun, dan Kaur Keuangan 403; tanpa cookie 401', async () => {
    const sebelum = await hitung('mutasi')
    for (const k of [kuki.kades, kuki.kadus, kuki.kaur]) {
      const r = await lahir(LAHIR, k)
      expect(r.status).toBe(403)
      expect((await galat(r)).message).toBe(PESAN_UBAH)
    }
    expect((await lahir(LAHIR, null)).status).toBe(401)
    expect(await hitung('mutasi')).toBe(sebelum)
  })

  it('kegagalan mencatat aktivitas membatalkan bayi, mutasi, dan status laporan (fokus 6)', async () => {
    const kk = kkIbu(3)
    const ibu = ibuDi(kk)
    await uji.sqlMigrasi.unsafe(`create function uji_gagal_aktivitas4() returns trigger language plpgsql as $$ begin raise exception 'uji gagal'; end $$`)
    await uji.sqlMigrasi.unsafe('grant execute on function uji_gagal_aktivitas4() to public')
    await uji.sqlMigrasi.unsafe('create trigger uji_gagal4 before insert on aktivitas for each row execute function uji_gagal_aktivitas4()')
    const sebelum = [await hitung('penduduk'), await hitung('mutasi'), await hitung('mutasi_penduduk')]
    try {
      expect((await lahir(lahirDari(ibu.id, null, 'Bayi Atomik'))).status).toBe(500)
    } finally {
      await uji.sqlMigrasi.unsafe('drop trigger uji_gagal4 on aktivitas')
      await uji.sqlMigrasi.unsafe('drop function uji_gagal_aktivitas4()')
    }
    expect([await hitung('penduduk'), await hitung('mutasi'), await hitung('mutasi_penduduk')]).toEqual(sebelum)
  })
})

describe('POST /mutasi/meninggal (SPEC-V0.2 §6.6)', () => {
  it('kepala keluarga meninggal: pengganti wajib dari anggota yang tetap tinggal', async () => {
    const tanpa = await meninggal(MENINGGAL)
    expect(tanpa.status).toBe(422)
    expect((await galat(tanpa)).fields?.penggantiKepalaId).toBe('Pilih kepala keluarga pengganti dari anggota yang tetap tinggal')
    const asing = await meninggal({ ...MENINGGAL, penggantiKepalaId: kkUji(0).anggotaIds[0] })
    expect(asing.status).toBe(422)
    expect((await galat(asing)).fields?.penggantiKepalaId).toBe('Pengganti harus anggota KK yang tetap tinggal')
    const dirinya = await meninggal({ ...MENINGGAL, penggantiKepalaId: 'pdk_syahrial' })
    expect((await galat(dirinya)).fields?.penggantiKepalaId).toBe('Pengganti harus anggota KK yang tetap tinggal')
    expect(orangDari('pdk_syahrial').statusDasar).toBe('Hidup')
    expect(await hitung('mutasi', `jenis = 'meninggal' and id in (select mutasi_id from mutasi_penduduk where penduduk_id = 'pdk_syahrial')`)).toBe(0)
  })

  it('status Meninggal, keluar dari KK, pengganti jadi kepala di urutan pertama; jiwa berkurang; efek silang dan aktivitas', async () => {
    efek.panggilan.length = 0
    const jiwa = (await ringkasanPenduduk()).jiwa
    const r = await meninggal({ ...MENINGGAL, penggantiKepalaId: 'pdk_siti_rahmah' })
    expect(r.status).toBe(201)
    const { mutasi, penduduk } = await hasil(r)
    expect(penduduk).toHaveLength(1)
    expect(penduduk[0]).toMatchObject({ id: 'pdk_syahrial', statusDasar: 'Meninggal', diubahPada: waktuIsoWib(SEKARANG_UJI) })
    expect(mutasi).toMatchObject({
      jenis: 'meninggal', tanggal: '2026-09-23', pendudukIds: ['pdk_syahrial'], dicatatOleh: { id: 'pgn_rosmiati', nama: 'Rosmiati' },
      rincian: { jam: '21:40', tempat: 'Rumah', sebab: 'Sakit biasa/tua', yangMenerangkan: 'Tenaga kesehatan', pelapor: 'Siti Rahmah' },
    })
    expect(pendudukSchema.parse(await (await ambil(app, `${SS}/api/v1/penduduk/pdk_syahrial`, kuki.operator)).json()).statusDasar).toBe('Meninggal')
    const { keluarga, anggota } = await detailKk('kk_syahrial')
    expect(keluarga.kepalaKeluargaId).toBe('pdk_siti_rahmah')
    expect(anggota.map((a) => a.id)).not.toContain('pdk_syahrial')
    expect(anggota[0]).toMatchObject({ id: 'pdk_siti_rahmah', hubunganKeluarga: 'Kepala Keluarga' })
    expect((await ringkasanPenduduk()).jiwa).toBe(jiwa - 1)
    expect((await ringkasanBulan()).meninggal).toBe(2)
    expect(await riwayatDari('pdk_siti_rahmah')).toContainEqual(
      expect.objectContaining({ jenis: 'ubah', field: 'hubunganKeluarga', nilaiLama: 'Istri', nilaiBaru: 'Kepala Keluarga', oleh: { id: 'pgn_rosmiati', nama: 'Rosmiati' } }),
    )
    const riwayatMati = await riwayatDari('pdk_syahrial')
    expect(riwayatMati).toContainEqual(expect.objectContaining({ jenis: 'mutasi', id: mutasi.id, mutasi: 'meninggal', tanggal: '2026-09-23' }))
    expect(riwayatMati.at(-1)?.jenis).toBe('dibuat')
    const akt = await uji.sqlMigrasi`select jenis, ringkasan, oleh_id, rujukan_jenis from aktivitas where rujukan_id = 'pdk_syahrial' and jenis = 'mutasi-meninggal'`
    expect(akt[0]).toMatchObject({ ringkasan: 'Kematian dicatat · Syahrial', oleh_id: 'pgn_rosmiati', rujukan_jenis: 'penduduk' })
    expect(efek.panggilan).toEqual([{ ids: ['pdk_syahrial'], alasan: `Penerima meninggal dunia pada ${formatTanggal('2026-09-23')}`, sejak: waktuIsoWib(SEKARANG_UJI) }])
  })

  it('dicatat dua kali ditolak dan tidak membuat mutasi ganda; efek silang tidak dipanggil lagi', async () => {
    const mutasiSebelum = await hitung('mutasi')
    const dipanggil = efek.panggilan.length
    const r = await meninggal({ ...MENINGGAL, penggantiKepalaId: 'pdk_siti_rahmah' })
    expect(r.status).toBe(422)
    expect((await galat(r)).fields?.pendudukId).toBe('Syahrial sudah berstatus Meninggal')
    expect(await hitung('mutasi')).toBe(mutasiSebelum)
    expect(efek.panggilan).toHaveLength(dipanggil)
  })

  it('bukan kepala: tanpa pengganti; pengganti yang dikirim diabaikan; satu-satunya anggota membuat KK hilang dari daftar', async () => {
    const kk = kkUji(1)
    const biasa = kk.anggotaIds.find((id) => id !== kk.kepalaKeluargaId && orangDari(id).tanggalLahir < '2026-09-01') as string
    const lain = kk.anggotaIds.find((id) => id !== biasa) as string
    const r = await meninggal({ ...MENINGGAL, pendudukId: biasa, tanggal: '2026-09-24', penggantiKepalaId: lain })
    expect(r.status).toBe(201)
    const d = await detailKk(kk.id)
    expect(d.keluarga.kepalaKeluargaId).toBe(kk.kepalaKeluargaId)
    expect(d.anggota.map((a) => a.id)).toEqual(kk.anggotaIds.filter((id) => id !== biasa))
    const tunggal = dunia.keluarga.find((k) => k.desaId === ID_SUNGAI_SIALANG && k.anggotaIds.length === 1) as NonNullable<DbDemo['keluarga'][number]>
    const kkSebelum = (await ringkasanPenduduk()).kk
    expect((await meninggal({ ...MENINGGAL, pendudukId: tunggal.anggotaIds[0], tanggal: '2026-09-24' })).status).toBe(201)
    expect((await ringkasanPenduduk()).kk).toBe(kkSebelum - 1)
    const hilang = await detailKk(tunggal.id)
    expect(hilang.anggota).toEqual([])
    expect(hilang.keluarga.kepalaKeluargaId).toBe(tunggal.kepalaKeluargaId)
  })

  it('tanggal harus antara tanggal lahir dan hari ini; penduduk tak dikenal atau sudah pindah ditolak', async () => {
    const kk = kkUji(2)
    const p = orangDari(kk.anggotaIds[1])
    for (const tanggal of ['2026-09-25', `${Number(p.tanggalLahir.slice(0, 4)) - 1}-01-01`]) {
      const r = await meninggal({ ...MENINGGAL, pendudukId: p.id, tanggal })
      expect(r.status, tanggal).toBe(422)
      expect((await galat(r)).fields?.tanggal, tanggal).toBe('Tanggal meninggal harus antara tanggal lahir dan hari ini')
    }
    const tak = await meninggal({ ...MENINGGAL, pendudukId: 'pdk_tidak_ada' })
    expect((await galat(tak)).fields?.pendudukId).toBe('Penduduk tidak ditemukan')
    const pindah = dunia.penduduk.find((x) => x.desaId === ID_SUNGAI_SIALANG && x.statusDasar === 'Pindah') as NonNullable<DbDemo['penduduk'][number]>
    const sudah = await meninggal({ ...MENINGGAL, pendudukId: pindah.id })
    expect((await galat(sudah)).fields?.pendudukId).toBe(`${pindah.nama} sudah berstatus Pindah`)
    expect(orangDari(p.id).statusDasar).toBe('Hidup')
  })

  it('dua pencatatan serentak untuk orang yang sama: satu 201, satu 422, satu mutasi (fokus 1)', async () => {
    const kk = kkUji(3)
    const p = kk.anggotaIds[2]
    const masukan = { ...MENINGGAL, pendudukId: p, tanggal: '2026-09-24' }
    const sebelum = await hitung('mutasi')
    const [a, b] = await Promise.all([meninggal(masukan), meninggal(masukan)])
    expect([a.status, b.status].sort()).toEqual([201, 422])
    expect(await hitung('mutasi')).toBe(sebelum + 1)
  })

  it('status dibaca SESUDAH kunci KK didapat (bukti deterministik, fokus 1)', async () => {
    const kk = kkUji(4)
    const p = kk.anggotaIds[2]
    let selesai = false
    let jawaban: Promise<Response> | undefined
    await uji.sqlMigrasi.begin(async (tx) => {
      await tx`select id from keluarga where id = ${kk.id} for no key update`
      await tx`update penduduk set status_dasar = 'Meninggal' where id = ${p}`
      jawaban = meninggal({ ...MENINGGAL, pendudukId: p, tanggal: '2026-09-24' }).then((r) => {
        selesai = true
        return r
      })
      await tunggu(500)
      expect(selesai).toBe(false)
    })
    const r = await jawaban
    expect(r?.status).toBe(422)
    expect(await hitung('mutasi_penduduk', `penduduk_id = '${p}'`)).toBe(0)
    await uji.sqlMigrasi`update penduduk set status_dasar = 'Hidup' where id = ${p}`
  })

  it('efek silang yang gagal membatalkan status, mutasi, dan pergantian kepala (fokus 6)', async () => {
    const kk = kkUji(5)
    const kepala = kk.kepalaKeluargaId
    const sebelum = [await hitung('mutasi'), await hitung('riwayat_penduduk'), await hitung('aktivitas')]
    efek.gagal = true
    try {
      expect((await meninggal({ ...MENINGGAL, pendudukId: kepala, tanggal: '2026-09-24', penggantiKepalaId: kk.anggotaIds[1] })).status).toBe(500)
    } finally {
      efek.gagal = false
    }
    expect([await hitung('mutasi'), await hitung('riwayat_penduduk'), await hitung('aktivitas')]).toEqual(sebelum)
    const d = await detailKk(kk.id)
    expect(d.keluarga.kepalaKeluargaId).toBe(kepala)
    expect(d.anggota.map((a) => a.id)).toEqual(kk.anggotaIds)
  })

  it('Kades, Kepala Dusun, dan Kaur Keuangan 403; tanpa cookie 401', async () => {
    const sebelum = await hitung('mutasi')
    for (const k of [kuki.kades, kuki.kadus, kuki.kaur]) {
      const r = await meninggal(MENINGGAL, k)
      expect(r.status).toBe(403)
      expect((await galat(r)).message).toBe(PESAN_UBAH)
    }
    expect((await meninggal(MENINGGAL, null)).status).toBe(401)
    expect(await hitung('mutasi')).toBe(sebelum)
  })
})

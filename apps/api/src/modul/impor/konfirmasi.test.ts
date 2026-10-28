import { ID_SUNGAI_SIALANG } from '@sinfodes/demo/data/desa-demo'
import { SEKARANG_UJI } from '@sinfodes/demo/uji-akun'
import { galatSchema } from '@sinfodes/kontrak/api'
import { hasilImporSchema, laporanImporSchema, type KonfirmasiImpor, type LaporanImpor } from '@sinfodes/kontrak/impor/schema'
import { buatNik } from '@sinfodes/kontrak/penduduk/nik'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buatDbUji, penyandiUji, type DbUji } from '../../../test/basisdata'
import { buatCsvUji } from '../../../test/helpers/berkas-uji'
import { kirimJson, masukLewatRute, rakitApp } from '../../../test/rakit-app'
import type { Penyandi } from '../../kripto/penyandi'
import { ruang } from '../../kripto/ruang'

const SS = 'http://sungaisialang.sinfodes.localhost'
const TL = 'http://tanjunglamo.sinfodes.localhost'
type KkUji = { id: string; dusun_id: string; rw: string; rt: string }
const BERMASALAH = [5, 8, 12, 13, 17]
const JAM = 3600_000
const PESAN_BENTROK = 'Data berubah saat impor berjalan. Periksa ulang berkasnya.'

let uji: DbUji
let penyandi: Penyandi
let app: ReturnType<typeof rakitApp>['app']
let log: ReturnType<typeof rakitApp>['baris']
const kuki: Record<'operator' | 'kades' | 'kadus' | 'operatorTl', string> = { operator: '', kades: '', kadus: '', operatorTl: '' }
beforeAll(async () => {
  uji = await buatDbUji()
  penyandi = await penyandiUji(uji.sqlMigrasi)
  const rakit = rakitApp({ klien: uji.klien, penyandi })
  app = rakit.app
  log = rakit.baris
  const masuk = async (basis: string, surel: string, domain: string, ip: string) => (await masukLewatRute(app, basis, `${surel}@${domain}`, 'demo', ip)).kuki as string
  kuki.operator = await masuk(SS, 'rosmiati', 'sungaisialang.desa.id', '10.12.0.1')
  kuki.kades = await masuk(SS, 'kades', 'sungaisialang.desa.id', '10.12.0.2')
  kuki.kadus = await masuk(SS, 'sukardi', 'sungaisialang.desa.id', '10.12.0.3')
  kuki.operatorTl = await masuk(TL, 'operator', 'tanjunglamo.desa.id', '10.12.0.4')
})
afterAll(async () => {
  await uji?.tutup()
})

const galat = async (r: Response) => galatSchema.parse(await r.json()).error
const unggahCsv = async (nama: string, isi: Uint8Array, k = kuki.operator): Promise<LaporanImpor> => {
  const formulir = new FormData()
  formulir.append('berkas', new File([Buffer.from(isi)], nama))
  const r = await app.fetch(new Request(`${SS}/api/v1/impor/penduduk`, { method: 'POST', headers: { Origin: SS, Cookie: k }, body: formulir }))
  expect(r.status).toBe(201)
  return laporanImporSchema.parse(await r.json())
}
const unggahContoh = async (): Promise<LaporanImpor> => {
  const r = await kirimJson(app, SS, '/api/v1/impor/penduduk', { contoh: true }, kuki.operator)
  expect(r.status).toBe(201)
  return laporanImporSchema.parse(await r.json())
}
const konfirmasi = async (id: string, badan: unknown, k: string | null = kuki.operator, basis = SS) =>
  kirimJson(app, basis, `/api/v1/impor/penduduk/${id}/konfirmasi`, badan, k)
const masukanDari = (lap: LaporanImpor, lewati: number[] = [], perbaikan: KonfirmasiImpor['perbaikan'] = {}): KonfirmasiImpor => ({
  pemetaan: lap.kolom.map((k) => k.field),
  perbaikan,
  lewati,
})
const hitung = async (tabel: string): Promise<number> => (await uji.sqlMigrasi.unsafe(`select count(*)::int as n from ${tabel}`))[0].n as number

const KEPALA = ['NIK', 'Nama Lengkap', 'JK', 'Tmp Lahir', 'Tgl. Lahir', 'Agama', 'SHDK', 'No. KK', 'Dusun', 'RW', 'RT']
let urutNik = 2000
let urutKk = 100
/** Satu KK sah (kepala, istri, anak) di Dusun III RW 005 RT 011, dengan NIK dan nomor KK baru yang belum terdaftar. */
function kkBaru(nama: string): string[][] {
  urutKk += 1
  const kk = `140509150624${String(urutKk).padStart(4, '0')}`
  const nik = (lahir: string, jk: 'L' | 'P') => buatNik({ kodeWilayah: '140509', tanggalLahir: lahir, jenisKelamin: jk, nomorUrut: (urutNik += 1) })
  const baris = (jk: 'L' | 'P', lahir: string, label: string, hubungan: string, tgl: string) => [nik(lahir, jk), `${nama} ${label}`, jk, 'Teluk', tgl, 'Islam', hubungan, kk, '3', '005', '011']
  return [baris('L', '1985-03-10', 'Kepala', 'Kepala Keluarga', '10-03-1985'), baris('P', '1987-05-12', 'Istri', 'Istri', '12-05-1987'), baris('L', '2015-08-20', 'Anak', 'Anak', '20-08-2015')]
}
const csv = (baris: string[][]) => buatCsvUji([KEPALA, ...baris], { pemisah: ';' })

describe('POST /impor/penduduk/:id/konfirmasi: berkas contoh (SPEC-V0.2 §6.8)', () => {
  it('baris bermasalah yang belum dilewati → 422 per baris, dan tidak ada yang tertulis', async () => {
    const lap = await unggahContoh()
    const sebelum = await hitung('penduduk')
    const r = await konfirmasi(lap.id, masukanDari(lap))
    expect(r.status).toBe(422)
    const g = await galat(r)
    expect(g.code).toBe('VALIDATION')
    expect(Object.keys(g.fields ?? {})).toEqual(BERMASALAH.map((n) => `baris.${n}`))
    expect(g.message).toBe('5 baris masih bermasalah.')
    expect(await hitung('penduduk')).toBe(sebelum)
  })

  it('lewati lima baris itu → 12 penduduk dan 4 KK, tercatat; konfirmasi kedua → 409', async () => {
    const lap = await unggahContoh()
    const pendudukSebelum = await hitung('penduduk')
    const kkSebelum = await hitung('keluarga')
    const r = await konfirmasi(lap.id, masukanDari(lap, BERMASALAH))
    expect(r.status).toBe(201)
    const hasil = hasilImporSchema.parse(await r.json())
    expect(hasil).toMatchObject({ penduduk: 12, keluarga: 4, dilewati: 5 })
    expect(hasil.laporan).toHaveLength(17)
    expect(hasil.laporan.filter((b) => b.status === 'dilewati').map((b) => b.nomor)).toEqual(BERMASALAH)
    expect(hasil.laporan.filter((b) => b.status === 'ditambahkan').every((b) => b.keterangan.length > 0)).toBe(true)
    expect(await hitung('penduduk')).toBe(pendudukSebelum + 12)
    expect(await hitung('keluarga')).toBe(kkSebelum + 4)

    const [akt] = await uji.sqlMigrasi`select ringkasan, jenis from aktivitas where jenis = 'penduduk-impor' order by waktu desc limit 1`
    expect(akt.ringkasan).toBe('Impor penduduk · 12 penduduk, 4 KK (pendataan-rt-teluk-rengas.xlsx)')
    const [sesi] = await uji.sqlMigrasi`select isi, selesai_pada from impor_penduduk where id = ${lap.id}`
    expect(sesi.isi).toBeNull()
    expect(sesi.selesai_pada).not.toBeNull()

    const lagi = await konfirmasi(lap.id, masukanDari(lap, BERMASALAH))
    expect(lagi.status).toBe(409)
    expect((await galat(lagi)).message).toBe('Impor ini sudah dijalankan.')
  })

  it('KK hasil impor: kepala di urutan pertama, alamat semua anggota = alamat KK, status Hidup, tanggal terbit dari nomor KK, NIK tersandi', async () => {
    const lap = await unggahCsv('kk-uji.csv', csv(kkBaru('Uji Satu')))
    const nomorKk = lap.baris[0].sel[7]
    const nik = lap.baris[0].sel[0]
    expect((await konfirmasi(lap.id, masukanDari(lap))).status).toBe(201)
    const [kk] = await uji.sqlMigrasi`select id, kepala_keluarga_id, dusun_id, rw, rt, tanggal_terbit::text as terbit, nomor_kk_sandi from keluarga
      where nomor_kk_indeks = ${penyandi.indeks(nomorKk, ruang.nomorKk(ID_SUNGAI_SIALANG))}`
    expect(kk).toBeDefined()
    expect(kk.terbit).toBe('2024-06-15')
    expect(String(kk.nomor_kk_sandi).startsWith('v1.')).toBe(true)
    const anggota = await uji.sqlMigrasi`select id, nama, hubungan_keluarga, urutan_kk, status_dasar, dusun_id, rw, rt, nik_sandi, nik_indeks, ktp_el from penduduk where keluarga_id = ${kk.id} order by urutan_kk`
    expect(anggota.map((a) => [a.hubungan_keluarga, a.urutan_kk])).toEqual([['Kepala Keluarga', 0], ['Istri', 1], ['Anak', 2]])
    expect(kk.kepala_keluarga_id).toBe(anggota[0].id)
    expect(anggota.every((a) => a.status_dasar === 'Hidup' && a.dusun_id === kk.dusun_id && a.rw === kk.rw && a.rt === kk.rt)).toBe(true)
    expect(anggota.map((a) => a.ktp_el)).toEqual(['Sudah rekam', 'Sudah rekam', 'Belum wajib'])
    expect(anggota[0].nik_indeks).toBe(penyandi.indeks(nik, ruang.nik(ID_SUNGAI_SIALANG)))
    expect(String(anggota[0].nik_sandi).startsWith('v1.')).toBe(true)
    // NIK tidak polos di mana pun yang baru ditulis, dan bisa dicari lewat cek NIK.
    const [semua] = await uji.sqlMigrasi`select count(*)::int as n from penduduk where id = any(${anggota.map((a) => a.id as string)}) and row_to_json(penduduk)::text ~ ${nik}`
    expect(semua.n).toBe(0)
    expect(log.join('\n')).not.toContain(nik)
    const cek = await kirimJson(app, SS, '/api/v1/penduduk/cek-nik', { nik }, kuki.operator)
    expect(((await cek.json()) as { terdaftar: boolean }).terdaftar).toBe(true)
  })

  it('kepala boleh di baris mana pun dalam KK: tetap menjadi anggota pertama', async () => {
    const [kepala, istri, anak] = kkBaru('Urutan')
    const lap = await unggahCsv('urutan.csv', csv([anak, istri, kepala]))
    expect((await konfirmasi(lap.id, masukanDari(lap))).status).toBe(201)
    const [kk] = await uji.sqlMigrasi`select id, kepala_keluarga_id from keluarga where nomor_kk_indeks = ${penyandi.indeks(kepala[7], ruang.nomorKk(ID_SUNGAI_SIALANG))}`
    const anggota = await uji.sqlMigrasi`select hubungan_keluarga, nama from penduduk where keluarga_id = ${kk.id} order by urutan_kk`
    expect(anggota.map((a) => a.hubungan_keluarga)).toEqual(['Kepala Keluarga', 'Anak', 'Istri'])
  })

  it('perbaikan per baris membuat baris bermasalah lolos', async () => {
    const baris = kkBaru('Perbaikan')
    baris[1][4] = '99-99-1987'
    const lap = await unggahCsv('perbaikan.csv', csv(baris))
    const gagal = await konfirmasi(lap.id, masukanDari(lap))
    expect(gagal.status).toBe(422)
    expect(Object.keys((await galat(gagal)).fields ?? {})).toEqual(['baris.3'])
    const ok = await konfirmasi(lap.id, masukanDari(lap, [], { '3': { tanggalLahir: '12-05-1987' } }))
    expect(ok.status).toBe(201)
    expect(hasilImporSchema.parse(await ok.json())).toMatchObject({ penduduk: 3, keluarga: 1 })
  })
})

describe('POST /impor/penduduk/:id/konfirmasi: urutan penolakan', () => {
  it('sesi tidak ada, milik desa lain, atau kedaluwarsa → 404', async () => {
    const tak = await konfirmasi('imp_tidak-ada', { pemetaan: [], perbaikan: {}, lewati: [] })
    expect(tak.status).toBe(404)
    expect((await galat(tak)).message).toBe('Data impor tidak ditemukan. Unggah ulang berkasnya.')
    const lap = await unggahContoh()
    expect((await konfirmasi(lap.id, masukanDari(lap, BERMASALAH), kuki.operatorTl, TL)).status).toBe(404)
    await uji.sqlMigrasi`update impor_penduduk set dibuat_pada = ${new Date(SEKARANG_UJI.getTime() - 25 * JAM)} where id = ${lap.id}`
    expect((await konfirmasi(lap.id, masukanDari(lap, BERMASALAH))).status).toBe(404)
  })

  it('isian tidak valid → 422 berfield; pemetaan tidak lengkap atau berlebih → Pemetaan kolom belum lengkap.', async () => {
    const lap = await unggahContoh()
    const rusak = await konfirmasi(lap.id, { pemetaan: 'x', perbaikan: {}, lewati: [] })
    expect(rusak.status).toBe(422)
    expect((await galat(rusak)).fields).toBeDefined()
    const m = masukanDari(lap, BERMASALAH)
    const tanpaNik = { ...m, pemetaan: m.pemetaan.map((f) => (f === 'nik' ? null : f)) }
    const pendek = { ...m, pemetaan: m.pemetaan.slice(0, 5) }
    const ganda = { ...m, pemetaan: m.pemetaan.map((f) => (f === 'nama' ? 'nik' : f)) }
    for (const badan of [tanpaNik, pendek, ganda]) {
      const r = await konfirmasi(lap.id, badan)
      expect(r.status).toBe(422)
      expect((await galat(r)).message).toBe('Pemetaan kolom belum lengkap.')
    }
    // Berkas contoh sudah pernah diimpor di uji sebelumnya, jadi NIK-nya kini terdaftar: ditolak per baris, sesi tetap terbuka.
    const lagi = await konfirmasi(lap.id, m)
    expect(lagi.status).toBe(422)
    const [sesi] = await uji.sqlMigrasi`select selesai_pada from impor_penduduk where id = ${lap.id}`
    expect(sesi.selesai_pada).toBeNull()
  })

  it('semua baris dilewati → Tidak ada baris yang siap diimpor.', async () => {
    const lap = await unggahCsv('lewati.csv', csv(kkBaru('Lewati')))
    const r = await konfirmasi(lap.id, masukanDari(lap, lap.baris.map((b) => b.nomor)))
    expect(r.status).toBe(422)
    expect((await galat(r)).message).toBe('Tidak ada baris yang siap diimpor.')
  })

  it('Kepala Desa dan Kepala Dusun 403, tanpa sesi 401, dan tidak ada yang berubah', async () => {
    const lap = await unggahCsv('hak.csv', csv(kkBaru('Hak')))
    for (const k of [kuki.kades, kuki.kadus]) {
      const r = await konfirmasi(lap.id, masukanDari(lap), k)
      expect(r.status).toBe(403)
      expect((await galat(r)).message).toBe('Peran Anda tidak berhak mengubah data kependudukan.')
    }
    expect((await konfirmasi(lap.id, masukanDari(lap), null)).status).toBe(401)
    const [sesi] = await uji.sqlMigrasi`select selesai_pada from impor_penduduk where id = ${lap.id}`
    expect(sesi.selesai_pada).toBeNull()
  })
})

describe('POST /impor/penduduk/:id/konfirmasi: kerja serentak (Fokus 3-5)', () => {
  /** Menahan transaksi uji yang menulis sesuatu tanpa commit, sampai `lepas` dipanggil. */
  async function tahan(tulis: (sql: typeof uji.sqlMigrasi) => Promise<unknown>): Promise<{ selesaikan: () => Promise<void> }> {
    const sambungan = await uji.sqlMigrasi.reserve()
    await sambungan`begin`
    await tulis(sambungan as unknown as typeof uji.sqlMigrasi)
    return {
      selesaikan: async () => {
        await sambungan`commit`
        sambungan.release()
      },
    }
  }
  const tunda = (ms: number) => new Promise((r) => setTimeout(r, ms))

  it('sesi ditahan transaksi lain: konfirmasi menunggu sampai kunci dilepas, lalu selesai (bukti kunci ada di uji "dibaca ulang" di bawah)', async () => {
    const lap = await unggahCsv('serentak.csv', csv(kkBaru('Serentak')))
    const sebelum = await hitung('keluarga')
    const penahan = await tahan((s) => s`select id from impor_penduduk where id = ${lap.id} for update`)
    let selesai = false
    const permintaan = konfirmasi(lap.id, masukanDari(lap)).then((r) => {
      selesai = true
      return r
    })
    await tunda(600)
    expect(selesai, 'konfirmasi harus menunggu kunci sesi').toBe(false)
    await penahan.selesaikan()
    expect((await permintaan).status).toBe(201)
    expect(await hitung('keluarga')).toBe(sebelum + 1)
  })

  it('dua konfirmasi bersamaan pada sesi yang sama: satu 201 dan satu 409, hanya satu KK', async () => {
    const lap = await unggahCsv('kembar.csv', csv(kkBaru('Kembar')))
    const sebelum = await hitung('keluarga')
    const [a, b] = await Promise.all([konfirmasi(lap.id, masukanDari(lap)), konfirmasi(lap.id, masukanDari(lap))])
    expect([a.status, b.status].sort()).toEqual([201, 409])
    expect(await hitung('keluarga')).toBe(sebelum + 1)
  })

  it('sesi yang ditandai selesai transaksi lain ketika konfirmasi menunggu → 409 (dibaca ulang setelah kunci)', async () => {
    const lap = await unggahCsv('dibaca-ulang.csv', csv(kkBaru('BacaUlang')))
    const sebelum = await hitung('keluarga')
    const penahan = await tahan((s) => s`update impor_penduduk set isi = null, selesai_pada = now() where id = ${lap.id}`)
    const permintaan = konfirmasi(lap.id, masukanDari(lap))
    await tunda(600)
    await penahan.selesaikan()
    const r = await permintaan
    expect(r.status).toBe(409)
    expect((await galat(r)).message).toBe('Impor ini sudah dijalankan.')
    expect(await hitung('keluarga')).toBe(sebelum)
  })

  it('dua sesi dari berkas yang sama: yang kedua 422 NIK terdaftar pada setiap barisnya, tidak ada KK ganda', async () => {
    const isi = csv(kkBaru('Dua Sesi'))
    const satu = await unggahCsv('sama.csv', isi)
    const dua = await unggahCsv('sama.csv', isi)
    expect(satu.id).not.toBe(dua.id)
    expect((await konfirmasi(satu.id, masukanDari(satu))).status).toBe(201)
    const sebelum = await hitung('keluarga')
    const r = await konfirmasi(dua.id, masukanDari(dua))
    expect(r.status).toBe(422)
    expect(Object.keys((await galat(r)).fields ?? {})).toEqual(['baris.2', 'baris.3', 'baris.4'])
    expect(await hitung('keluarga')).toBe(sebelum)
  })

  it('NIK didaftarkan pihak lain sesudah unggah → 422 pada barisnya', async () => {
    const baris = kkBaru('Didului')
    const lap = await unggahCsv('didului.csv', csv(baris))
    const [kk] = await uji.sqlMigrasi<KkUji[]>`select id, dusun_id, rw, rt from keluarga where desa_id = ${ID_SUNGAI_SIALANG} limit 1`
    await sisipOrang('pdk_didului', kk, baris[0][0])
    const r = await konfirmasi(lap.id, masukanDari(lap))
    expect(r.status).toBe(422)
    expect(Object.keys((await galat(r)).fields ?? {})).toEqual(['baris.2'])
  })

  it('tabrakan indeks NIK yang belum di-commit lawan → 409, tidak ada baris separuh masuk, sesi masih bisa diulang', async () => {
    const baris = kkBaru('Berebut')
    const lap = await unggahCsv('berebut.csv', csv(baris))
    const sebelum = { kk: await hitung('keluarga'), pdk: await hitung('penduduk'), akt: await hitung('aktivitas') }
    const [kk] = await uji.sqlMigrasi<KkUji[]>`select id, dusun_id, rw, rt from keluarga where desa_id = ${ID_SUNGAI_SIALANG} limit 1`
    const penahan = await tahan((s) => sisipOrangDengan(s, 'pdk_berebut', kk, baris[1][0]))
    const permintaan = konfirmasi(lap.id, masukanDari(lap))
    await tunda(700)
    await penahan.selesaikan()
    const r = await permintaan
    expect(r.status).toBe(409)
    expect((await galat(r)).message).toBe(PESAN_BENTROK)
    expect({ kk: await hitung('keluarga'), pdk: (await hitung('penduduk')) - 1, akt: await hitung('aktivitas') }).toEqual(sebelum)
    const [sesi] = await uji.sqlMigrasi`select selesai_pada, isi is not null as ada from impor_penduduk where id = ${lap.id}`
    expect(sesi).toMatchObject({ selesai_pada: null, ada: true })
  })

  async function sisipOrang(id: string, kk: KkUji, nik: string): Promise<void> {
    await sisipOrangDengan(uji.sqlMigrasi, id, kk, nik)
  }
  async function sisipOrangDengan(sql: typeof uji.sqlMigrasi, id: string, kk: KkUji, nik: string): Promise<void> {
    await sql`insert into penduduk (id, desa_id, nik_sandi, nik_indeks, nama, jenis_kelamin, golongan_darah, agama, kewarganegaraan, tempat_lahir, tanggal_lahir,
        keluarga_id, hubungan_keluarga, nama_ayah, nama_ibu, dusun_id, rw, rt, status_dasar, status_penduduk, ktp_el, dibuat_pada, diubah_pada)
      values (${id}, ${ID_SUNGAI_SIALANG}, 'sandi', ${penyandi.indeks(nik, ruang.nik(ID_SUNGAI_SIALANG))}, 'Pendahulu', 'L', 'O', 'Islam', 'WNI', 'Uji', '1990-01-01',
        ${kk.id}, 'Anak', 'A', 'I', ${kk.dusun_id}, ${kk.rw}, ${kk.rt}, 'Hidup', 'Tetap', 'Sudah rekam', now(), now())`
  }
})

describe('POST /impor/penduduk/:id/konfirmasi: gagal di tengah membatalkan semuanya (Fokus 5)', () => {
  async function pasangPemicu(nama: string, tabel: string, kondisi: string): Promise<() => Promise<void>> {
    await uji.sqlMigrasi.unsafe(
      `create function gagal_${nama}() returns trigger language plpgsql as $f$ begin if ${kondisi} then raise exception 'gagal uji ${nama}'; end if; return new; end $f$`,
    )
    await uji.sqlMigrasi.unsafe(`create trigger gagal_${nama} before insert on ${tabel} for each row execute function gagal_${nama}()`)
    return async () => {
      await uji.sqlMigrasi.unsafe(`drop trigger gagal_${nama} on ${tabel}`)
      await uji.sqlMigrasi.unsafe(`drop function gagal_${nama}()`)
    }
  }

  it('penyisipan kelompok kedua gagal → tak ada KK, penduduk, atau aktivitas tertinggal; sesi tetap bisa dikonfirmasi ulang', async () => {
    // 700 baris (±234 KK) melewati batas kelompok 500 baris: baris bernama GAGAL-UJI jatuh di kelompok kedua.
    const semua: string[][] = []
    for (let i = 0; i < 234; i += 1) semua.push(...kkBaru(`Massal${i}`))
    semua[650][1] = 'GAGAL-UJI'
    const lap = await unggahCsv('gagal-tengah.csv', csv(semua))
    const sebelum = { kk: await hitung('keluarga'), pdk: await hitung('penduduk'), akt: await hitung('aktivitas') }
    const lepas = await pasangPemicu('penduduk', 'penduduk', "new.nama = 'GAGAL-UJI'")
    try {
      const r = await konfirmasi(lap.id, masukanDari(lap))
      expect(r.status).toBe(500)
    } finally {
      await lepas()
    }
    expect({ kk: await hitung('keluarga'), pdk: await hitung('penduduk'), akt: await hitung('aktivitas') }).toEqual(sebelum)
    const [sesi] = await uji.sqlMigrasi`select selesai_pada, isi is not null as ada from impor_penduduk where id = ${lap.id}`
    expect(sesi).toMatchObject({ selesai_pada: null, ada: true })
    const ulang = await konfirmasi(lap.id, masukanDari(lap))
    expect(ulang.status).toBe(201)
    expect(hasilImporSchema.parse(await ulang.json()).penduduk).toBe(702)
  }, 120_000)

  it('aktivitas gagal ditulis → KK, penduduk, dan penandaan sesi ikut batal', async () => {
    const lap = await unggahCsv('gagal-aktivitas.csv', csv(kkBaru('Aktivitas')))
    const sebelum = { kk: await hitung('keluarga'), pdk: await hitung('penduduk') }
    const lepas = await pasangPemicu('aktivitas', 'aktivitas', "new.jenis = 'penduduk-impor'")
    try {
      expect((await konfirmasi(lap.id, masukanDari(lap))).status).toBe(500)
    } finally {
      await lepas()
    }
    expect({ kk: await hitung('keluarga'), pdk: await hitung('penduduk') }).toEqual(sebelum)
    const [sesi] = await uji.sqlMigrasi`select selesai_pada from impor_penduduk where id = ${lap.id}`
    expect(sesi.selesai_pada).toBeNull()
  })
})

describe('POST /impor/penduduk/:id/konfirmasi: berkas besar', () => {
  it('3.000 baris (1.000 KK) selesai dalam satu permintaan', async () => {
    const semua: string[][] = []
    for (let i = 0; i < 1000; i += 1) semua.push(...kkBaru(`Besar${i}`))
    const lap = await unggahCsv('besar.csv', csv(semua))
    expect(lap.baris).toHaveLength(3000)
    const sebelum = { kk: await hitung('keluarga'), pdk: await hitung('penduduk') }
    const r = await konfirmasi(lap.id, masukanDari(lap))
    expect(r.status).toBe(201)
    expect(hasilImporSchema.parse(await r.json())).toMatchObject({ penduduk: 3000, keluarga: 1000, dilewati: 0 })
    expect({ kk: await hitung('keluarga'), pdk: await hitung('penduduk') }).toEqual({ kk: sebelum.kk + 1000, pdk: sebelum.pdk + 3000 })
  }, 180_000)
})

describe('berkas contoh untuk pengujian pemilik (test/contoh)', () => {
  const baca = (nama: string): Uint8Array => new Uint8Array(readFileSync(fileURLToPath(new URL(`../../../test/contoh/${nama}`, import.meta.url))))

  it('impor-3-baris.csv dan .xlsx terbaca sama, dikenali kolomnya, dan lolos tanpa masalah sebagai satu KK tiga orang', async () => {
    const csvLap = await unggahCsv('impor-3-baris.csv', baca('impor-3-baris.csv'))
    const xlsxLap = await unggahCsv('impor-3-baris.xlsx', baca('impor-3-baris.xlsx'))
    expect(xlsxLap.kolom).toEqual(csvLap.kolom)
    expect(xlsxLap.baris).toEqual(csvLap.baris)
    expect(csvLap.kolom.every((k) => k.field !== null)).toBe(true)
    expect(csvLap.nikTerdaftar).toEqual([])
    const r = await konfirmasi(csvLap.id, masukanDari(csvLap))
    expect(r.status).toBe(201)
    expect(hasilImporSchema.parse(await r.json())).toMatchObject({ penduduk: 3, keluarga: 1, dilewati: 0 })
    // Isi xlsx sama dengan csv, jadi sesudah csv diimpor, xlsx ditolak karena NIK dan nomor KK-nya kini terdaftar.
    const ulang = await konfirmasi(xlsxLap.id, masukanDari(xlsxLap))
    expect(ulang.status).toBe(422)
  })
})

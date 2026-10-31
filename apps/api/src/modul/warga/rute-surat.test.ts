import { ID_SUNGAI_SIALANG } from '@sinfodes/demo/data/desa-demo'
import { SEKARANG_UJI } from '@sinfodes/demo/uji-akun'
import { galatSchema } from '@sinfodes/kontrak/api'
import { rataHariKerja } from '@sinfodes/kontrak/surat/waktu'
import { detailPermohonanWargaSchema, ringkasPermohonanWargaSchema } from '@sinfodes/kontrak/warga/permohonan'
import { jenisSuratWargaSchema } from '@sinfodes/kontrak/warga/ajukan'
import { keluargaWargaSchema } from '@sinfodes/kontrak/warga/keluarga'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buatDbUji, penyandiUji, type DbUji } from '../../../test/basisdata'
import { sisipkanDesaContoh } from '../../../test/data-contoh'
import { ambil, rakitApp, sisipAksesUji, sisipSesiBantuanUji, sisipSesiUji, sisipSesiWargaUji } from '../../../test/rakit-app'
import type { Penyandi } from '../../kripto/penyandi'
import { ruang } from '../../kripto/ruang'

const SS = 'http://sungaisialang.sinfodes.localhost'
const SITI = 'pdk_siti_rahmah'
const NUR_AINI = 'pdk_nur_aini'
const SYAHRIAL = 'pdk_syahrial'
const ZULKIFLI = 'pdk_zulkifli'
const PESAN_TIDAK_ADA = 'Permohonan tidak ditemukan.'
const HARI_MS = 86_400_000

let uji: DbUji
let penyandi: Penyandi
let app: ReturnType<typeof rakitApp>['app']
let kuki: Record<'siti' | 'syahrial' | 'zulkifli' | 'panel' | 'bantuan', string>
const id = { menunggu: '', selesai: '', ditolak: '', kembali: '', untukAnak: '', milikZulkifli: '', milikSyahrial: '', desaLain: '' }

let urut = 7000
const HURUF_KODE = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const kode4 = (n: number) => Array.from({ length: 4 }, (_, i) => HURUF_KODE[Math.floor(n / HURUF_KODE.length ** i) % HURUF_KODE.length]).join('')
/**
 * Menyalin satu baris permohonan semai dengan nilai yang ditimpa. Surat terbit mendapat nomor urut dan kode verifikasi baru
 * supaya tidak bentrok dengan indeks unik; lembar dan isian tetap tersandi utuh dari baris asal.
 */
const salin = async (seed: string, ubah: Record<string, unknown>): Promise<string> => {
  urut += 1
  const baru = `srt_uji_${urut}`
  const timpa = uji.sqlMigrasi.json({ id: baru, tahun: 2098, no_urut: urut, ...ubah } as never)
  const terbit = uji.sqlMigrasi.json({ terbit_urut: 90_000 + urut, terbit_kode: `UJI-${kode4(urut)}-ZZZZ` })
  await uji.sqlMigrasi`insert into permohonan
    select (jsonb_populate_record(null::permohonan, to_jsonb(s) || ${timpa}::jsonb || case when s.terbit_urut is not null then ${terbit}::jsonb else '{}'::jsonb end)).*
    from permohonan s where s.id = ${seed}`
  return baru
}
const tambahRiwayat = async (permohonanId: string, kejadian: string, oleh: { id: string; nama: string }, catatan: string | null = null) => {
  await uji.sqlMigrasi`insert into riwayat_surat (id, desa_id, permohonan_id, kejadian, waktu, oleh, catatan)
    values (${`rws_uji_${urut}_${kejadian}_${Math.random().toString(36).slice(2, 8)}`}, ${ID_SUNGAI_SIALANG}, ${permohonanId}, ${kejadian}, now(), ${uji.sqlMigrasi.json(oleh as never)}, ${catatan})`
}
const benih = async (status: string, tambahan = ''): Promise<string> => {
  const [b] = await uji.sqlMigrasi.unsafe(`select id from permohonan where desa_id = '${ID_SUNGAI_SIALANG}' and status = '${status}' ${tambahan} order by id limit 1`)
  return b.id as string
}

beforeAll(async () => {
  uji = await buatDbUji()
  penyandi = await penyandiUji(uji.sqlMigrasi)
  app = rakitApp({ klien: uji.klien, penyandi }).app
  const dibuat = new Date(SEKARANG_UJI.getTime() - 3600_000)
  const warga = async (pendudukId: string) => (await sisipSesiWargaUji(uji.sqlMigrasi, { pendudukId, desaId: ID_SUNGAI_SIALANG, dibuat })).kuki
  const [siti, syahrial, zulkifli] = [await warga(SITI), await warga(SYAHRIAL), await warga(ZULKIFLI)]
  const panel = (await sisipSesiUji(uji.sqlMigrasi, { penggunaId: 'pgn_rosmiati', desaId: ID_SUNGAI_SIALANG, dibuat })).kuki
  const akses = await sisipAksesUji(uji.sqlMigrasi, { desaId: ID_SUNGAI_SIALANG })
  const bantuan = (await sisipSesiBantuanUji(uji.sqlMigrasi, { desaId: ID_SUNGAI_SIALANG, aksesId: akses.id, dibuat })).kuki
  kuki = { siti, syahrial, zulkifli, panel, bantuan }

  // Bahan uji disalin dari baris semai yang sudah utuh (lembar dan isian tersandi), lalu dialihkan ke warga uji.
  const seed = {
    selesai: await benih('selesai', `and terbit_mode = 'tte'`),
    ditolak: await benih('ditolak'),
    diproses: await benih('diproses', `and dikembalikan is null`),
  }
  id.selesai = await salin(seed.selesai, { pemohon_id: SITI, subjek_id: null, masuk_pada: '2098-05-01T10:00:00+07:00', kanal: 'online' })
  id.ditolak = await salin(seed.ditolak, { pemohon_id: SITI, subjek_id: null, masuk_pada: '2098-05-03T10:00:00+07:00' })
  id.menunggu = await salin(seed.diproses, {
    pemohon_id: SITI, subjek_id: null, status: 'menunggu', tahap: null, dikembalikan: null, masuk_pada: '2098-05-05T10:00:00+07:00', kanal: 'online',
  })
  id.kembali = await salin(seed.diproses, {
    pemohon_id: SITI, subjek_id: null, dikembalikan: { oleh: { id: 'pgn_x', nama: 'Petugas' }, pada: '2098-05-06T10:00:00+07:00', catatan: 'Foto KTP buram, minta ulang' },
    masuk_pada: '2098-05-06T10:00:00+07:00',
  })
  await tambahRiwayat(id.kembali, 'kembalikan', { id: 'pgn_x', nama: 'Petugas' }, 'Catatan antarpetugas: jangan diteruskan ke warga')
  // Siti mengajukan untuk anak (pemohon Nur Aini, tanpa akun): milik Siti lewat riwayat "diajukan".
  id.untukAnak = await salin(seed.diproses, { pemohon_id: NUR_AINI, subjek_id: null, status: 'menunggu', tahap: null, dikembalikan: null, masuk_pada: '2098-05-07T10:00:00+07:00', kanal: 'online' })
  await tambahRiwayat(id.untukAnak, 'diajukan', { id: SITI, nama: 'Siti Rahmah' })
  // Bukan milik Siti: pemohon KK lain, dan permohonan anggota KK-nya sendiri yang diajukan orang lain.
  id.milikZulkifli = await salin(seed.diproses, { pemohon_id: ZULKIFLI, subjek_id: null, masuk_pada: '2098-05-08T10:00:00+07:00' })
  id.milikSyahrial = await salin(seed.diproses, { pemohon_id: SYAHRIAL, subjek_id: null, masuk_pada: '2098-05-09T10:00:00+07:00' })
  // Desa lain dengan satu permohonan: Siti tidak boleh bisa membacanya walau id-nya diketahui.
  await sisipkanDesaContoh(uji.sqlMigrasi, 'desa_uji_lain', 2)
  await uji.sqlMigrasi.unsafe(
    `insert into jenis_surat (id, desa_id, kode, nama, klasifikasi, subjek, isian, boleh_atas_nama, wajib_paraf, online, syarat, teks, aktif, asal)
     values ('js_uji_lain', 'desa_uji_lain', 'SKD', 'Surat Keterangan Domisili', '470', 'pemohon', '[]'::jsonb, false, false, true, '[]'::jsonb, 'Teks', true, 'desa')`,
  )
  await uji.sqlMigrasi.unsafe(
    `insert into permohonan (id, desa_id, dusun_id, tahun, no_urut, jenis_id, kanal, pemohon_id, isian_sandi, status, masuk_pada)
     values ('srt_uji_desa_lain', 'desa_uji_lain', 'dsn_desa_uji_lain', 2098, 1, 'js_uji_lain', 'online', 'pdk_desa_uji_lain_1', 'v1.abc', 'menunggu', now())`,
  )
  id.desaLain = 'srt_uji_desa_lain'
})
afterAll(async () => {
  await uji?.tutup()
})

const get = (jalur: string, k: string | null) => ambil(app, `${SS}/api/v1/warga${jalur}`, k)
const galat = async (r: Response) => galatSchema.parse(await r.json()).error

const SQL_MILIK = (pendudukId: string) => `(pemohon_id = '${pendudukId}' or id in (select permohonan_id from riwayat_surat where kejadian = 'diajukan' and oleh ->> 'id' = '${pendudukId}'))`

describe('akses ke rute layanan warga', () => {
  const rute = ['/jenis-surat', '/keluarga', '/permohonan', '/permohonan/srt_x']
  it.each(rute)('tanpa sesi: 401 (%s)', async (jalur) => {
    expect((await get(jalur, null)).status).toBe(401)
  })
  it.each(rute)('sesi panel dan sesi bantuan tidak berlaku di rute warga: 401 (%s)', async (jalur) => {
    expect((await get(jalur, kuki.panel)).status).toBe(401)
    expect((await get(jalur, kuki.bantuan)).status).toBe(401)
  })
})

describe('GET /warga/jenis-surat', () => {
  it('hanya jenis online yang dilayani desa; bentuk lolos skema kontrak', async () => {
    const res = await get('/jenis-surat', kuki.siti)
    expect(res.status).toBe(200)
    const data = jenisSuratWargaSchema.array().parse(await res.json())
    const harapan = await uji.sqlMigrasi`select kode from jenis_surat where desa_id = ${ID_SUNGAI_SIALANG} and online and aktif and diarsipkan is null order by urutan`
    expect(data.map((j) => j.kode)).toEqual(harapan.map((j) => j.kode))
    expect(data.length).toBeGreaterThan(5)
    const kode = data.map((j) => j.kode)
    for (const tertutup of ['SKM', 'SPP', 'SPN']) expect(kode).not.toContain(tertutup)
    expect(data.find((j) => j.kode === 'SKL')?.subjek).toBe('kelahiran')
  })

  it('jenis nonaktif, diarsipkan, atau tidak online tidak muncul; yang online dan aktif muncul', async () => {
    const jenis = (kode: string, ubah: { aktif?: boolean; online?: boolean; arsip?: boolean }) =>
      uji.sqlMigrasi`insert into jenis_surat (id, desa_id, kode, nama, klasifikasi, subjek, isian, boleh_atas_nama, wajib_paraf, online, syarat, teks, aktif, asal, diarsipkan)
        values (${`js_uji_${kode}`}, ${ID_SUNGAI_SIALANG}, ${kode}, ${`Surat Uji ${kode}`}, '470', 'pemohon', '[]'::jsonb, false, false, ${ubah.online ?? true}, '[]'::jsonb, 'Teks',
          ${ubah.aktif ?? true}, 'desa', ${ubah.arsip ? new Date() : null})`
    await jenis('XTO', {})
    await jenis('XTN', { aktif: false })
    await jenis('XTA', { aktif: false, arsip: true })
    await jenis('XTF', { online: false })
    const kode = jenisSuratWargaSchema.array().parse(await (await get('/jenis-surat', kuki.siti)).json()).map((j) => j.kode)
    expect(kode).toContain('XTO')
    for (const tertutup of ['XTN', 'XTA', 'XTF']) expect(kode).not.toContain(tertutup)
  })

  it('perkiraan hari kerja: null tanpa contoh; angka dari surat Selesai 90 hari terakhir; surat 91 hari lalu tidak dihitung', async () => {
    await uji.sqlMigrasi`insert into jenis_surat (id, desa_id, kode, nama, klasifikasi, subjek, isian, boleh_atas_nama, wajib_paraf, online, syarat, teks, aktif, asal)
      values ('js_uji_perkiraan', ${ID_SUNGAI_SIALANG}, 'XTP', 'Surat Uji Perkiraan', '470', 'pemohon', '[]'::jsonb, false, false, true, '[]'::jsonb, 'Teks', true, 'desa')`
    const perkiraan = async () =>
      jenisSuratWargaSchema.array().parse(await (await get('/jenis-surat', kuki.siti)).json()).find((j) => j.kode === 'XTP')?.perkiraanHariKerja
    expect(await perkiraan()).toBeNull()

    const benihSelesai = await benih('selesai', `and terbit_mode = 'tte'`)
    // SEKARANG_UJI = Kamis 24 Sep 2026 09.00 WIB. Terbit 1 hari lalu sesudah masuk 5 hari lalu (3 hari kerja), dan tepat 91 hari lalu.
    const hari = (n: number) => new Date(SEKARANG_UJI.getTime() - n * HARI_MS).toISOString()
    const terbitBaru = await salin(benihSelesai, { jenis_id: 'js_uji_perkiraan', masuk_pada: hari(5), terbit_pada: hari(1) })
    expect(terbitBaru).toBeTruthy()
    const diharapkan = rataHariKerja([{ masukPada: hari(5), terbitPada: hari(1) }])
    expect(diharapkan).not.toBeNull()
    expect(await perkiraan()).toBe(diharapkan)

    // Surat 91 hari lalu di luar jendela: perkiraan tidak berubah walau lamanya sangat berbeda.
    await salin(benihSelesai, { jenis_id: 'js_uji_perkiraan', masuk_pada: hari(120), terbit_pada: hari(91) })
    expect(await perkiraan()).toBe(diharapkan)
    // Surat 89 hari lalu masuk hitungan.
    await salin(benihSelesai, { jenis_id: 'js_uji_perkiraan', masuk_pada: hari(100), terbit_pada: hari(89) })
    expect(await perkiraan()).toBe(rataHariKerja([{ masukPada: hari(5), terbitPada: hari(1) }, { masukPada: hari(100), terbitPada: hari(89) }]))
    // Surat yang kemudian dibatalkan (bukan Selesai) tidak dihitung walau masih dalam jendela.
    await salin(benihSelesai, {
      jenis_id: 'js_uji_perkiraan', masuk_pada: hari(80), terbit_pada: hari(70), status: 'dibatalkan',
      pembatalan: { oleh: { id: 'pgn_x', nama: 'Petugas' }, pada: hari(60), catatan: 'Uji' },
    })
    expect(await perkiraan()).toBe(rataHariKerja([{ masukPada: hari(5), terbitPada: hari(1) }, { masukPada: hari(100), terbitPada: hari(89) }]))
  })
})

describe('GET /warga/keluarga', () => {
  it('hanya anggota Hidup KK warga, NIK dan telepon terbuka, umur dalam bulan, nomor KK dan alamat; lolos skema', async () => {
    const res = await get('/keluarga', kuki.siti)
    expect(res.status).toBe(200)
    const kk = keluargaWargaSchema.parse(await res.json())
    expect(kk.anggota.map((a) => a.id).sort()).toEqual(['pdk_muhammad_alif', 'pdk_nur_aini', 'pdk_siti_rahmah', 'pdk_syahrial'])
    expect(kk.anggota[0].hubunganKeluarga).toBe('Kepala Keluarga')
    for (const a of kk.anggota) expect(a.nik).toMatch(/^\d{16}$/)
    const alif = kk.anggota.find((a) => a.id === 'pdk_muhammad_alif')!
    const siti = kk.anggota.find((a) => a.id === SITI)!
    expect(alif.umurBulan).toBeLessThan(36)
    expect(siti.umurBulan).toBeGreaterThan(12 * 30)
    const [baris] = await uji.sqlMigrasi`select nomor_kk_sandi from keluarga where id = 'kk_syahrial'`
    expect(kk.nomorKk).toBe(penyandi.bukaSandi(baris.nomor_kk_sandi as string, ruang.nomorKk(ID_SUNGAI_SIALANG)))
    expect(kk.alamat).toMatch(/Desa Sungai Sialang$/)
    expect(kk.alamat).toMatch(/RT \d+\/RW \d+/)
  })

  it('anggota yang meninggal atau pindah tidak ikut; KK lain tidak bocor', async () => {
    await uji.sqlMigrasi`update penduduk set status_dasar = 'Meninggal' where id = 'pdk_muhammad_alif'`
    try {
      const kk = keluargaWargaSchema.parse(await (await get('/keluarga', kuki.siti)).json())
      expect(kk.anggota.map((a) => a.id)).not.toContain('pdk_muhammad_alif')
      const lain = keluargaWargaSchema.parse(await (await get('/keluarga', kuki.zulkifli)).json())
      expect(lain.anggota.some((a) => kk.anggota.map((x) => x.id).includes(a.id))).toBe(false)
      expect(lain.nomorKk).not.toBe(kk.nomorKk)
    } finally {
      await uji.sqlMigrasi`update penduduk set status_dasar = 'Hidup' where id = 'pdk_muhammad_alif'`
    }
  })

  it('laporan hanya milik warga ini, terbaru dulu, dengan nama penduduk dan alasan hanya bila ditolak', async () => {
    // Pembuat laporan (POST /warga/laporan-data) baru ada di 8G: baris disisipkan lewat SQL pemilik skema.
    const [dusun] = await uji.sqlMigrasi`select dusun_id from penduduk where id = ${SITI}`
    const sisip = (kode: string, pelaku: string, nama: string, status: string, dibuat: string, alasan: string | null) =>
      uji.sqlMigrasi`insert into laporan_data (id, desa_id, dusun_id, dibuat_pada, pelapor_penduduk_id, pelapor_nama, status, ditangani_oleh_id, ditangani_oleh_nama, ditangani_pada, ditangani_alasan, isi)
        values (${kode}, ${ID_SUNGAI_SIALANG}, ${dusun.dusun_id}, ${dibuat}, ${pelaku}, ${nama}, ${status},
          ${status === 'baru' ? null : 'pgn_x'}, ${status === 'baru' ? null : 'Petugas'}, ${status === 'baru' ? null : dibuat}, ${alasan},
          ${uji.sqlMigrasi.json({ jenis: 'perbaikan', pendudukId: NUR_AINI, field: 'agama', nilaiBaru: 'Islam', catatan: null } as never)})`
    await sisip('lap_uji_a', SITI, 'Siti Rahmah', 'ditolak', '2098-06-01T10:00:00+07:00', 'Data sudah sesuai KK')
    await sisip('lap_uji_b', SITI, 'Siti Rahmah', 'baru', '2098-06-02T10:00:00+07:00', null)
    await sisip('lap_uji_c', ZULKIFLI, 'Zulkifli', 'baru', '2098-06-03T10:00:00+07:00', null)
    const kk = keluargaWargaSchema.parse(await (await get('/keluarga', kuki.siti)).json())
    const kode = kk.laporan.map((l) => l.id)
    expect(kode).not.toContain('lap_uji_c')
    expect(kode.indexOf('lap_uji_b')).toBeLessThan(kode.indexOf('lap_uji_a'))
    expect(kk.laporan.find((l) => l.id === 'lap_uji_a')).toMatchObject({ namaPenduduk: 'Nur Aini', status: 'ditolak', alasanDitolak: 'Data sudah sesuai KK' })
    expect(kk.laporan.find((l) => l.id === 'lap_uji_b')).toMatchObject({ status: 'baru', alasanDitolak: null })
  })
})

describe('GET /warga/permohonan dan /warga/permohonan/:id', () => {
  it('daftar hanya milik warga (pemohon atau pengaju), terbaru dulu; bentuk lolos skema; meta tanpa halaman', async () => {
    const res = await get('/permohonan', kuki.siti)
    expect(res.status).toBe(200)
    const badan = (await res.json()) as { data: unknown[]; meta: { page: number; pageSize: number; total: number } }
    const data = ringkasPermohonanWargaSchema.array().parse(badan.data)
    const harapan = await uji.sqlMigrasi.unsafe(
      `select id from permohonan where desa_id = '${ID_SUNGAI_SIALANG}' and ${SQL_MILIK(SITI)} order by masuk_pada desc, id`,
    )
    expect(data.map((p) => p.id)).toEqual(harapan.map((p) => p.id as string))
    expect(badan.meta).toEqual({ page: 1, pageSize: Math.max(data.length, 1), total: data.length })
    for (const milik of [id.selesai, id.ditolak, id.menunggu, id.kembali, id.untukAnak]) expect(data.map((p) => p.id)).toContain(milik)
    for (const bukan of [id.milikZulkifli, id.milikSyahrial, id.desaLain]) expect(data.map((p) => p.id)).not.toContain(bukan)
    // Yang diajukan untuk anak tampil dengan nama anak.
    expect(data.find((p) => p.id === id.untukAnak)?.untuk).toEqual({ id: NUR_AINI, nama: 'Nur Aini' })
  })

  it('ringkasan: posisi, tiket, nomor hanya pada yang terbit, dikembalikan, dan urutan terbaru dulu', async () => {
    const data = ringkasPermohonanWargaSchema.array().parse(((await (await get('/permohonan', kuki.siti)).json()) as { data: unknown[] }).data)
    const per = (x: string) => data.find((p) => p.id === x)!
    const [noUrut] = await uji.sqlMigrasi`select no_urut from permohonan where id = ${id.menunggu}`
    expect(per(id.menunggu)).toMatchObject({
      status: 'menunggu', posisi: 'menunggu diperiksa petugas desa', nomor: null, tiket: `2098-${noUrut.no_urut}`, dikembalikan: false,
    })
    expect(per(id.kembali)).toMatchObject({ status: 'diproses', dikembalikan: true, posisi: 'sedang diperbaiki petugas desa' })
    expect(per(id.selesai).nomor).toMatch(/\S/)
    expect(per(id.selesai).posisi).toMatch(/^selesai/)
    expect(per(id.ditolak)).toMatchObject({ status: 'ditolak', posisi: 'ditolak', nomor: null })
    const urutan = data.map((p) => p.masukPada)
    expect([...urutan].sort().reverse()).toEqual(urutan)
  })

  it('detail permohonan milik sendiri: isian, riwayat tanpa catatan antarpetugas, alasan hanya pada ditolak, terbit hanya pada Selesai', async () => {
    const ditolak = detailPermohonanWargaSchema.parse(await (await get(`/permohonan/${id.ditolak}`, kuki.siti)).json())
    expect(ditolak.permohonan.alasanDitolak).toMatch(/\S/)
    expect(ditolak.terbit).toBeNull()
    expect(ditolak.permohonan.diambilPada).toBeNull()

    const kembali = detailPermohonanWargaSchema.parse(await (await get(`/permohonan/${id.kembali}`, kuki.siti)).json())
    expect(kembali.permohonan.alasanDitolak).toBeNull()
    expect(kembali.permohonan.riwayat.find((e) => e.kejadian === 'kembalikan')?.catatan).toBeNull()
    expect(JSON.stringify(kembali)).not.toContain('Catatan antarpetugas')
    expect(kembali.terbit).toBeNull()

    const selesai = detailPermohonanWargaSchema.parse(await (await get(`/permohonan/${id.selesai}`, kuki.siti)).json())
    expect(selesai.terbit?.lembar).toBeTruthy()
    expect(selesai.terbit?.nomor).toBe(selesai.permohonan.nomor)
    expect(selesai.jenis.kode).toBe(selesai.permohonan.jenis.kode)
  })

  it('detail permohonan yang diajukan untuk anggota keluarga terbuka bagi pengajunya', async () => {
    const res = await get(`/permohonan/${id.untukAnak}`, kuki.siti)
    expect(res.status).toBe(200)
    expect(detailPermohonanWargaSchema.parse(await res.json()).permohonan.untuk.id).toBe(NUR_AINI)
  })

  it('milik warga lain, anggota KK yang sama, desa lain, dan id yang tidak ada: 404 dengan badan yang sama persis', async () => {
    const badan: string[] = []
    for (const [k, x] of [[kuki.siti, id.milikZulkifli], [kuki.siti, id.milikSyahrial], [kuki.siti, id.desaLain], [kuki.siti, 'srt_tidak_ada'], [kuki.zulkifli, id.selesai], [kuki.syahrial, id.menunggu]] as const) {
      const res = await get(`/permohonan/${x}`, k)
      expect(res.status, x).toBe(404)
      expect((await galat(res.clone())).message).toBe(PESAN_TIDAK_ADA)
      badan.push(await res.text())
    }
    expect(new Set(badan).size).toBe(1)
  })

  it('anggota KK lain melihat daftarnya sendiri, bukan milik Siti', async () => {
    const data = ringkasPermohonanWargaSchema.array().parse(((await (await get('/permohonan', kuki.syahrial)).json()) as { data: unknown[] }).data)
    expect(data.map((p) => p.id)).toContain(id.milikSyahrial)
    expect(data.map((p) => p.id)).not.toContain(id.selesai)
  })
})

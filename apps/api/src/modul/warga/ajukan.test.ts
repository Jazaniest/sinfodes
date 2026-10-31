import { ID_SUNGAI_SIALANG } from '@sinfodes/demo/data/desa-demo'
import { SEKARANG_UJI } from '@sinfodes/demo/uji-akun'
import { galatSchema } from '@sinfodes/kontrak/api'
import { hasilKirimPermohonanSchema, MAKS_PENGAJUAN_MENUNGGU, PESAN_PENGAJUAN_PENUH, pesanLayananDitutup } from '@sinfodes/kontrak/warga/ajukan'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { buatDbUji, penyandiUji, type DbUji } from '../../../test/basisdata'
import { sisipkanDesaContoh } from '../../../test/data-contoh'
import { jpegBuatan, pdfBuatan, pngBuatan } from '../../../test/helpers/berkas-buatan'
import { ambil, kirimJson, masukLewatRute, rakitApp, sisipSesiWargaUji } from '../../../test/rakit-app'
import { bacaBerkas } from '../../berkas/layanan'
import { bersihkanMetadata } from '../../berkas/bersihkan'
import type { Penyandi } from '../../kripto/penyandi'
import { efekSuratBawaan, type EfekSurat } from '../permohonan/efek-surat'

const SS = 'http://sungaisialang.sinfodes.localhost'
const SITI = 'pdk_siti_rahmah'
const ZULKIFLI = 'pdk_zulkifli'
const ALIF = 'pdk_muhammad_alif'
const JS_SKD = 'js_ss_skd'
const JS_SKL = 'js_ss_skl'
const JS_SKU = 'js_ss_sku'
const SYARAT_SKD = ['KTP', 'KK', 'Pengantar RT']
const PESAN_TIDAK_ONLINE = 'Jenis surat ini tidak bisa diajukan online. Datang ke kantor desa.'
const PESAN_BUKAN_KELUARGA = 'Pilih anggota keluarga Anda sendiri.'
const TABEL_TULIS = ['permohonan', 'riwayat_surat', 'aktivitas', 'berkas_surat', 'kunci_idempotensi'] as const

let uji: DbUji
let penyandi: Penyandi
let app: ReturnType<typeof rakitApp>['app']
let kuki: { siti: string; zulkifli: string; panel: string }
const panggilanEfek: unknown[][] = []

beforeAll(async () => {
  uji = await buatDbUji()
  penyandi = await penyandiUji(uji.sqlMigrasi)
  const efekSurat: EfekSurat = {
    ...efekSuratBawaan,
    async permohonanMasukDariWarga(...argumen) {
      panggilanEfek.push(argumen.slice(1))
    },
  }
  app = rakitApp({ klien: uji.klien, penyandi, efekSurat }).app
  const dibuat = new Date(SEKARANG_UJI.getTime() - 3600_000)
  const warga = async (pendudukId: string) => (await sisipSesiWargaUji(uji.sqlMigrasi, { pendudukId, desaId: ID_SUNGAI_SIALANG, dibuat })).kuki
  const panel = (await masukLewatRute(app, SS, 'rosmiati@sungaisialang.desa.id', 'demo', '10.30.0.1')).kuki as string
  kuki = { siti: await warga(SITI), zulkifli: await warga(ZULKIFLI), panel }
})
afterAll(async () => {
  await uji?.tutup()
})
beforeEach(async () => {
  panggilanEfek.length = 0
  // Batas lima Menunggu per warga: mulai tiap uji dari nol supaya hasil satu uji tidak memengaruhi yang lain.
  await uji.sqlMigrasi`update permohonan set status = 'diproses' where status = 'menunggu' and desa_id = ${ID_SUNGAI_SIALANG}`
})

let nomorKunci = 0
const kunciBaru = (awalan = 'kirim'): string => `${awalan}-uji-${String(++nomorKunci).padStart(5, '0')}`

type Berkas = { isi: Buffer; nama?: string; tipe?: string }
const foto = (opsi: Parameters<typeof jpegBuatan>[0] = {}): Berkas => ({ isi: jpegBuatan(opsi), nama: 'IMG_2031.jpg', tipe: 'image/jpeg' })
const tigaFoto = (): Berkas[] => [foto(), foto(), foto()]
const dataSkd = (kunci: string, ubah: Record<string, unknown> = {}) => ({
  kunci, jenisId: JS_SKD, untukId: SITI, isian: { keperluan: 'Beasiswa' }, lampiran: SYARAT_SKD.map((syarat) => ({ syarat })), ...ubah,
})

async function kirim(data: unknown, berkas: Berkas[], k: string | null = kuki.siti, tambahan: Record<string, string> = {}, aplikasi = app): Promise<Response> {
  const form = new FormData()
  form.set('data', JSON.stringify(data))
  for (const b of berkas) form.append('lampiran', new File([b.isi], b.nama ?? 'foto.jpg', { type: b.tipe ?? 'image/jpeg' }))
  return aplikasi.fetch(new Request(`${SS}/api/v1/warga/permohonan`, { method: 'POST', headers: { Origin: SS, ...(k ? { Cookie: k } : {}), ...tambahan }, body: form }))
}
const galat = async (r: Response) => galatSchema.parse(await r.json()).error
const jumlah = async (tabel: string, kondisi = 'true'): Promise<number> => Number((await uji.sqlMigrasi.unsafe(`select count(*)::int as n from ${tabel} where ${kondisi}`))[0].n)
const tangkap = async () => Object.fromEntries(await Promise.all(TABEL_TULIS.map(async (t) => [t, await jumlah(t)])))
const noUrutTertinggi = async (): Promise<number> => Number((await uji.sqlMigrasi`select coalesce(max(no_urut), 0)::int as n from permohonan where desa_id = ${ID_SUNGAI_SIALANG} and tahun = 2026`)[0].n)
const bacaIsi = (id: string, permohonanId: string) =>
  uji.klien.dalamTransaksi('desa', { desaId: ID_SUNGAI_SIALANG }, (db) => bacaBerkas(db, penyandi, { id, permohonanId }))
const isiMenunggu = async (pemohonId: string, jumlahBaris: number, pengaju: string | null = null): Promise<void> => {
  const [seed] = await uji.sqlMigrasi`select id from permohonan where desa_id = ${ID_SUNGAI_SIALANG} and status = 'diproses' and dikembalikan is null order by id limit 1`
  for (let i = 0; i < jumlahBaris; i++) {
    const id = `srt_menunggu_${Math.random().toString(36).slice(2, 10)}`
    const timpa = uji.sqlMigrasi.json({ id, tahun: 2090, no_urut: Math.floor(Math.random() * 1e8), pemohon_id: pemohonId, status: 'menunggu', masuk_pada: new Date().toISOString() } as never)
    await uji.sqlMigrasi`insert into permohonan select (jsonb_populate_record(null::permohonan, to_jsonb(s) || ${timpa}::jsonb)).* from permohonan s where s.id = ${seed.id}`
    if (pengaju) {
      await uji.sqlMigrasi`insert into riwayat_surat (id, desa_id, permohonan_id, kejadian, waktu, oleh)
        values (${`rws_${id}`}, ${ID_SUNGAI_SIALANG}, ${id}, 'diajukan', now(), ${uji.sqlMigrasi.json({ id: pengaju, nama: 'Siti Rahmah' } as never)})`
    }
  }
}

describe('POST /warga/permohonan: jalan baik', () => {
  it('SKD untuk diri sendiri dengan tiga foto: 201, permohonan Menunggu kanal online, berkas tersandi, riwayat, aktivitas, efek', async () => {
    const sebelumNomor = await noUrutTertinggi()
    const sebelum = await tangkap()
    const res = await kirim(dataSkd(kunciBaru()), [foto({ exif: true }), foto(), foto()])
    expect(res.status).toBe(201)
    expect(res.headers.get('Idempotency-Replayed')).toBeNull()
    const { id, tiket } = hasilKirimPermohonanSchema.parse(await res.json())
    expect(tiket).toBe(`2026-${String(sebelumNomor + 1).padStart(4, '0')}`)

    const [p] = await uji.sqlMigrasi`select * from permohonan where id = ${id}`
    expect(p).toMatchObject({
      status: 'menunggu', kanal: 'online', tahap: null, pemohon_id: SITI, subjek_id: null, mutasi_id: null, jenis_id: JS_SKD, no_urut: sebelumNomor + 1, tahun: 2026,
    })
    const lampiran = p.lampiran as { id: string; syarat: string; berkas: string; ukuranKb: number }[]
    expect(lampiran.map((l) => l.syarat)).toEqual(SYARAT_SKD)
    expect(lampiran.map((l) => l.berkas)).toEqual(['ktp.jpg', 'kk.jpg', 'pengantar-rt.jpg'])
    for (const l of lampiran) {
      expect(l.id).toMatch(/^lmp_/)
      expect(l.ukuranKb).toBeGreaterThanOrEqual(1)
    }

    const berkas = await uji.sqlMigrasi`select id, jenis, tipe, permohonan_id from berkas_surat where permohonan_id = ${id} order by id`
    expect(berkas.map((b) => b.id).sort()).toEqual(lampiran.map((l) => l.id).sort())
    expect(berkas.every((b) => b.jenis === 'lampiran' && b.tipe === 'image/jpeg')).toBe(true)
    // Foto pertama tersimpan tanpa metadata (GPS di EXIF hilang) dan sama dengan hasil pembersihan.
    const tersimpan = await bacaIsi(lampiran[0].id, id)
    expect(tersimpan?.bita.toString('latin1')).not.toContain('GPS')
    expect(Buffer.compare(tersimpan!.bita, bersihkanMetadata(jpegBuatan({ exif: true }), 'image/jpeg'))).toBe(0)

    const riwayat = await uji.sqlMigrasi`select kejadian, oleh from riwayat_surat where permohonan_id = ${id} order by urutan`
    expect(riwayat).toEqual([{ kejadian: 'diajukan', oleh: { id: SITI, nama: 'Siti Rahmah' } }])
    const aktivitas = await uji.sqlMigrasi`select jenis, ringkasan, oleh_id from aktivitas where rujukan_id = ${id}`
    expect(aktivitas).toEqual([{ jenis: 'permohonan-masuk', ringkasan: 'Permohonan SKD · Siti Rahmah (online)', oleh_id: SITI }])
    expect(aktivitas[0].ringkasan).not.toMatch(/\d{16}/)

    expect(panggilanEfek).toHaveLength(1)
    expect(panggilanEfek[0][0]).toMatchObject({ id, desaId: ID_SUNGAI_SIALANG })
    expect(panggilanEfek[0][1]).toMatchObject({ id: JS_SKD, kode: 'SKD' })
    expect(panggilanEfek[0][2]).toMatchObject({ id: SITI, nama: 'Siti Rahmah' })

    const sesudah = await tangkap()
    expect(sesudah).toEqual({
      permohonan: sebelum.permohonan + 1, riwayat_surat: sebelum.riwayat_surat + 1, aktivitas: sebelum.aktivitas + 1, berkas_surat: sebelum.berkas_surat + 3,
      kunci_idempotensi: sebelum.kunci_idempotensi + 1,
    })
  })

  it('syarat bertanda opsional boleh dilewati (SKU: dua foto wajib saja)', async () => {
    const data = {
      kunci: kunciBaru(), jenisId: JS_SKU, untukId: SITI, lampiran: [{ syarat: 'KTP' }, { syarat: 'KK' }],
      isian: { namaUsaha: 'Warung Siti', jenisUsaha: 'Dagang', alamatUsaha: 'RT 01/RW 01 Dusun I', mulaiUsaha: '2020' },
    }
    expect((await kirim(data, [foto(), foto()])).status).toBe(201)
  })

  it('PNG juga diterima sebagai foto', async () => {
    const res = await kirim(dataSkd(kunciBaru()), [{ isi: pngBuatan(), nama: 'ktp.png', tipe: 'image/png' }, foto(), foto()])
    expect(res.status).toBe(201)
  })

  it('kelahiran untuk bayi 3 bulan diterima (pemohon warga, subjek bayi); untuk 13 bulan ditolak pada untukId', async () => {
    const dataSkl = (kunci: string) => ({
      kunci, jenisId: JS_SKL, untukId: ALIF, isian: { pelapor: 'Siti Rahmah' }, lampiran: [{ syarat: 'KK dan KTP orang tua' }, { syarat: 'Keterangan lahir dari bidan/RS' }],
    })
    try {
      await uji.sqlMigrasi`update penduduk set tanggal_lahir = '2026-06-24' where id = ${ALIF}`
      const ok = await kirim(dataSkl(kunciBaru()), [foto(), foto()])
      expect(ok.status).toBe(201)
      const { id } = hasilKirimPermohonanSchema.parse(await ok.json())
      const [p] = await uji.sqlMigrasi`select pemohon_id, subjek_id from permohonan where id = ${id}`
      expect(p).toEqual({ pemohon_id: SITI, subjek_id: ALIF })

      await uji.sqlMigrasi`update penduduk set tanggal_lahir = '2025-08-24' where id = ${ALIF}`
      const sebelum = await tangkap()
      const tolak = await kirim(dataSkl(kunciBaru()), [foto(), foto()])
      expect(tolak.status).toBe(422)
      expect((await galat(tolak)).fields).toEqual({ untukId: 'Surat kelahiran hanya untuk bayi di bawah 12 bulan.' })
      expect(await tangkap()).toEqual(sebelum)
    } finally {
      await uji.sqlMigrasi`update penduduk set tanggal_lahir = '2023-11-02' where id = ${ALIF}`
    }
  })
})

describe('POST /warga/permohonan: pemeriksaan sebelum menulis', () => {
  const tolakTanpaTulis = async (data: unknown, berkas: Berkas[], status: number, tambahan: Record<string, string> = {}) => {
    const sebelum = await tangkap()
    const res = await kirim(data, berkas, kuki.siti, tambahan)
    expect(res.status, JSON.stringify(await res.clone().json().catch(() => null))).toBe(status)
    expect(await tangkap()).toEqual(sebelum)
    return res
  }

  it('tanpa sesi 401, sesi panel 401', async () => {
    expect((await kirim(dataSkd(kunciBaru()), tigaFoto(), null)).status).toBe(401)
    expect((await kirim(dataSkd(kunciBaru()), tigaFoto(), kuki.panel)).status).toBe(401)
  })

  it('data rusak atau tidak sesuai skema: 422', async () => {
    for (const data of [null, {}, { ...dataSkd(kunciBaru()), jenisId: '' }, { ...dataSkd(kunciBaru()), isian: 'bukan peta' }]) {
      await tolakTanpaTulis(data, tigaFoto(), 422)
    }
    const form = new FormData()
    form.set('data', '{rusak')
    const sebelum = await tangkap()
    const res = await app.fetch(new Request(`${SS}/api/v1/warga/permohonan`, { method: 'POST', headers: { Origin: SS, Cookie: kuki.siti }, body: form }))
    expect(res.status).toBe(422)
    expect(await tangkap()).toEqual(sebelum)
    const bukanMultipart = await app.fetch(
      new Request(`${SS}/api/v1/warga/permohonan`, { method: 'POST', headers: { Origin: SS, Cookie: kuki.siti, 'Content-Type': 'application/json' }, body: '{}' }),
    )
    expect(bukanMultipart.status).toBe(422)
    expect((await galat(bukanMultipart)).message).toBe('Isi pengajuan tidak bisa dibaca.')
  })

  it('jenis: tidak online, tidak ada, atau milik desa lain menjawab pesan yang sama pada jenisId; jenis mati 409', async () => {
    await sisipkanDesaContoh(uji.sqlMigrasi, 'desa_uji_lain', 2)
    await uji.sqlMigrasi.unsafe(
      `insert into jenis_surat (id, desa_id, kode, nama, klasifikasi, subjek, isian, boleh_atas_nama, wajib_paraf, online, syarat, teks, aktif, asal)
       values ('js_uji_lain', 'desa_uji_lain', 'SKD', 'Surat Keterangan Domisili', '470', 'pemohon', '[]'::jsonb, false, false, true, '[]'::jsonb, 'Teks', true, 'desa'),
              ('js_uji_mati', '${ID_SUNGAI_SIALANG}', 'XTD', 'Surat Uji Mati', '470', 'pemohon', '[]'::jsonb, false, false, true, '[]'::jsonb, 'Teks', false, 'desa')`,
    )
    for (const jenisId of ['js_ss_skm', 'js_tidak_ada', 'js_uji_lain']) {
      const res = await tolakTanpaTulis(dataSkd(kunciBaru(), { jenisId }), tigaFoto(), 422)
      expect((await galat(res)).fields).toEqual({ jenisId: PESAN_TIDAK_ONLINE })
    }
    const mati = await tolakTanpaTulis(dataSkd(kunciBaru(), { jenisId: 'js_uji_mati' }), tigaFoto(), 409)
    expect(await galat(mati)).toMatchObject({ code: 'CONFLICT', fields: { jenisId: 'Jenis surat ini tidak tersedia.' } })
  })

  it('untukId bukan anggota KK sendiri (KK lain, tidak ada) atau anggota yang meninggal: 422 pada untukId', async () => {
    for (const untukId of [ZULKIFLI, 'pdk_tidak_ada']) {
      const res = await tolakTanpaTulis(dataSkd(kunciBaru(), { untukId }), tigaFoto(), 422)
      expect((await galat(res)).fields).toEqual({ untukId: PESAN_BUKAN_KELUARGA })
    }
    try {
      await uji.sqlMigrasi`update penduduk set status_dasar = 'Meninggal' where id = 'pdk_syahrial'`
      const res = await tolakTanpaTulis(dataSkd(kunciBaru(), { untukId: 'pdk_syahrial' }), tigaFoto(), 422)
      expect((await galat(res)).fields).toEqual({ untukId: PESAN_BUKAN_KELUARGA })
    } finally {
      await uji.sqlMigrasi`update penduduk set status_dasar = 'Hidup' where id = 'pdk_syahrial'`
    }
  })

  it('isian wajib kosong: 422 per field isian.<kunci>', async () => {
    const res = await tolakTanpaTulis(dataSkd(kunciBaru(), { isian: {} }), tigaFoto(), 422)
    expect(await galat(res)).toMatchObject({ message: 'Isian surat belum lengkap.', fields: { 'isian.keperluan': expect.any(String) } })
  })

  it('jumlah foto tidak cocok, syarat wajib kurang, syarat tidak dikenal, dan lebih dari 10 syarat', async () => {
    const lain = await tolakTanpaTulis(dataSkd(kunciBaru()), [foto(), foto()], 422)
    expect((await galat(lain)).fields).toEqual({ lampiran: 'Jumlah foto tidak cocok dengan daftar syarat.' })
    const kurang = await tolakTanpaTulis(dataSkd(kunciBaru(), { lampiran: [{ syarat: 'KTP' }, { syarat: 'KK' }] }), [foto(), foto()], 422)
    expect((await galat(kurang)).fields).toEqual({ lampiran: 'Foto Pengantar RT wajib dilampirkan.' })
    const asing = await tolakTanpaTulis(dataSkd(kunciBaru(), { lampiran: [{ syarat: 'KTP' }, { syarat: 'KK' }, { syarat: 'Surat Sakti' }] }), tigaFoto(), 422)
    expect((await galat(asing)).fields).toHaveProperty('lampiran')
    const banyak = Array.from({ length: 11 }, () => ({ syarat: 'KTP' }))
    await tolakTanpaTulis(dataSkd(kunciBaru(), { lampiran: banyak }), Array.from({ length: 11 }, () => foto()), 422)
    await tolakTanpaTulis(dataSkd(kunciBaru()), Array.from({ length: 11 }, () => foto()), 422)
  })

  it('isi berkas diperiksa dari byte: HTML bernama .jpg dengan tipe image/jpeg, PDF, GIF, dan berkas kosong ditolak', async () => {
    const html: Berkas = { isi: Buffer.from('<html><script>alert(1)</script></html>'), nama: 'KTP.jpg', tipe: 'image/jpeg' }
    for (const jahat of [html, { isi: pdfBuatan(), nama: 'ktp.pdf', tipe: 'application/pdf' }, { isi: Buffer.from('GIF89a......'), nama: 'a.gif', tipe: 'image/gif' }, { isi: Buffer.alloc(0), nama: 'kosong.jpg' }]) {
      const res = await tolakTanpaTulis(dataSkd(kunciBaru()), [foto(), jahat, foto()], 422)
      expect(Object.keys((await galat(res)).fields ?? {})).toEqual(['lampiran'])
    }
  })

  it('foto 2 MB + 1 byte ditolak; tepat 2 MB (setelah dibersihkan menjadi lebih kecil) diterima', async () => {
    const dua = 2 * 1024 * 1024
    const jejalan = (ukuran: number): Buffer => {
      const kosong = pngBuatan([{ tipe: 'prVt', data: Buffer.alloc(0) }]).length
      return pngBuatan([{ tipe: 'prVt', data: Buffer.alloc(ukuran - kosong) }])
    }
    const lebih = jejalan(dua + 1)
    expect(lebih.length).toBe(dua + 1)
    const res = await tolakTanpaTulis(dataSkd(kunciBaru()), [foto(), { isi: lebih, nama: 'besar.png', tipe: 'image/png' }, foto()], 422)
    expect((await galat(res)).fields?.lampiran).toMatch(/terlalu besar/)
    const pas = jejalan(dua)
    expect(pas.length).toBe(dua)
    expect((await kirim(dataSkd(kunciBaru()), [foto(), { isi: pas, nama: 'pas.png', tipe: 'image/png' }, foto()])).status).toBe(201)
  })

  it('foto ketiga rusak: seluruh pengajuan batal, tidak ada baris di tabel mana pun', async () => {
    const rusak: Berkas = { isi: jpegBuatan().subarray(0, 40), nama: 'rusak.jpg', tipe: 'image/jpeg' }
    const res = await tolakTanpaTulis(dataSkd(kunciBaru()), [foto(), foto(), rusak], 422)
    expect((await galat(res)).fields).toEqual({ lampiran: 'Berkas rusak atau tidak lengkap.' })
  })

  it('badan di atas batas jalur atau Content-Length palsu: 413 sebelum menulis', async () => {
    const besar = Buffer.concat([jpegBuatan().subarray(0, 2), Buffer.alloc(2 * 1024 * 1024)])
    const sebelum = await tangkap()
    const banyak = Array.from({ length: 11 }, () => ({ isi: besar, nama: 'besar.jpg' }))
    const res = await kirim(dataSkd(kunciBaru()), banyak)
    expect(res.status).toBe(413)
    const palsu = await kirim(dataSkd(kunciBaru()), tigaFoto(), kuki.siti, { 'Content-Length': String(40 * 1024 * 1024) })
    expect(palsu.status).toBe(413)
    expect(await tangkap()).toEqual(sebelum)
  })

  it('desa Ditangguhkan: 403 dengan pesan layanan ditutup dan tanpa baris baru; membaca tetap jalan', async () => {
    try {
      await uji.sqlMigrasi`update desa set status = 'Ditangguhkan' where id = ${ID_SUNGAI_SIALANG}`
      const { app: baru } = rakitApp({ klien: uji.klien, penyandi })
      const sebelum = await tangkap()
      const res = await kirim(dataSkd(kunciBaru()), tigaFoto(), kuki.siti, {}, baru)
      expect(res.status).toBe(403)
      expect((await galat(res)).message).toBe(pesanLayananDitutup('Sungai Sialang'))
      expect(await tangkap()).toEqual(sebelum)
      expect((await ambil(baru, `${SS}/api/v1/warga/permohonan`, kuki.siti)).status).toBe(200)
    } finally {
      await uji.sqlMigrasi`update desa set status = 'Aktif' where id = ${ID_SUNGAI_SIALANG}`
    }
  })
})

describe('POST /warga/permohonan: jenis diarsipkan serentak (fokus review 5)', () => {
  it('pengajuan menunggu kunci jenis yang ditahan, lalu ditolak 409 karena jenisnya sudah diarsipkan; tidak ada baris yang tertinggal', async () => {
    await uji.sqlMigrasi`insert into jenis_surat (id, desa_id, kode, nama, klasifikasi, subjek, isian, boleh_atas_nama, wajib_paraf, online, syarat, teks, aktif, asal)
      values ('js_uji_serentak', ${ID_SUNGAI_SIALANG}, 'XTS', 'Surat Uji Serentak', '470', 'pemohon', '[]'::jsonb, false, false, true, '[]'::jsonb, 'Teks', true, 'desa')`
    const sebelum = await tangkap()
    let selesai = 0
    let jawaban: Promise<Response> | undefined
    await uji.sqlMigrasi.begin(async (tx) => {
      await tx`select id from jenis_surat where id = 'js_uji_serentak' for update`
      jawaban = kirim({ kunci: kunciBaru(), jenisId: 'js_uji_serentak', untukId: SITI, isian: {}, lampiran: [] }, []).then((r) => (selesai++, r))
      await new Promise((r) => setTimeout(r, 600))
      expect(selesai).toBe(0)
      await tx`update jenis_surat set aktif = false, diarsipkan = now() where id = 'js_uji_serentak'`
    })
    const res = (await jawaban) as Response
    expect(res.status).toBe(409)
    expect((await galat(res)).fields).toEqual({ jenisId: 'Jenis surat ini tidak tersedia.' })
    expect(await tangkap()).toEqual(sebelum)
  })
})

describe('POST /warga/permohonan: kunci kirim dari HP (8F3 Ruling 6)', () => {
  it('kirim ulang berurutan dengan kunci dan data yang sama: 200 dengan id dan tiket pertama, satu permohonan, satu set berkas', async () => {
    const kunci = kunciBaru()
    const sebelum = await tangkap()
    const a = await kirim(dataSkd(kunci), tigaFoto())
    const b = await kirim(dataSkd(kunci), tigaFoto())
    expect([a.status, b.status]).toEqual([201, 200])
    expect(b.headers.get('Idempotency-Replayed')).toBe('true')
    expect(await b.json()).toEqual(await a.json())
    const sesudah = await tangkap()
    expect(sesudah.permohonan).toBe(sebelum.permohonan + 1)
    expect(sesudah.berkas_surat).toBe(sebelum.berkas_surat + 3)
    expect(panggilanEfek).toHaveLength(1)
  })

  it('kirim ulang dengan foto yang berbeda tetapi data sama tetap satu pengajuan (sidik hanya atas data)', async () => {
    const kunci = kunciBaru()
    const a = await kirim(dataSkd(kunci), tigaFoto())
    const b = await kirim(dataSkd(kunci), [foto({ komentar: 'lain' }), foto(), foto()])
    expect([a.status, b.status]).toEqual([201, 200])
    expect((await b.json() as { id: string }).id).toBe((await a.json() as { id: string }).id)
  })

  it('delapan kiriman serentak dengan kunci sama: satu permohonan, satu nomor urut, satu set berkas', async () => {
    const kunci = kunciBaru()
    const sebelum = await tangkap()
    const hasil = await Promise.all(Array.from({ length: 8 }, () => kirim(dataSkd(kunci), tigaFoto())))
    expect(hasil.filter((r) => r.status === 201)).toHaveLength(1)
    expect(hasil.filter((r) => r.status === 200)).toHaveLength(7)
    const badan = await Promise.all(hasil.map((r) => r.json() as Promise<{ id: string; tiket: string }>))
    expect(new Set(badan.map((x) => x.id)).size).toBe(1)
    const sesudah = await tangkap()
    expect(sesudah.permohonan).toBe(sebelum.permohonan + 1)
    expect(sesudah.berkas_surat).toBe(sebelum.berkas_surat + 3)
    expect(sesudah.kunci_idempotensi).toBe(sebelum.kunci_idempotensi + 1)
  })

  it('kunci sama dengan data berbeda: 409 dan tidak ada tulisan; kunci berformat salah: 422', async () => {
    const kunci = kunciBaru()
    expect((await kirim(dataSkd(kunci), tigaFoto())).status).toBe(201)
    const sebelum = await tangkap()
    const beda = await kirim(dataSkd(kunci, { isian: { keperluan: 'Lain' } }), tigaFoto())
    expect(beda.status).toBe(409)
    expect((await galat(beda)).message).toBe('Kunci idempotensi ini sudah dipakai untuk isian yang berbeda.')
    for (const salah of ['ada spasi di dalam kunci', 'pendek', 'karakter-aneh-!@#$%^&*']) {
      const res = await kirim(dataSkd(salah), tigaFoto())
      expect(res.status, salah).toBe(422)
    }
    expect(await tangkap()).toEqual(sebelum)
  })

  it('pengajuan yang ditolak tidak menyimpan kunci: data yang diperbaiki dengan kunci sama diproses', async () => {
    const kunci = kunciBaru()
    expect((await kirim(dataSkd(kunci, { isian: {} }), tigaFoto())).status).toBe(422)
    expect(await jumlah('kunci_idempotensi', `kunci = '${kunci}'`)).toBe(0)
    expect((await kirim(dataSkd(kunci), tigaFoto())).status).toBe(201)
  })

  it('kunci dibatasi per warga: dua warga dengan kunci sama masing-masing diproses', async () => {
    const kunci = kunciBaru()
    const a = await kirim(dataSkd(kunci), tigaFoto(), kuki.siti)
    const b = await kirim(dataSkd(kunci, { untukId: ZULKIFLI }), tigaFoto(), kuki.zulkifli)
    expect([a.status, b.status]).toEqual([201, 201])
  })
})

describe('POST /warga/permohonan: batas lima pengajuan Menunggu (8F3 Ruling 4)', () => {
  it('lima pengajuan serentak ketika sudah ada empat Menunggu: tepat satu 201 dan empat 409 dengan pesan batas', async () => {
    await isiMenunggu(SITI, MAKS_PENGAJUAN_MENUNGGU - 1)
    const hasil = await Promise.all(Array.from({ length: 5 }, () => kirim(dataSkd(kunciBaru()), tigaFoto())))
    expect(hasil.map((r) => r.status).sort()).toEqual([201, 409, 409, 409, 409])
    for (const r of hasil.filter((x) => x.status === 409)) expect((await galat(r)).message).toBe(PESAN_PENGAJUAN_PENUH)
    expect(await jumlah('permohonan', `status = 'menunggu' and pemohon_id = '${SITI}'`)).toBe(MAKS_PENGAJUAN_MENUNGGU)
  })

  it('bukti kunci per warga: dua pengajuan menunggu kunci yang ditahan, lalu tepat satu lolos walau keduanya mulai ketika baru empat Menunggu', async () => {
    await isiMenunggu(SITI, MAKS_PENGAJUAN_MENUNGGU - 1)
    let selesai = 0
    let jawaban: Promise<Response[]> | undefined
    await uji.sqlMigrasi.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(hashtextextended(${`ajukan-warga:${ID_SUNGAI_SIALANG}:${SITI}`}, 0))`
      const dua = [kirim(dataSkd(kunciBaru()), tigaFoto()), kirim(dataSkd(kunciBaru()), tigaFoto())].map((p) => p.then((r) => (selesai++, r)))
      jawaban = Promise.all(dua)
      await new Promise((r) => setTimeout(r, 700))
      expect(selesai).toBe(0)
    })
    const hasil = (await jawaban) as Response[]
    expect(hasil.map((r) => r.status).sort()).toEqual([201, 409])
  })

  it('pengajuan keenam sesudah lima Menunggu: 409; yang sudah Diproses tidak dihitung', async () => {
    await isiMenunggu(SITI, MAKS_PENGAJUAN_MENUNGGU)
    const sebelum = await tangkap()
    const res = await kirim(dataSkd(kunciBaru()), tigaFoto())
    expect(res.status).toBe(409)
    expect(await galat(res)).toMatchObject({ code: 'CONFLICT', message: PESAN_PENGAJUAN_PENUH })
    expect(await tangkap()).toEqual(sebelum)
    await uji.sqlMigrasi`update permohonan set status = 'diproses' where id = (select id from permohonan where status = 'menunggu' and pemohon_id = ${SITI} limit 1)`
    expect((await kirim(dataSkd(kunciBaru()), tigaFoto())).status).toBe(201)
  })

  it('permohonan yang diajukan warga untuk orang lain dihitung ke pengaju; milik warga lain tidak', async () => {
    await isiMenunggu('pdk_nur_aini', MAKS_PENGAJUAN_MENUNGGU, SITI)
    expect((await kirim(dataSkd(kunciBaru()), tigaFoto(), kuki.siti)).status).toBe(409)
    expect((await kirim(dataSkd(kunciBaru(), { untukId: ZULKIFLI }), tigaFoto(), kuki.zulkifli)).status).toBe(201)
  })

  it('kirim ulang dengan kunci yang sama tetap dijawab walau batas sudah penuh', async () => {
    const kunci = kunciBaru()
    expect((await kirim(dataSkd(kunci), tigaFoto())).status).toBe(201)
    await isiMenunggu(SITI, MAKS_PENGAJUAN_MENUNGGU)
    const ulang = await kirim(dataSkd(kunci), tigaFoto())
    expect(ulang.status).toBe(200)
  })
})

describe('POST /warga/permohonan: nomor urut bersama loket', () => {
  it('pengajuan warga dan permohonan loket serentak (10 + 10) menghasilkan nomor urut berurutan tanpa ganda', async () => {
    const awal = await noUrutTertinggi()
    const loket = async (): Promise<Response> =>
      kirimJson(app, SS, '/api/v1/permohonan', { jenisId: JS_SKD, pemohonId: SITI, subjekId: null, mutasiId: null, isian: { keperluan: 'Uji' }, ajukan: false }, kuki.panel)
    const permintaan: Promise<Response>[] = []
    for (let i = 0; i < 5; i++) {
      permintaan.push(kirim(dataSkd(kunciBaru()), tigaFoto(), kuki.siti))
      permintaan.push(kirim(dataSkd(kunciBaru(), { untukId: ZULKIFLI }), tigaFoto(), kuki.zulkifli))
    }
    for (let i = 0; i < 10; i++) permintaan.push(loket())
    const hasil = await Promise.all(permintaan)
    expect(hasil.map((r) => r.status).sort()).toEqual([...Array(10).fill(201), ...Array(10).fill(200)].sort())
    const nomor = (await uji.sqlMigrasi`select no_urut from permohonan where desa_id = ${ID_SUNGAI_SIALANG} and tahun = 2026 and no_urut > ${awal} order by no_urut`).map((b) => Number(b.no_urut))
    expect(nomor).toEqual(Array.from({ length: 20 }, (_, i) => awal + i + 1))
  })
})

describe('waktu pengajuan', () => {
  it('tahun nomor urut dan tiket mengikuti waktu WIB server', async () => {
    const res = await kirim(dataSkd(kunciBaru()), tigaFoto())
    const { id, tiket } = hasilKirimPermohonanSchema.parse(await res.json())
    expect(tiket.startsWith('2026-')).toBe(true)
    const [p] = await uji.sqlMigrasi`select masuk_pada from permohonan where id = ${id}`
    expect((p.masuk_pada as Date).getTime()).toBe(SEKARANG_UJI.getTime())
  })
})

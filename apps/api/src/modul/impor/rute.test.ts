import { ID_SUNGAI_SIALANG } from '@sinfodes/demo/data/desa-demo'
import { bangkitkanDb } from '@sinfodes/demo/generator'
import type { DbDemo } from '@sinfodes/demo/tipe-db'
import { SEKARANG_UJI } from '@sinfodes/demo/uji-akun'
import { galatSchema } from '@sinfodes/kontrak/api'
import { laporanImporSchema } from '@sinfodes/kontrak/impor/schema'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buatDbUji, penyandiUji, type DbUji } from '../../../test/basisdata'
import { kirimJson, masukLewatRute, rakitApp } from '../../../test/rakit-app'
import { sisipkanDesaContoh } from '../../../test/data-contoh'
import { buatCsvUji, buatXlsxUji } from '../../../test/helpers/berkas-uji'
import { ruang } from '../../kripto/ruang'
import type { Penyandi } from '../../kripto/penyandi'

const SS = 'http://sungaisialang.sinfodes.localhost'
const TL = 'http://tanjunglamo.sinfodes.localhost'
const TIDAK_BERHAK_UBAH = 'Peran Anda tidak berhak mengubah data kependudukan.'
const JAM = 3600_000

let uji: DbUji
let dunia: DbDemo
let penyandi: Penyandi
let app: ReturnType<typeof rakitApp>['app']
let baris: ReturnType<typeof rakitApp>['baris']
const kuki: Record<'operator' | 'kades' | 'kadus' | 'operatorTl', string> = { operator: '', kades: '', kadus: '', operatorTl: '' }
beforeAll(async () => {
  uji = await buatDbUji()
  dunia = bangkitkanDb(SEKARANG_UJI)
  penyandi = await penyandiUji(uji.sqlMigrasi)
  const rakit = rakitApp({ klien: uji.klien, penyandi })
  app = rakit.app
  baris = rakit.baris
  const masuk = async (basis: string, surel: string, domain: string, ip: string) => (await masukLewatRute(app, basis, `${surel}@${domain}`, 'demo', ip)).kuki as string
  kuki.operator = await masuk(SS, 'rosmiati', 'sungaisialang.desa.id', '10.11.0.1')
  kuki.kades = await masuk(SS, 'kades', 'sungaisialang.desa.id', '10.11.0.2')
  kuki.kadus = await masuk(SS, 'sukardi', 'sungaisialang.desa.id', '10.11.0.3')
  kuki.operatorTl = await masuk(TL, 'operator', 'tanjunglamo.desa.id', '10.11.0.4')
})
afterAll(async () => {
  await uji?.tutup()
})

const unggahContoh = (k: string | null = kuki.operator, basis = SS) => kirimJson(app, basis, '/api/v1/impor/penduduk', { contoh: true }, k)
const unggah = (nama: string, isi: Uint8Array, k: string | null = kuki.operator, basis = SS) => {
  const formulir = new FormData()
  formulir.append('berkas', new File([Buffer.from(isi)], nama))
  return app.fetch(new Request(`${basis}/api/v1/impor/penduduk`, { method: 'POST', headers: { Origin: basis, ...(k ? { Cookie: k } : {}) }, body: formulir }))
}
const galat = async (r: Response) => galatSchema.parse(await r.json()).error

const KEPALA = ['NIK', 'Nama Lengkap', 'JK', 'Tmp Lahir', 'Tgl. Lahir', 'Agama', 'SHDK', 'No. KK', 'Dusun', 'RW', 'RT']
const BARIS = [
  ['1405092001900001', 'Anwar', 'L', 'Teluk', '20-01-1990', 'Islam', 'Kepala Keluarga', '1405091506249991', '3', '005', '011'],
  ['1405094502920002', 'Fatimah', 'P', 'Teluk', '05-02-1992', 'Islam', 'Istri', '1405091506249991', '3', '005', '011'],
]

describe('POST /impor/penduduk: berkas contoh (SPEC-V0.2 §6.8)', () => {
  it('16 kolom (dua tak dikenali), 17 baris bernomor 2-18, NIK Siti Rahmah sudah terdaftar', async () => {
    const r = await unggahContoh()
    expect(r.status).toBe(201)
    const lap = laporanImporSchema.parse(await r.json())
    expect(lap.id).toMatch(/^imp_/)
    expect(lap.namaBerkas).toBe('pendataan-rt-teluk-rengas.xlsx')
    expect(lap.kolom).toHaveLength(16)
    expect(lap.kolom.filter((k) => k.field === null).map((k) => k.judul)).toEqual(['Gol. Drh', 'Keterangan'])
    expect(lap.baris.map((b) => b.nomor)).toEqual(Array.from({ length: 17 }, (_, i) => i + 2))
    expect(lap.nikTerdaftar).toEqual(['1405095203918002'])
    expect(lap.nomorKkTerdaftar).toEqual([])
  })
})

describe('POST /impor/penduduk: berkas sungguhan', () => {
  it('csv titik koma: nama berkasnya dipakai, kolom dikenali dari sinonim, baris bernomor fisik', async () => {
    const r = await unggah('data-dusun-3.csv', buatCsvUji([KEPALA, ...BARIS], { pemisah: ';', bom: true }))
    expect(r.status).toBe(201)
    const lap = laporanImporSchema.parse(await r.json())
    expect(lap.namaBerkas).toBe('data-dusun-3.csv')
    expect(lap.kolom.map((k) => k.field)).toEqual(['nik', 'nama', 'jenisKelamin', 'tempatLahir', 'tanggalLahir', 'agama', 'hubunganKeluarga', 'nomorKk', 'dusun', 'rw', 'rt'])
    expect(lap.baris).toEqual([{ nomor: 2, sel: BARIS[0] }, { nomor: 3, sel: BARIS[1] }])
    expect(lap.nikTerdaftar).toEqual([])
  })

  it('xlsx: sel tanggal Excel menjadi YYYY-MM-DD', async () => {
    const isi = buatXlsxUji([KEPALA, [BARIS[0][0], 'Anwar', 'L', 'Teluk', new Date(Date.UTC(1990, 0, 20)), 'Islam', 'Kepala Keluarga', BARIS[0][7], '3', '005', '011']])
    const lap = laporanImporSchema.parse(await (await unggah('pendataan.xlsx', isi)).json())
    expect(lap.baris[0].sel[4]).toBe('1990-01-20')
  })

  it('nama berkas berjalur dan berkarakter kontrol disanitasi; sesi tercatat dengan nama bersih', async () => {
    const lap = laporanImporSchema.parse(await (await unggah('..\\..\\Desktop\\data\u202E.csv', buatCsvUji([KEPALA, ...BARIS]))).json())
    expect(lap.namaBerkas).toBe('data.csv')
    const [sesi] = await uji.sqlMigrasi`select nama_berkas from impor_penduduk where id = ${lap.id}`
    expect(sesi.nama_berkas).toBe('data.csv')
  })

  it('nikTerdaftar mencakup mantan penduduk desa ini dan tidak mencakup NIK desa lain; nomorKkTerdaftar juga', async () => {
    const mantan = dunia.penduduk.find((p) => p.desaId === ID_SUNGAI_SIALANG && p.statusDasar !== 'Hidup' && p.nik !== null)
    const kkAda = dunia.keluarga.find((k) => k.desaId === ID_SUNGAI_SIALANG)
    expect(mantan && kkAda).toBeTruthy()
    // NIK ini terdaftar di desa lain: indeksnya memuat ID desa itu, jadi tidak pernah cocok dengan indeks desa ini.
    const nikDesaLain = '1405091212850099'
    const lain = await sisipkanDesaContoh(uji.sqlMigrasi, 'desa_lain_impor', 1)
    await uji.sqlMigrasi`update penduduk set nik_indeks = ${penyandi.indeks(nikDesaLain, ruang.nik('desa_lain_impor'))} where id = ${lain.pendudukIds[0]}`
    const isi = buatCsvUji([KEPALA, [mantan?.nik as string, 'A', 'L', 'T', '01-01-1990', 'Islam', 'Kepala Keluarga', kkAda?.nomorKk as string, '3', '005', '011'], [nikDesaLain, 'B', 'P', 'T', '01-01-1990', 'Islam', 'Istri', '1405091506249991', '3', '005', '011']])
    const lap = laporanImporSchema.parse(await (await unggah('a.csv', isi)).json())
    expect(lap.nikTerdaftar).toEqual([mantan?.nik])
    expect(lap.nomorKkTerdaftar).toEqual([kkAda?.nomorKk])
  })

  it('NIK dan nomor KK berpemisah titik, spasi, atau strip tetap dikenali sebagai terdaftar', async () => {
    const isi = buatCsvUji([KEPALA, ['1405 0952 0391 8002', 'Siti', 'P', 'T', '12-03-1991', 'Islam', 'Kepala Keluarga', '1405.0920.1123.8004', '3', '005', '011']])
    const lap = laporanImporSchema.parse(await (await unggah('a.csv', isi)).json())
    expect(lap.nikTerdaftar).toEqual(['1405095203918002'])
    expect(lap.nomorKkTerdaftar).toEqual(['1405092011238004'])
  })
})

describe('POST /impor/penduduk: penolakan', () => {
  it('ekstensi lain, tidak terbaca, dan kosong → 422 berfield berkas; tidak membuat sesi', async () => {
    const [{ n: sebelum }] = await uji.sqlMigrasi`select count(*)::int as n from impor_penduduk`
    const salahEkstensi = await unggah('foto.png', new Uint8Array([1, 2, 3]))
    expect(salahEkstensi.status).toBe(422)
    expect(await galat(salahEkstensi)).toMatchObject({ code: 'VALIDATION', message: 'Berkas harus .xlsx atau .csv.', fields: { berkas: 'Berkas harus .xlsx atau .csv' } })
    const rusak = await unggah('foto.xlsx', new Uint8Array(300))
    expect(await galat(rusak)).toMatchObject({ message: 'Berkas tidak terbaca. Pilih berkas .xlsx atau .csv.', fields: { berkas: 'Berkas tidak terbaca' } })
    expect((await unggah('kosong.csv', new Uint8Array(0))).status).toBe(422)
    const [{ n: sesudah }] = await uji.sqlMigrasi`select count(*)::int as n from impor_penduduk`
    expect(sesudah).toBe(sebelum)
  })

  it('tanpa berkas (multipart tanpa field berkas) dan JSON selain contoh → 422', async () => {
    const formulir = new FormData()
    formulir.append('lain', 'x')
    const tanpa = await app.fetch(new Request(`${SS}/api/v1/impor/penduduk`, { method: 'POST', headers: { Origin: SS, Cookie: kuki.operator }, body: formulir }))
    expect(tanpa.status).toBe(422)
    expect((await galat(tanpa)).message).toBe('Berkas tidak terbaca. Pilih berkas .xlsx atau .csv.')
    for (const badan of [{}, { contoh: false }, null]) {
      const r = await kirimJson(app, SS, '/api/v1/impor/penduduk', badan, kuki.operator)
      expect(r.status).toBe(422)
      expect((await galat(r)).message).toBe('Pilih berkas Excel atau CSV.')
    }
  })

  it('Kepala Desa dan Kepala Dusun 403; tanpa sesi 401', async () => {
    for (const k of [kuki.kades, kuki.kadus]) {
      const r = await unggahContoh(k)
      expect(r.status).toBe(403)
      expect((await galat(r)).message).toBe(TIDAK_BERHAK_UBAH)
    }
    expect((await unggahContoh(null)).status).toBe(401)
  })

  it('desa yang belum punya dusun → 422 sebelum berkas dibaca', async () => {
    const [{ n }] = await uji.sqlMigrasi`select count(*)::int as n from dusun where desa_id = 'desa_tanjung_lamo'`
    expect(n, 'Tanjung Lamo (desa persiapan) belum punya dusun di semai').toBe(0)
    const r = await unggahContoh(kuki.operatorTl, TL)
    expect(r.status).toBe(422)
    expect((await galat(r)).message).toBe('Desa belum punya dusun. Atur dusun, RW, dan RT di Pengaturan › Wilayah sebelum mengimpor penduduk.')
  })
})

describe('POST /impor/penduduk: isi berkas tidak pernah polos di server', () => {
  it('baris sesi tersandi (v1.), tanpa NIK 16 digit polos di tabel, dan tidak ada NIK di log', async () => {
    const lap = laporanImporSchema.parse(await (await unggah('rahasia.csv', buatCsvUji([KEPALA, ...BARIS]))).json())
    const [sesi] = await uji.sqlMigrasi`select isi, row_to_json(impor_penduduk)::text as semua from impor_penduduk where id = ${lap.id}`
    expect(String(sesi.isi).startsWith('v1.')).toBe(true)
    expect(String(sesi.semua)).not.toMatch(/\d{16}/)
    expect(String(sesi.semua)).not.toContain('Anwar')
    expect(baris.join('\n')).not.toMatch(/1405092001900001|Anwar/)
  })
})

describe('sesi impor: kedaluwarsa dibersihkan malas', () => {
  it('unggahan baru menghapus sesi desa itu yang lebih dari 24 jam, bukan sesi desa lain atau yang masih segar', async () => {
    const lama = new Date(SEKARANG_UJI.getTime() - 25 * JAM)
    const segar = new Date(SEKARANG_UJI.getTime() - 23 * JAM)
    const sisip = (id: string, desa: string, waktu: Date) =>
      uji.sqlMigrasi`insert into impor_penduduk (id, desa_id, dicatat_oleh_id, nama_berkas, dibuat_pada, jumlah_baris, isi) values (${id}, ${desa}, 'pgn_x', 'a.csv', ${waktu}, 1, 'v1.k.s')`
    await sisip('imp_lama_ss', ID_SUNGAI_SIALANG, lama)
    await sisip('imp_segar_ss', ID_SUNGAI_SIALANG, segar)
    await sisip('imp_lama_tl', 'desa_tanjung_lamo', lama)
    await unggah('a.csv', buatCsvUji([KEPALA, ...BARIS]))
    const ada = async (id: string) => (await uji.sqlMigrasi`select 1 from impor_penduduk where id = ${id}`).length === 1
    expect(await ada('imp_lama_ss')).toBe(false)
    expect(await ada('imp_segar_ss')).toBe(true)
    expect(await ada('imp_lama_tl')).toBe(true)
  })
})

describe('batas badan permintaan (Fokus 6)', () => {
  /** CSV beberapa MB dengan 10.000 baris sah: tiap baris dua sel panjang. */
  const csvBesar = (mb: number) => {
    const sel = 'x'.repeat(Math.floor((mb * 1024 * 1024) / 10_000 / 2) - 2)
    return buatCsvUji([['NIK', 'Nama'], ...Array.from({ length: 10_000 }, () => [sel, sel])])
  }

  it('unggahan 9 MB lolos lapisan 1 MB; 11 MB dijawab 413', async () => {
    const sembilan = csvBesar(9)
    expect(sembilan.length).toBeGreaterThan(8.5 * 1024 * 1024)
    expect((await unggah('besar.csv', sembilan)).status).toBe(201)
    const sebelas = new Uint8Array(11 * 1024 * 1024).fill(0x61)
    const r = await unggah('terlalu-besar.csv', sebelas)
    expect(r.status).toBe(413)
    expect((await galat(r)).message).toBe('Isi permintaan terlalu besar.')
  }, 60_000)

  it('rute lain tetap dibatasi 1 MB', async () => {
    const r = await kirimJson(app, SS, '/api/v1/penduduk/cek-nik', { nik: 'x'.repeat(1.5 * 1024 * 1024) }, kuki.operator)
    expect(r.status).toBe(413)
  })
})

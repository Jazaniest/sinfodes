import { galatSchema } from '@sinfodes/kontrak/api'
import { ID_SUNGAI_SIALANG } from '@sinfodes/demo/data/desa-demo'
import { bangkitkanDb } from '@sinfodes/demo/generator'
import type { DbDemo } from '@sinfodes/demo/tipe-db'
import { SEKARANG_UJI } from '@sinfodes/demo/uji-akun'
import { penomoranSchema } from '@sinfodes/kontrak/pengaturan/penomoran'
import { FORMAT_NOMOR_BAWAAN } from '@sinfodes/kontrak/surat/nomor-surat'
import { pengaturanBawaan } from '@sinfodes/kontrak/surat/pengaturan-bawaan'
import { tataLetakSuratSchema } from '@sinfodes/kontrak/surat/tata-letak'
import { salinTataLetak, samaDenganSiap, TATA_LETAK_SIAP } from '@sinfodes/kontrak/surat/tata-letak-siap'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { buatDbUji, penyandiUji, type DbUji } from '../../../test/basisdata'
import { ambil, kirimDenganMetode, masukLewatRute, rakitApp } from '../../../test/rakit-app'

const SS = 'http://sungaisialang.sinfodes.localhost'
const TL = 'http://tanjunglamo.sinfodes.localhost'
const DESA_TL = 'desa_tanjung_lamo'
const PESAN_PENGATURAN = 'Peran Anda tidak berhak membuka Pengaturan desa.'

let uji: DbUji
let dunia: DbDemo
let app: ReturnType<typeof rakitApp>['app']
let penyandi: Awaited<ReturnType<typeof penyandiUji>>
const kuki: Record<string, string> = {}
beforeAll(async () => {
  uji = await buatDbUji()
  dunia = bangkitkanDb(SEKARANG_UJI)
  penyandi = await penyandiUji(uji.sqlMigrasi)
  app = rakitApp({ klien: uji.klien, penyandi }).app
  const akun: [string, string, string][] = [
    ['operator', SS, 'rosmiati@sungaisialang.desa.id'], ['sekdes', SS, 'hendri@sungaisialang.desa.id'], ['kades', SS, 'kades@sungaisialang.desa.id'],
    ['kaur', SS, 'nurhayati@sungaisialang.desa.id'], ['kadus', SS, 'sukardi@sungaisialang.desa.id'], ['operatorTl', TL, 'operator@tanjunglamo.desa.id'],
  ]
  for (const [i, [nama, basis, surel]] of akun.entries()) kuki[nama] = (await masukLewatRute(app, basis, surel, 'demo', `10.7.0.${i + 1}`)).kuki as string
})
afterAll(async () => {
  await uji?.tutup()
})
beforeEach(async () => {
  // Tanjung Lamo mulai tanpa baris pengaturan_surat dan dengan kode surat semula; Sungai Sialang kembali ke semai.
  await uji.sqlMigrasi`delete from pengaturan_surat where desa_id = ${DESA_TL}`
  await uji.sqlMigrasi`update desa set kode_surat = ${dunia.desa.find((d) => d.id === DESA_TL)?.kodeSurat as string} where id = ${DESA_TL}`
  await uji.sqlMigrasi`update desa set kode_surat = ${dunia.desa.find((d) => d.id === ID_SUNGAI_SIALANG)?.kodeSurat as string} where id = ${ID_SUNGAI_SIALANG}`
  const ss = dunia.pengaturanSurat.find((p) => p.desaId === ID_SUNGAI_SIALANG) ?? pengaturanBawaan(ID_SUNGAI_SIALANG)
  await uji.sqlMigrasi`update pengaturan_surat set tata_letak = ${uji.sqlMigrasi.json(ss.tataLetak as never)}, format_nomor = ${ss.formatNomor}, urutan = ${ss.urutan} where desa_id = ${ID_SUNGAI_SIALANG}`
})

const galat = async (r: Response) => galatSchema.parse(await r.json()).error
const tataLetak = (peran = 'operator', basis = SS) => ambil(app, `${basis}/api/v1/surat/tata-letak`, kuki[peran])
const simpanTataLetak = (badan: unknown, peran = 'operator', basis = SS) => kirimDenganMetode(app, 'PUT', basis, '/api/v1/surat/tata-letak', badan, kuki[peran])
const penomoran = (peran = 'operator', basis = SS) => ambil(app, `${basis}/api/v1/pengaturan/penomoran`, kuki[peran])
const simpanPenomoran = (badan: unknown, peran = 'operator', basis = SS) => kirimDenganMetode(app, 'PUT', basis, '/api/v1/pengaturan/penomoran', badan, kuki[peran])
const barisPengaturan = async (desaId: string) => uji.sqlMigrasi`select * from pengaturan_surat where desa_id = ${desaId}`
const kodeSuratDb = async (desaId: string) => (await uji.sqlMigrasi`select kode_surat from desa where id = ${desaId}`)[0].kode_surat as string
const tunda = (ms: number) => new Promise((r) => setTimeout(r, ms))
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
const bawaanTl = () => pengaturanBawaan(DESA_TL)
const duaLambang = () => salinTataLetak(TATA_LETAK_SIAP['dua-lambang'])

describe('GET dan PUT /surat/tata-letak (rencana 8F1 Tugas 6)', () => {
  it('GET: tata letak desa dari penyimpanan; desa tanpa baris mendapat tata letak bawaan tanpa menulis baris', async () => {
    const ss = dunia.pengaturanSurat.find((p) => p.desaId === ID_SUNGAI_SIALANG) ?? pengaturanBawaan(ID_SUNGAI_SIALANG)
    expect(tataLetakSuratSchema.parse(await (await tataLetak()).json())).toEqual(ss.tataLetak)
    expect(await (await tataLetak('operatorTl', TL)).json()).toEqual(bawaanTl().tataLetak)
    expect(await barisPengaturan(DESA_TL)).toHaveLength(0)
  })

  it('PUT: menyimpan dan mengembalikan tata letak dengan siap dihitung server (kiriman palsu dikoreksi)', async () => {
    const rata = salinTataLetak(TATA_LETAK_SIAP['rata-tengah'])
    const r = await simpanTataLetak({ ...rata, siap: 'standar' })
    expect(r.status).toBe(200)
    const badan = tataLetakSuratSchema.parse(await r.json())
    expect(badan).toEqual({ ...rata, siap: 'rata-tengah' })
    expect(tataLetakSuratSchema.parse(await (await tataLetak()).json())).toEqual(badan)
    expect((await barisPengaturan(ID_SUNGAI_SIALANG))[0].tata_letak).toEqual(badan)
  })

  it('PUT: isi yang tidak sama dengan tata letak siap pakai mana pun menjadi siap null, walau dikirim siap palsu', async () => {
    const diubah = duaLambang()
    diubah.huruf.ukuranPt = diubah.huruf.ukuranPt === 12 ? 11 : 12
    const r = await simpanTataLetak({ ...diubah, siap: 'dua-lambang' })
    expect(r.status).toBe(200)
    expect(tataLetakSuratSchema.parse(await r.json()).siap).toBe(samaDenganSiap(diubah))
    expect(samaDenganSiap(diubah)).toBeNull()
    expect((await barisPengaturan(ID_SUNGAI_SIALANG))[0].tata_letak.siap).toBeNull()
  })

  it('PUT kedua mengganti, tidak menambah baris; mode tanda tangan tidak berubah', async () => {
    await simpanTataLetak(duaLambang(), 'operatorTl', TL)
    await simpanTataLetak(salinTataLetak(TATA_LETAK_SIAP.standar), 'operatorTl', TL)
    const baris = await barisPengaturan(DESA_TL)
    expect(baris).toHaveLength(1)
    expect(baris[0]).toMatchObject({ mode_tanda_tangan: 'tte', format_nomor: FORMAT_NOMOR_BAWAAN, urutan: 'per-tahun' })
    expect(baris[0].tata_letak.siap).toBe('standar')
  })

  it('badan tidak valid: 422 per field, tidak ada yang tersimpan', async () => {
    const dasar = duaLambang()
    const kasus: [string, unknown, string][] = [
      ['kertas', { ...dasar, kertas: { ...dasar.kertas, ukuran: 'A5' } }, 'kertas.ukuran'],
      ['huruf', { ...dasar, huruf: { ...dasar.huruf, keluarga: 'Comic Sans' } }, 'huruf.keluarga'],
      ['kop tanpa baris', { ...dasar, kop: { ...dasar.kop, baris: [] } }, 'kop.baris'],
      ['kop enam baris', { ...dasar, kop: { ...dasar.kop, baris: ['a', 'b', 'c', 'd', 'e', 'f'] } }, 'kop.baris'],
      ['baris kop kosong', { ...dasar, kop: { ...dasar.kop, baris: ['  '] } }, 'kop.baris.0'],
      ['baris kop terlalu panjang', { ...dasar, kop: { ...dasar.kop, baris: ['x'.repeat(81)] } }, 'kop.baris.0'],
      ['unsur wajib hilang', { ...dasar, tandaTangan: { ...dasar.tandaTangan, urutan: ['jabatan', 'nama'] } }, 'tandaTangan.urutan'],
      ['unsur ganda', { ...dasar, tandaTangan: { ...dasar.tandaTangan, urutan: ['tempat-tanggal', 'jabatan', 'nama', 'nama'] } }, 'tandaTangan.urutan'],
      ['unsur di luar daftar', { ...dasar, tandaTangan: { ...dasar.tandaTangan, urutan: ['tempat-tanggal', 'jabatan', 'nama', 'cap'] } }, 'tandaTangan.urutan.3'],
      ['margin di luar 10-40', { ...dasar, kertas: { ...dasar.kertas, margin: { ...dasar.kertas.margin, atas: 5 } } }, 'kertas.margin.atas'],
    ]
    const sebelum = JSON.stringify(await barisPengaturan(ID_SUNGAI_SIALANG))
    for (const [nama, badan, kunci] of kasus) {
      const r = await simpanTataLetak(badan)
      expect(r.status, nama).toBe(422)
      expect((await galat(r)).fields, nama).toHaveProperty([kunci])
    }
    for (const badan of [{ ...dasar, css: 'body{display:none}' }, {}, null, 'teks']) expect((await simpanTataLetak(badan)).status, JSON.stringify(badan)).toBe(422)
    expect(JSON.stringify(await barisPengaturan(ID_SUNGAI_SIALANG))).toBe(sebelum)
  })

  it('badan di atas 1 MB ditolak 413 oleh lapisan HTTP', async () => {
    const r = await simpanTataLetak({ ...duaLambang(), tambahan: 'x'.repeat(1_100_000) })
    expect(r.status).toBe(413)
  })

  it('hak: hanya pengaturan.kelola (Operator dan Sekretaris); Kepala Desa, Kepala Dusun, Kaur Keuangan 403; tanpa sesi 401', async () => {
    for (const peran of ['operator', 'sekdes']) expect((await tataLetak(peran)).status, peran).toBe(200)
    for (const peran of ['kades', 'kadus', 'kaur']) {
      for (const r of [await tataLetak(peran), await simpanTataLetak(duaLambang(), peran)]) {
        expect(r.status, peran).toBe(403)
        expect(await galat(r)).toMatchObject({ code: 'FORBIDDEN', message: PESAN_PENGATURAN })
      }
    }
    expect((await ambil(app, `${SS}/api/v1/surat/tata-letak`)).status).toBe(401)
    expect((await kirimDenganMetode(app, 'PUT', SS, '/api/v1/surat/tata-letak', duaLambang())).status).toBe(401)
  })

  it('desa lain tidak berubah oleh PUT Sungai Sialang, dan desa Ditangguhkan menolak PUT', async () => {
    await simpanTataLetak(duaLambang())
    expect(await barisPengaturan(DESA_TL)).toHaveLength(0)
    await uji.sqlMigrasi`update desa set status = 'Ditangguhkan' where id = ${DESA_TL}`
    try {
      const { app: baru } = rakitApp({ klien: uji.klien, penyandi })
      const r = await kirimDenganMetode(baru, 'PUT', TL, '/api/v1/surat/tata-letak', duaLambang(), kuki.operatorTl)
      expect(r.status).toBe(403)
      expect(await galat(r)).toMatchObject({ message: 'Langganan desa ditangguhkan. Panel hanya bisa dilihat.' })
      expect((await ambil(baru, `${TL}/api/v1/surat/tata-letak`, kuki.operatorTl)).status).toBe(200)
      expect(await barisPengaturan(DESA_TL)).toHaveLength(0)
    } finally {
      await uji.sqlMigrasi`update desa set status = 'Aktif' where id = ${DESA_TL}`
    }
  })
})

describe('GET dan PUT /pengaturan/penomoran (rencana 8F1 Tugas 6)', () => {
  const jenisSs = () => dunia.jenisSurat.filter((j) => j.desaId === ID_SUNGAI_SIALANG)

  it('GET: format, urutan, kode surat, dan contoh dari jenis pertama menurut kode (belum ada surat terbit)', async () => {
    const r = await penomoran()
    expect(r.status).toBe(200)
    const badan = penomoranSchema.parse(await r.json())
    const pertama = [...jenisSs()].sort((a, b) => a.kode.localeCompare(b.kode))[0]
    const ss = dunia.pengaturanSurat.find((p) => p.desaId === ID_SUNGAI_SIALANG) ?? pengaturanBawaan(ID_SUNGAI_SIALANG)
    expect(badan).toEqual({
      formatNomor: ss.formatNomor,
      urutan: ss.urutan,
      kodeSurat: dunia.desa.find((d) => d.id === ID_SUNGAI_SIALANG)?.kodeSurat,
      contoh: { jenis: pertama.nama, kode: pertama.kode, klasifikasi: pertama.klasifikasi, urutPerTahun: 1, urutPerJenis: 1 },
    })
  })

  it('GET desa tanpa baris pengaturan: nilai bawaan, tidak menulis baris', async () => {
    const badan = penomoranSchema.parse(await (await penomoran('operatorTl', TL)).json())
    expect(badan).toMatchObject({ formatNomor: FORMAT_NOMOR_BAWAAN, urutan: 'per-tahun' })
    expect(await barisPengaturan(DESA_TL)).toHaveLength(0)
  })

  it('PUT: menyimpan format, urutan, dan kode surat dalam satu transaksi; kode dinormalisasi ke huruf kapital; GET langsung memuatnya', async () => {
    const r = await simpanPenomoran({ formatNomor: '{kodeJenis}/{urut}/{tahun}', urutan: 'per-jenis', kodeSurat: ' ab12 ' })
    expect(r.status).toBe(200)
    const badan = penomoranSchema.parse(await r.json())
    expect(badan).toMatchObject({ formatNomor: '{kodeJenis}/{urut}/{tahun}', urutan: 'per-jenis', kodeSurat: 'AB12' })
    expect(await kodeSuratDb(ID_SUNGAI_SIALANG)).toBe('AB12')
    expect((await barisPengaturan(ID_SUNGAI_SIALANG))[0]).toMatchObject({ format_nomor: '{kodeJenis}/{urut}/{tahun}', urutan: 'per-jenis', mode_tanda_tangan: 'tte' })
    // Cache alamat 30 detik tidak boleh membuat kode lama tampil: kode dibaca dari basis data.
    expect(penomoranSchema.parse(await (await penomoran()).json())).toEqual(badan)
  })

  it('PUT desa tanpa baris: baris dibuat dari nilai bawaan, hanya format dan urutan yang diisi dari kiriman', async () => {
    const r = await simpanPenomoran({ formatNomor: '{urut}/{tahun}', urutan: 'per-tahun', kodeSurat: 'tl' }, 'operatorTl', TL)
    expect(r.status).toBe(200)
    const baris = await barisPengaturan(DESA_TL)
    expect(baris).toHaveLength(1)
    expect(baris[0]).toMatchObject({ format_nomor: '{urut}/{tahun}', urutan: 'per-tahun', mode_tanda_tangan: 'tte' })
    expect(baris[0].tata_letak).toEqual(bawaanTl().tataLetak)
    expect(await kodeSuratDb(DESA_TL)).toBe('TL')
  })

  it('format yang bisa menghasilkan nomor kembar: 422 pada field formatNomor dengan pesan kontrak, tidak ada yang tersimpan', async () => {
    const kasus: [string, string, string, string][] = [
      ['tanpa urut', '{klasifikasi}/{kodeDesa}/{tahun}', 'per-tahun', 'Format wajib memuat nomor urut.'],
      ['tanpa tahun', '{klasifikasi}/{urut}/{kodeDesa}', 'per-tahun', 'Format wajib memuat tahun, karena nomor urut dimulai lagi setiap tahun.'],
      ['per jenis tanpa kode jenis', '{klasifikasi}/{urut}/{tahun}', 'per-jenis', 'Urutan per jenis surat wajib memuat kode jenis surat, supaya nomor antar-jenis tidak kembar.'],
      ['potongan ganda', '{urut}/{urut}/{tahun}', 'per-tahun', 'Setiap potongan hanya boleh dipakai sekali.'],
      ['pemisah campur', '{klasifikasi}/{urut}-{tahun}', 'per-tahun', 'Format nomor tidak dikenali.'],
      ['potongan tak dikenal', '{foo}/{urut}/{tahun}', 'per-tahun', 'Format nomor tidak dikenali.'],
      ['kosong', '', 'per-tahun', 'Format nomor tidak dikenali.'],
    ]
    const sebelum = JSON.stringify(await barisPengaturan(ID_SUNGAI_SIALANG))
    const kodeSebelum = await kodeSuratDb(ID_SUNGAI_SIALANG)
    for (const [nama, formatNomor, urutan, pesan] of kasus) {
      const r = await simpanPenomoran({ formatNomor, urutan, kodeSurat: 'XYZ' })
      expect(r.status, nama).toBe(422)
      expect((await galat(r)).fields, nama).toEqual({ formatNomor: pesan })
    }
    expect(JSON.stringify(await barisPengaturan(ID_SUNGAI_SIALANG))).toBe(sebelum)
    expect(await kodeSuratDb(ID_SUNGAI_SIALANG), 'kode surat tidak ikut berubah bila format ditolak').toBe(kodeSebelum)
  })

  it('kodeSurat kosong, lebih dari 8, atau berkarakter di luar huruf dan angka: 422 pada field kodeSurat; "S-S" ditolak', async () => {
    for (const kodeSurat of ['', '   ', 'ABCDEFGHI', 'S-S', 'S S', 'SS/1']) {
      const r = await simpanPenomoran({ formatNomor: FORMAT_NOMOR_BAWAAN, urutan: 'per-tahun', kodeSurat })
      expect(r.status, `"${kodeSurat}"`).toBe(422)
      expect((await galat(r)).fields, `"${kodeSurat}"`).toHaveProperty('kodeSurat')
    }
    for (const badan of [{}, null, { formatNomor: FORMAT_NOMOR_BAWAAN }, { formatNomor: FORMAT_NOMOR_BAWAAN, urutan: 'bulanan', kodeSurat: 'SS' }]) {
      expect((await simpanPenomoran(badan)).status, JSON.stringify(badan)).toBe(422)
    }
  })

  it('hak: hanya pengaturan.kelola; Kepala Desa, Kepala Dusun, Kaur Keuangan 403; tanpa sesi 401', async () => {
    for (const peran of ['operator', 'sekdes']) expect((await penomoran(peran)).status, peran).toBe(200)
    for (const peran of ['kades', 'kadus', 'kaur']) {
      for (const r of [await penomoran(peran), await simpanPenomoran({ formatNomor: FORMAT_NOMOR_BAWAAN, urutan: 'per-tahun', kodeSurat: 'SS' }, peran)]) {
        expect(r.status, peran).toBe(403)
        expect(await galat(r)).toMatchObject({ message: PESAN_PENGATURAN })
      }
    }
    expect((await ambil(app, `${SS}/api/v1/pengaturan/penomoran`)).status).toBe(401)
  })

  it('PUT Sungai Sialang tidak menyentuh kode surat dan pengaturan Tanjung Lamo', async () => {
    const kodeTl = await kodeSuratDb(DESA_TL)
    await simpanPenomoran({ formatNomor: '{urut}/{tahun}', urutan: 'per-tahun', kodeSurat: 'QQ' })
    expect(await kodeSuratDb(DESA_TL)).toBe(kodeTl)
    expect(await barisPengaturan(DESA_TL)).toHaveLength(0)
  })
})

describe('tata letak dan penomoran serentak pada desa tanpa baris (rencana 8F1 Fokus 6)', () => {
  const KIRIM_NOMOR = { formatNomor: '{kodeJenis}/{urut}/{tahun}', urutan: 'per-jenis' as const, kodeSurat: 'MB' }

  it('PUT tata letak menunggu baris yang disisipkan PUT penomoran dan tidak menimpa kolomnya', async () => {
    // Transaksi uji bertindak sebagai PUT penomoran yang menang lebih dulu: baris dibuat dengan format dan urutan barunya, belum commit.
    const penahan = await tahan((s) => s`insert into pengaturan_surat (desa_id, tata_letak, mode_tanda_tangan, format_nomor, urutan)
      values (${DESA_TL}, ${s.json(bawaanTl().tataLetak as never)}, 'tte', '{urut}/{tahun}', 'per-jenis')`)
    let selesai = false
    const permintaan = Promise.resolve(simpanTataLetak(duaLambang(), 'operatorTl', TL)).then((r) => {
      selesai = true
      return r
    })
    await tunda(600)
    expect(selesai, 'PUT tata letak harus menunggu indeks unik').toBe(false)
    await penahan.selesaikan()
    expect((await permintaan).status).toBe(200)
    const baris = await barisPengaturan(DESA_TL)
    expect(baris).toHaveLength(1)
    expect(baris[0]).toMatchObject({ format_nomor: '{urut}/{tahun}', urutan: 'per-jenis' })
    expect(baris[0].tata_letak.siap).toBe('dua-lambang')
  })

  it('PUT penomoran menunggu baris yang disisipkan PUT tata letak dan tidak menimpa tata letaknya', async () => {
    const penahan = await tahan((s) => s`insert into pengaturan_surat (desa_id, tata_letak, mode_tanda_tangan, format_nomor, urutan)
      values (${DESA_TL}, ${s.json(duaLambang() as never)}, 'tte', ${FORMAT_NOMOR_BAWAAN}, 'per-tahun')`)
    const permintaan = Promise.resolve(simpanPenomoran(KIRIM_NOMOR, 'operatorTl', TL))
    await tunda(600)
    await penahan.selesaikan()
    expect((await permintaan).status).toBe(200)
    const baris = await barisPengaturan(DESA_TL)
    expect(baris).toHaveLength(1)
    expect(baris[0]).toMatchObject({ format_nomor: '{kodeJenis}/{urut}/{tahun}', urutan: 'per-jenis' })
    expect(baris[0].tata_letak.siap).toBe('dua-lambang')
    expect(await kodeSuratDb(DESA_TL)).toBe('MB')
  })

  it('dua PUT bersamaan tanpa penahan: hasil akhir memuat kedua perubahan dan tepat satu baris', async () => {
    const [a, b] = await Promise.all([simpanTataLetak(duaLambang(), 'operatorTl', TL), simpanPenomoran(KIRIM_NOMOR, 'operatorTl', TL)])
    expect([a.status, b.status]).toEqual([200, 200])
    const baris = await barisPengaturan(DESA_TL)
    expect(baris).toHaveLength(1)
    expect(baris[0]).toMatchObject({ format_nomor: '{kodeJenis}/{urut}/{tahun}', urutan: 'per-jenis', mode_tanda_tangan: 'tte' })
    expect(baris[0].tata_letak.siap).toBe('dua-lambang')
  })
})

import { galatSchema } from '@sinfodes/kontrak/api'
import { bangkitkanDb } from '@sinfodes/demo/generator'
import type { DbDemo } from '@sinfodes/demo/tipe-db'
import { SEKARANG_UJI } from '@sinfodes/demo/uji-akun'
import { detailKeluargaSchema } from '@sinfodes/kontrak/keluarga/schema'
import { biodataDari, hasilCekNikSchema, type MasukanPenduduk } from '@sinfodes/kontrak/penduduk/masukan'
import { entriRiwayatSchema } from '@sinfodes/kontrak/penduduk/riwayat'
import { pendudukSchema, ringkasanPendudukSchema } from '@sinfodes/kontrak/penduduk/schema'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buatDbUji, penyandiUji, type DbUji } from '../../../test/basisdata'
import { ambil, kirimDenganMetode, kirimJson, masukLewatRute, rakitApp } from '../../../test/rakit-app'
import type { Penyandi } from '../../kripto/penyandi'
import { ruang } from '../../kripto/ruang'

const SS = 'http://sungaisialang.sinfodes.localhost'
const TL = 'http://tanjunglamo.sinfodes.localhost'
const NIK_BARU = '1405091005150019'
let urutNik = 100
/** NIK bebas yang belum pernah dipakai di berkas ini: uji berbagi satu basis data, tidak seperti tiruan yang disegarkan tiap uji. */
const nikBebas = (): string => `1405091005150${urutNik++}`
const NIK_SITI = '1405095203918002'
const PESAN_TIDAK_BERHAK = 'Peran Anda tidak berhak mengubah data kependudukan.'

let uji: DbUji
let dunia: DbDemo
let penyandi: Penyandi
let app: ReturnType<typeof rakitApp>['app']
let kuki: string
beforeAll(async () => {
  uji = await buatDbUji()
  dunia = bangkitkanDb(SEKARANG_UJI)
  penyandi = await penyandiUji(uji.sqlMigrasi)
  app = rakitApp({ klien: uji.klien, penyandi }).app
  kuki = (await masukLewatRute(app, SS, 'rosmiati@sungaisialang.desa.id', 'demo', '10.7.0.1')).kuki as string
})
afterAll(async () => {
  await uji?.tutup()
})

/** Anggota ketiga KK Syahrial (Nur Aini): bukan kepala dan tidak dipakai uji lain. */
const nurAini = () => (dunia.keluarga.find((k) => k.id === 'kk_syahrial')?.anggotaIds[2] as string)
const siti = () => dunia.penduduk.find((p) => p.id === 'pdk_siti_rahmah') as NonNullable<DbDemo['penduduk'][number]>

function masukanBaru(ubah: Partial<MasukanPenduduk> = {}): MasukanPenduduk {
  return {
    ...biodataDari(siti()),
    nik: nikBebas(),
    nama: 'Fajar Ramadhan',
    jenisKelamin: 'L',
    tanggalLahir: '2015-05-10',
    hubunganKeluarga: 'Anak',
    pendidikan: 'Belum Tamat SD/Sederajat',
    pekerjaan: 'Pelajar/Mahasiswa',
    statusPerkawinan: 'Belum Kawin',
    ktpEl: 'Belum wajib',
    telepon: null,
    nomorAktaLahir: null,
    keluarga: { jenis: 'ada', id: 'kk_syahrial' },
    ...ubah,
  }
}

const tambah = async (badan: unknown, kukiPakai: string | null = kuki, basis = SS): Promise<Response> => kirimJson(app, basis, '/api/v1/penduduk', badan, kukiPakai)
const ubahPdk = (id: string, badan: unknown, kukiPakai: string | null = kuki, basis = SS) => kirimDenganMetode(app, 'PATCH', basis, `/api/v1/penduduk/${id}`, badan, kukiPakai)
const cekNik = (badan: unknown, kukiPakai: string | null = kuki, basis = SS) => kirimJson(app, basis, '/api/v1/penduduk/cek-nik', badan, kukiPakai)
const galat = async (r: Response) => galatSchema.parse(await r.json()).error
const hitung = async (tabel: string, kondisi = 'true'): Promise<number> => Number((await uji.sqlMigrasi.unsafe(`select count(*)::int as n from ${tabel} where ${kondisi}`))[0].n)
const jiwa = async (): Promise<number> => ringkasanPendudukSchema.parse(await (await ambil(app, `${SS}/api/v1/penduduk/ringkasan`, kuki)).json()).jiwa
const kkTotal = async (): Promise<number> => ringkasanPendudukSchema.parse(await (await ambil(app, `${SS}/api/v1/penduduk/ringkasan`, kuki)).json()).kk

describe('POST /penduduk (SPEC §6.4)', () => {
  it('tambah ke KK yang ada: alamat ikut KK, sandi tersimpan, urutan di belakang, jiwa bertambah, aktivitas tercatat', async () => {
    const sebelum = await jiwa()
    const r = await tambah(masukanBaru({ nik: NIK_BARU }))
    expect(r.status).toBe(201)
    const p = pendudukSchema.parse(await r.json())
    expect(p).toMatchObject({ keluargaId: 'kk_syahrial', dusunId: 'dsn_ss_1', rw: '002', rt: '004', statusDasar: 'Hidup', nik: NIK_BARU, nama: 'Fajar Ramadhan', desaId: 'desa_sungai_sialang' })
    expect(await jiwa()).toBe(sebelum + 1)

    const [b] = await uji.sqlMigrasi`select nik_sandi, nik_indeks, urutan_kk, dibuat_pada, diubah_pada from penduduk where id = ${p.id}`
    expect(b.nik_sandi).toMatch(/^v1\./)
    expect(String(b.nik_sandi)).not.toContain(NIK_BARU)
    expect(b.nik_indeks).toBe(penyandi.indeks(NIK_BARU, ruang.nik('desa_sungai_sialang')))
    expect(b.urutan_kk).toBe(4)
    expect((b.dibuat_pada as Date).getTime()).toBe(SEKARANG_UJI.getTime())
    expect((b.diubah_pada as Date).getTime()).toBe(SEKARANG_UJI.getTime())

    const detail = detailKeluargaSchema.parse(await (await ambil(app, `${SS}/api/v1/keluarga/kk_syahrial`, kuki)).json())
    expect(detail.anggota.at(-1)?.id).toBe(p.id)
    const [a] = await uji.sqlMigrasi`select dusun_id, jenis, ringkasan, oleh_id, oleh_nama, rujukan_jenis, rujukan_id from aktivitas where rujukan_id = ${p.id}`
    expect(a).toMatchObject({
      dusun_id: 'dsn_ss_1', jenis: 'penduduk-tambah', ringkasan: 'Penduduk ditambahkan · Fajar Ramadhan', oleh_id: 'pgn_rosmiati', oleh_nama: 'Rosmiati', rujukan_jenis: 'penduduk',
    })
  })

  it('KK baru: nomor KK = kode wilayah + tanggal terbit hari ini + nomor urut, penduduknya jadi kepala di urutan 0', async () => {
    const kkSebelum = await kkTotal()
    const r = await tambah(masukanBaru({ nik: '1405091005150020', hubunganKeluarga: 'Kepala Keluarga', keluarga: { jenis: 'baru', dusunId: 'dsn_ss_3', rw: '005', rt: '012' } }))
    expect(r.status).toBe(201)
    const p = pendudukSchema.parse(await r.json())
    expect(p).toMatchObject({ dusunId: 'dsn_ss_3', rw: '005', rt: '012', hubunganKeluarga: 'Kepala Keluarga' })
    const { keluarga } = detailKeluargaSchema.parse(await (await ambil(app, `${SS}/api/v1/keluarga/${p.keluargaId}`, kuki)).json())
    expect(keluarga.nomorKk).toMatch(/^140509240926[89]\d{3}$/)
    expect(keluarga).toMatchObject({ kepalaKeluargaId: p.id, tanggalTerbit: '2026-09-24', anggotaIds: [p.id] })
    expect(await kkTotal()).toBe(kkSebelum + 1)
    const [b] = await uji.sqlMigrasi`select urutan_kk from penduduk where id = ${p.id}`
    expect(b.urutan_kk).toBe(0)
  })

  it('KK yang sudah punya kepala tidak bisa diberi kepala kedua; KK tak dikenal ditolak', async () => {
    const r = await tambah(masukanBaru({ hubunganKeluarga: 'Kepala Keluarga' }))
    expect(r.status).toBe(422)
    const g = await galat(r)
    expect(g.code).toBe('VALIDATION')
    expect(g.fields?.hubunganKeluarga).toMatch(/sudah punya kepala keluarga/)
    const tidakAda = await galat(await tambah(masukanBaru({ keluarga: { jenis: 'ada', id: 'kk_tidak_ada' } })))
    expect(tidakAda.fields?.keluarga).toBe('KK tidak ditemukan')
    const bukanKepala = await galat(await tambah(masukanBaru({ hubunganKeluarga: 'Anak', keluarga: { jenis: 'baru', dusunId: 'dsn_ss_1', rw: '002', rt: '004' } })))
    expect(bukanKepala.fields?.hubunganKeluarga).toBe('Penduduk pertama di KK baru adalah kepala keluarga')
  })

  it('wilayah KK baru harus ada di desa', async () => {
    const g = await galat(await tambah(masukanBaru({ hubunganKeluarga: 'Kepala Keluarga', keluarga: { jenis: 'baru', dusunId: 'dsn_ss_1', rw: '009', rt: '999' } })))
    expect(g.fields?.dusunId).toBe('Wilayah tidak dikenal')
  })

  it('NIK ganda → 409 dengan nama pemilik, juga untuk NIK mantan penduduk (fokus 2)', async () => {
    const r = await tambah(masukanBaru({ nik: NIK_SITI }))
    expect(r.status).toBe(409)
    const g = await galat(r)
    expect(g).toMatchObject({ code: 'CONFLICT', fields: { nik: 'NIK sudah terdaftar atas nama Siti Rahmah' } })
    const almarhum = dunia.penduduk.find((p) => p.desaId === 'desa_sungai_sialang' && p.statusDasar === 'Meninggal' && p.nik !== null) as NonNullable<DbDemo['penduduk'][number]>
    expect((await tambah(masukanBaru({ nik: almarhum.nik }))).status).toBe(409)
  })

  it('NIK yang sama di desa lain boleh: keunikan per desa, bukan nasional (Ruling 2)', async () => {
    await uji.sqlMigrasi`insert into dusun (id, desa_id, nomor, nama, kepala_dusun, posyandu, rw)
      values ('dsn_tl_uji', 'desa_tanjung_lamo', 1, 'Dusun Uji', 'Bapak Uji', 'Posyandu Uji', ${uji.sqlMigrasi.json([{ nomor: '001', ketua: '', rt: [{ nomor: '001', ketua: '' }] }])})`
    const yusri = (await masukLewatRute(app, TL, 'operator@tanjunglamo.desa.id', 'demo', '10.7.0.2')).kuki as string
    const r = await tambah(masukanBaru({ nik: NIK_SITI, hubunganKeluarga: 'Kepala Keluarga', keluarga: { jenis: 'baru', dusunId: 'dsn_tl_uji', rw: '001', rt: '001' } }), yusri, TL)
    expect(r.status).toBe(201)
    const sesudah = hasilCekNikSchema.parse(await (await cekNik({ nik: NIK_SITI }, yusri, TL)).json())
    expect(sesudah.penduduk?.nama).toBe('Fajar Ramadhan')
    const disiniMasihSiti = hasilCekNikSchema.parse(await (await cekNik({ nik: NIK_SITI })).json())
    expect(disiniMasihSiti.penduduk).toEqual({ id: 'pdk_siti_rahmah', nama: 'Siti Rahmah' })
  })

  it('isian tidak valid → 422 dengan rincian per field; NIK berspasi atau 15 angka ditolak (fokus 2)', async () => {
    const r = await tambah(masukanBaru({ nama: '' }))
    expect(r.status).toBe(422)
    expect((await galat(r)).fields?.nama).toBe('Nama lengkap wajib diisi')
    expect((await galat(await tambah(masukanBaru({ nik: '1405 0910 0515 0021' })))).fields?.nik).toBe('NIK harus 16 angka')
    expect((await galat(await tambah(masukanBaru({ nik: '140509100515002' })))).fields?.nik).toBe('NIK harus 16 angka')
    expect((await tambah('bukan json')).status).toBe(422)
  })

  it('tanggal lahir setelah hari ini ditolak', async () => {
    const g = await galat(await tambah(masukanBaru({ tanggalLahir: '2026-09-25' })))
    expect(g.fields?.tanggalLahir).toBe('Tanggal lahir tidak boleh setelah hari ini')
  })

  it('Kepala Desa, Kaur Keuangan, dan Kepala Dusun ditolak untuk tambah, ubah, dan cek NIK (fokus 4)', async () => {
    const akun = ['kades@sungaisialang.desa.id', 'nurhayati@sungaisialang.desa.id', 'sukardi@sungaisialang.desa.id']
    for (const [i, email] of akun.entries()) {
      const k = (await masukLewatRute(app, SS, email, 'demo', `10.7.1.${i}`)).kuki as string
      for (const r of [await tambah(masukanBaru(), k), await ubahPdk('pdk_siti_rahmah', { pekerjaan: 'Wiraswasta' }, k), await cekNik({ nik: NIK_BARU }, k)]) {
        expect(r.status, email).toBe(403)
        expect((await galat(r)).message).toBe(PESAN_TIDAK_BERHAK)
      }
    }
    expect((await tambah(masukanBaru(), null)).status).toBe(401)
  })

  it('dua KK baru serentak mendapat nomor KK berbeda dan tidak ada yang gagal (fokus 1)', async () => {
    const baru = (nik: string) => masukanBaru({ nik, hubunganKeluarga: 'Kepala Keluarga', keluarga: { jenis: 'baru', dusunId: 'dsn_ss_3', rw: '005', rt: '012' } })
    const [a, b] = await Promise.all([tambah(baru('1405091005150031')), tambah(baru('1405091005150032'))])
    expect([a.status, b.status]).toEqual([201, 201])
    const [pa, pb] = [pendudukSchema.parse(await a.json()), pendudukSchema.parse(await b.json())]
    expect(pa.keluargaId).not.toBe(pb.keluargaId)
    const nomor = async (id: string) => detailKeluargaSchema.parse(await (await ambil(app, `${SS}/api/v1/keluarga/${id}`, kuki)).json()).keluarga.nomorKk
    expect(await nomor(pa.keluargaId)).not.toBe(await nomor(pb.keluargaId))
  })

  it('dua anggota serentak ke KK yang sama mendapat urutan berbeda (kunci baris KK, fokus 1)', async () => {
    const [a, b] = await Promise.all([tambah(masukanBaru({ nik: '1405091005150041' })), tambah(masukanBaru({ nik: '1405091005150042' }))])
    expect([a.status, b.status]).toEqual([201, 201])
    const [pa, pb] = [pendudukSchema.parse(await a.json()), pendudukSchema.parse(await b.json())]
    const baris = await uji.sqlMigrasi`select id, urutan_kk from penduduk where id in (${pa.id}, ${pb.id})`
    expect(new Set(baris.map((x) => x.urutan_kk)).size).toBe(2)
  })

  it('kunci penasihat desa benar-benar menahan KK baru sampai kunci dilepas (bukti deterministik, fokus 1)', async () => {
    let selesai = false
    let hasil: Promise<Response> | undefined
    await uji.sqlMigrasi.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(hashtextextended('nomor-kk:desa_sungai_sialang', 0))`
      hasil = tambah(masukanBaru({ hubunganKeluarga: 'Kepala Keluarga', keluarga: { jenis: 'baru', dusunId: 'dsn_ss_3', rw: '005', rt: '012' } })).then((r) => {
        selesai = true
        return r
      })
      await new Promise((r) => setTimeout(r, 500))
      expect(selesai).toBe(false)
    })
    expect((await hasil)?.status).toBe(201)
  })

  it('kunci baris KK benar-benar menahan penambahan anggota sampai kunci dilepas (bukti deterministik, fokus 1)', async () => {
    let selesai = false
    let hasil: Promise<Response> | undefined
    await uji.sqlMigrasi.begin(async (tx) => {
      // FOR NO KEY UPDATE tidak menghalangi pemeriksaan kunci asing, jadi hanya FOR UPDATE di layanan yang bisa tertahan olehnya.
      await tx`select id from keluarga where id = 'kk_syahrial' for no key update`
      hasil = tambah(masukanBaru()).then((r) => {
        selesai = true
        return r
      })
      await new Promise((r) => setTimeout(r, 500))
      expect(selesai).toBe(false)
    })
    expect((await hasil)?.status).toBe(201)
  })

  it('kegagalan di tengah penulisan membatalkan semuanya: tidak ada penduduk setengah jadi (fokus 6)', async () => {
    await uji.sqlMigrasi.unsafe(`create function uji_gagal_aktivitas() returns trigger language plpgsql as $$ begin raise exception 'uji gagal'; end $$`)
    await uji.sqlMigrasi.unsafe('grant execute on function uji_gagal_aktivitas() to public')
    await uji.sqlMigrasi.unsafe('create trigger uji_gagal before insert on aktivitas for each row execute function uji_gagal_aktivitas()')
    const pendudukSebelum = await hitung('penduduk')
    const keluargaSebelum = await hitung('keluarga')
    const pekerjaanSebelum = (await uji.sqlMigrasi`select pekerjaan from penduduk where id = 'pdk_siti_rahmah'`)[0].pekerjaan as string
    try {
      const r = await tambah(masukanBaru({ nik: '1405091005150051', hubunganKeluarga: 'Kepala Keluarga', keluarga: { jenis: 'baru', dusunId: 'dsn_ss_3', rw: '005', rt: '012' } }))
      expect(r.status).toBe(500)
      const u = await ubahPdk('pdk_siti_rahmah', { pekerjaan: pekerjaanSebelum === 'Wiraswasta' ? 'Pedagang' : 'Wiraswasta' })
      expect(u.status).toBe(500)
    } finally {
      await uji.sqlMigrasi.unsafe('drop trigger uji_gagal on aktivitas')
      await uji.sqlMigrasi.unsafe('drop function uji_gagal_aktivitas()')
    }
    expect(await hitung('penduduk')).toBe(pendudukSebelum)
    expect(await hitung('keluarga')).toBe(keluargaSebelum)
    expect(await hitung('penduduk', `nik_indeks = '${penyandi.indeks('1405091005150051', ruang.nik('desa_sungai_sialang'))}'`)).toBe(0)
    const [b] = await uji.sqlMigrasi`select pekerjaan from penduduk where id = 'pdk_siti_rahmah'`
    expect(b.pekerjaan).toBe(pekerjaanSebelum)
  })
})

describe('PATCH /penduduk/:id (SPEC §6.4)', () => {
  it('perubahan tercatat di Riwayat dan aktivitas, waktu ubah mengikuti jam server', async () => {
    const riwayatSebelum = await hitung('riwayat_penduduk', `penduduk_id = 'pdk_siti_rahmah'`)
    const r = await ubahPdk('pdk_siti_rahmah', { pekerjaan: 'Wiraswasta' })
    expect(r.status).toBe(200)
    expect(pendudukSchema.parse(await r.json()).pekerjaan).toBe('Wiraswasta')
    const riwayat = entriRiwayatSchema.array().parse(await (await ambil(app, `${SS}/api/v1/penduduk/pdk_siti_rahmah/riwayat`, kuki)).json())
    expect(riwayat[0]).toMatchObject({ jenis: 'ubah', field: 'pekerjaan', nilaiLama: siti().pekerjaan, nilaiBaru: 'Wiraswasta', oleh: { id: 'pgn_rosmiati', nama: 'Rosmiati' } })
    expect(await hitung('riwayat_penduduk', `penduduk_id = 'pdk_siti_rahmah'`)).toBe(riwayatSebelum + 1)
    const baru = await uji.sqlMigrasi`select ringkasan, dusun_id from aktivitas where rujukan_id = 'pdk_siti_rahmah' and jenis = 'penduduk-ubah' and waktu = ${SEKARANG_UJI}`
    expect(baru.map((x) => x.ringkasan)).toContain('Data penduduk diubah · Siti Rahmah (Pekerjaan)')
    expect(baru[0].dusun_id).toBe(siti().dusunId)
    const [b] = await uji.sqlMigrasi`select diubah_pada from penduduk where id = 'pdk_siti_rahmah'`
    expect((b.diubah_pada as Date).getTime()).toBe(SEKARANG_UJI.getTime())
  })

  it('beberapa field sekaligus: satu baris riwayat per field berurutan menurut daftar field; NIK sendiri bukan ganda', async () => {
    const sebelum = await hitung('riwayat_penduduk', `penduduk_id = 'pdk_siti_rahmah'`)
    const r = await ubahPdk('pdk_siti_rahmah', { nik: NIK_SITI, pekerjaan: 'Pedagang', catatan: 'Pindah rumah' })
    expect(r.status).toBe(200)
    // NIK tidak berubah sehingga tidak tercatat; pekerjaan dan catatan masing-masing satu baris.
    expect(await hitung('riwayat_penduduk', `penduduk_id = 'pdk_siti_rahmah'`)).toBe(sebelum + 2)
    const baru = await uji.sqlMigrasi`select field from riwayat_penduduk where penduduk_id = 'pdk_siti_rahmah' and waktu = ${SEKARANG_UJI} and nilai_baru in ('Pedagang', 'Pindah rumah')`
    expect(baru.map((x) => x.field).sort()).toEqual(['catatan', 'pekerjaan'])
    const ringkasan = await uji.sqlMigrasi`select ringkasan from aktivitas where rujukan_id = 'pdk_siti_rahmah' and jenis = 'penduduk-ubah' and waktu = ${SEKARANG_UJI}`
    expect(ringkasan.map((x) => x.ringkasan)).toContain('Data penduduk diubah · Siti Rahmah (Pekerjaan, Catatan)')
  })

  it('NIK orang lain ditolak 409; NIK baru yang bebas tersimpan tersandi dan tercatat berkelompok di riwayat', async () => {
    const syahrial = dunia.penduduk.find((p) => p.id === 'pdk_syahrial') as NonNullable<DbDemo['penduduk'][number]>
    const tolak = await ubahPdk('pdk_siti_rahmah', { nik: syahrial.nik })
    expect(tolak.status).toBe(409)
    expect((await galat(tolak)).fields?.nik).toBe('NIK sudah terdaftar atas nama Syahrial')
    const ok = await ubahPdk(nurAini(), { nik: '1405091005150061' })
    expect(ok.status).toBe(200)
    expect(pendudukSchema.parse(await ok.json()).nik).toBe('1405091005150061')
    const [b] = await uji.sqlMigrasi`select nik_sandi, nik_indeks from penduduk where id = ${nurAini()}`
    expect(String(b.nik_sandi)).not.toContain('1405091005150061')
    expect(b.nik_indeks).toBe(penyandi.indeks('1405091005150061', ruang.nik('desa_sungai_sialang')))
    const riwayat = entriRiwayatSchema.array().parse(await (await ambil(app, `${SS}/api/v1/penduduk/${nurAini()}/riwayat`, kuki)).json())
    expect(riwayat[0]).toMatchObject({ jenis: 'ubah', field: 'nik', nilaiBaru: '140509 100515 0061' })
    // Di basis data nilai NIK tidak pernah polos, juga di Riwayat (SPEC-V0.3 §7.6).
    const [mentah] = await uji.sqlMigrasi`select nilai_lama, nilai_baru from riwayat_penduduk where penduduk_id = ${nurAini()} and field = 'nik' order by waktu desc, id desc limit 1`
    expect(String(mentah.nilai_baru)).toMatch(/^v1\./)
    expect(JSON.stringify(mentah)).not.toMatch(/0061/)
  })

  it('telepon baru tersandi di basis data dan terbaca kembali', async () => {
    const r = await ubahPdk('pdk_siti_rahmah', { telepon: '081234567890' })
    expect(r.status).toBe(200)
    expect(pendudukSchema.parse(await r.json()).telepon).toBe('081234567890')
    const [b] = await uji.sqlMigrasi`select telepon_sandi from penduduk where id = 'pdk_siti_rahmah'`
    expect(String(b.telepon_sandi)).toMatch(/^v1\./)
    expect(String(b.telepon_sandi)).not.toContain('081234567890')
    expect(penyandi.bukaSandi(b.telepon_sandi as string, ruang.telepon('desa_sungai_sialang'))).toBe('081234567890')
    const [rt] = await uji.sqlMigrasi`select nilai_baru from riwayat_penduduk where penduduk_id = 'pdk_siti_rahmah' and field = 'telepon' and nilai_baru is not null order by waktu desc, id desc limit 1`
    expect(String(rt.nilai_baru)).toMatch(/^v1\./)
    expect(String(rt.nilai_baru)).not.toContain('081234567890')
    const kosong = await ubahPdk('pdk_siti_rahmah', { telepon: null })
    expect(pendudukSchema.parse(await kosong.json()).telepon).toBeNull()
    const [c] = await uji.sqlMigrasi`select telepon_sandi from penduduk where id = 'pdk_siti_rahmah'`
    expect(c.telepon_sandi).toBeNull()
  })

  it('tanpa perubahan nyata → 200 tanpa riwayat, aktivitas, dan perubahan waktu ubah', async () => {
    const riwayat = await hitung('riwayat_penduduk')
    const aktivitas = await hitung('aktivitas')
    const [sebelum] = await uji.sqlMigrasi`select diubah_pada from penduduk where id = 'pdk_syahrial'`
    const r = await ubahPdk('pdk_syahrial', { nama: 'Syahrial' })
    expect(r.status).toBe(200)
    expect(await hitung('riwayat_penduduk')).toBe(riwayat)
    expect(await hitung('aktivitas')).toBe(aktivitas)
    const [sesudah] = await uji.sqlMigrasi`select diubah_pada from penduduk where id = 'pdk_syahrial'`
    expect((sesudah.diubah_pada as Date).getTime()).toBe((sebelum.diubah_pada as Date).getTime())
  })

  it('kepala keluarga tidak bisa diubah lewat PATCH, dan anggota tidak bisa dijadikan kepala', async () => {
    const dariKepala = await galat(await ubahPdk('pdk_syahrial', { hubunganKeluarga: 'Suami' }))
    expect(dariKepala.fields?.hubunganKeluarga).toMatch(/Ganti kepala keluarga/)
    const keKepala = await ubahPdk('pdk_siti_rahmah', { hubunganKeluarga: 'Kepala Keluarga' })
    expect(keKepala.status).toBe(422)
  })

  it('id tak dikenal 404, isian tidak valid 422, tanggal lahir lewat hari ini 422', async () => {
    const tidakAda = await ubahPdk('pdk_tidak_ada', { pekerjaan: 'Wiraswasta' })
    expect(tidakAda.status).toBe(404)
    expect((await galat(tidakAda)).message).toBe('Data penduduk tidak ditemukan.')
    expect((await ubahPdk('pdk_siti_rahmah', { pekerjaan: 'Astronot' })).status).toBe(422)
    const lewat = await galat(await ubahPdk('pdk_siti_rahmah', { tanggalLahir: '2026-09-25' }))
    expect(lewat.fields?.tanggalLahir).toBe('Tanggal lahir tidak boleh setelah hari ini')
  })

  it('penduduk desa lain tidak bisa diubah: 404 bagi operator Tanjung Lamo', async () => {
    const yusri = (await masukLewatRute(app, TL, 'operator@tanjunglamo.desa.id', 'demo', '10.7.0.3')).kuki as string
    expect((await ubahPdk('pdk_siti_rahmah', { pekerjaan: 'Wiraswasta' }, yusri, TL)).status).toBe(404)
  })
})

describe('POST /penduduk/cek-nik (SPEC §6.4)', () => {
  it('terdaftar beserta pemiliknya, belum terdaftar, dan pengecualian diri sendiri', async () => {
    expect(hasilCekNikSchema.parse(await (await cekNik({ nik: NIK_SITI })).json())).toEqual({ terdaftar: true, penduduk: { id: 'pdk_siti_rahmah', nama: 'Siti Rahmah' } })
    expect(hasilCekNikSchema.parse(await (await cekNik({ nik: '1405091005159999' })).json())).toEqual({ terdaftar: false, penduduk: null })
    expect(hasilCekNikSchema.parse(await (await cekNik({ nik: NIK_SITI, kecualiId: 'pdk_siti_rahmah' })).json())).toEqual({ terdaftar: false, penduduk: null })
  })

  it('NIK tidak valid 422 dan NIK mantan penduduk tetap terdaftar', async () => {
    expect((await cekNik({ nik: '123' })).status).toBe(422)
    const almarhum = dunia.penduduk.find((p) => p.desaId === 'desa_sungai_sialang' && p.statusDasar === 'Meninggal' && p.nik !== null) as NonNullable<DbDemo['penduduk'][number]>
    expect(hasilCekNikSchema.parse(await (await cekNik({ nik: almarhum.nik })).json()).terdaftar).toBe(true)
  })
})

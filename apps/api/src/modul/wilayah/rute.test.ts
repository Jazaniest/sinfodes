import { galatSchema } from '@sinfodes/kontrak/api'
import { ID_SUNGAI_SIALANG } from '@sinfodes/demo/data/desa-demo'
import { bangkitkanDb } from '@sinfodes/demo/generator'
import type { DbDemo } from '@sinfodes/demo/tipe-db'
import { SEKARANG_UJI } from '@sinfodes/demo/uji-akun'
import { sesiAdminSchema } from '@sinfodes/kontrak/pengguna/schema'
import { formDariWilayah, wilayahDesaSchema, type UbahWilayah, type WilayahDesa } from '@sinfodes/kontrak/pengaturan/wilayah'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { buatDbUji, penyandiUji, type DbUji } from '../../../test/basisdata'
import { ambil, kirimDenganMetode, masukLewatRute, rakitApp } from '../../../test/rakit-app'

const SS = 'http://sungaisialang.sinfodes.localhost'
const TL = 'http://tanjunglamo.sinfodes.localhost'
const ISTILAH = { dusun: 'Dusun', rw: 'RW', rt: 'RT' }
/** Dua dusun baru Tanjung Lamo. Nomornya sengaja salah; server menomori ulang menurut urutan. */
const SUSUNAN: UbahWilayah = {
  istilah: ISTILAH,
  dusun: [
    { id: 'baru-1', nama: 'Tanjung', kepalaDusun: 'Ahmad Yani', rw: [{ nomor: '009', ketua: 'Rasyid', rt: [{ nomor: '009', ketua: 'Udin' }, { nomor: '009', ketua: 'Usman' }] }] },
    { id: 'baru-2', nama: 'Lamo', kepalaDusun: 'Bahar', rw: [{ nomor: '009', ketua: 'Kasim', rt: [{ nomor: '009', ketua: 'Jalil' }] }] },
  ],
}

let uji: DbUji
let dunia: DbDemo
let app: ReturnType<typeof rakitApp>['app']
let yusri: string
let operatorSs: string
beforeAll(async () => {
  uji = await buatDbUji()
  dunia = bangkitkanDb(SEKARANG_UJI)
  app = rakitApp({ klien: uji.klien, penyandi: await penyandiUji(uji.sqlMigrasi) }).app
  yusri = (await masukLewatRute(app, TL, 'operator@tanjunglamo.desa.id', 'demo', '10.4.0.1')).kuki as string
  operatorSs = (await masukLewatRute(app, SS, 'rosmiati@sungaisialang.desa.id', 'demo', '10.4.0.2')).kuki as string
})
afterAll(async () => {
  await uji?.tutup()
})
beforeEach(async () => {
  await uji.sqlMigrasi`delete from pengguna where desa_id = 'desa_tanjung_lamo' and peran = 'kadus'`
  await uji.sqlMigrasi`delete from dusun where desa_id = 'desa_tanjung_lamo'`
  await uji.sqlMigrasi`update desa set istilah_wilayah = ${uji.sqlMigrasi.json(ISTILAH)} where id = 'desa_tanjung_lamo'`
})

const ambilWilayah = async (kuki: string = yusri, basis = TL): Promise<WilayahDesa> => wilayahDesaSchema.parse(await (await ambil(app, `${basis}/api/v1/pengaturan/wilayah`, kuki)).json())
const simpan = async (badan: unknown, kuki: string | null = yusri, basis = TL): Promise<Response> => kirimDenganMetode(app, 'PUT', basis, '/api/v1/pengaturan/wilayah', badan, kuki)
const simpanOk = async (badan: unknown, kuki: string = yusri, basis = TL): Promise<WilayahDesa> => {
  const r = await simpan(badan, kuki, basis)
  expect(r.status).toBe(200)
  return wilayahDesaSchema.parse(await r.json())
}
const galat = async (r: Response) => galatSchema.parse(await r.json()).error
/** "dsn_tl_1#1 001(001,002)": ID, nomor dusun, lalu RW beserta RT-nya. */
const ringkas = (w: WilayahDesa) => w.dusun.map((d) => `${d.id}#${d.nomor} ${d.rw.map((rw) => `${rw.nomor}(${rw.rt.map((rt) => rt.nomor).join(',')})`).join(' ')}`)
const jumlahDusunTl = async (): Promise<number> => Number((await uji.sqlMigrasi`select count(*)::int as n from dusun where desa_id = 'desa_tanjung_lamo'`)[0].n)

describe('PUT /pengaturan/wilayah: susunan desa tanpa penduduk (tahap 6C)', () => {
  it('Tanjung Lamo belum punya penduduk: susunan terbuka; dusun, RW, dan RT tersimpan bernomor urut dan ikut di sesi', async () => {
    expect(await ambilWilayah()).toEqual({ istilah: ISTILAH, dusun: [], susunanTerkunci: false })
    const hasil = await simpanOk(SUSUNAN)
    expect(ringkas(hasil)).toEqual(['dsn_tl_1#1 001(001,002)', 'dsn_tl_2#2 002(003)'])
    expect(hasil.dusun[0]).toMatchObject({ desaId: 'desa_tanjung_lamo', nama: 'Tanjung', kepalaDusun: 'Ahmad Yani', posyandu: '' })
    expect(hasil.susunanTerkunci).toBe(false)
    expect(await ambilWilayah()).toEqual(hasil)
    const sesi = sesiAdminSchema.parse(await (await ambil(app, `${TL}/api/v1/sesi`, yusri)).json())
    expect(sesi.dusun.map((d) => d.id)).toEqual(['dsn_tl_1', 'dsn_tl_2'])
  })

  it('dusun lama tetap ber-ID sama; yang dihapus hilang; dusun baru di depan menggeser nomor', async () => {
    const [, lamo] = formDariWilayah(await simpanOk(SUSUNAN)).dusun
    const hasil = await simpanOk({ istilah: ISTILAH, dusun: [{ ...SUSUNAN.dusun[0], id: 'baru-3', nama: 'Hilir' }, lamo] })
    expect(ringkas(hasil)).toEqual(['dsn_tl_3#1 001(001,002)', 'dsn_tl_2#2 002(003)'])
    expect(await jumlahDusunTl()).toBe(2)
  })

  it('dua dusun saling bertukar urutan: nomor ikut urutan baru tanpa menabrak batas unik', async () => {
    const [satu, dua] = formDariWilayah(await simpanOk(SUSUNAN)).dusun
    const hasil = await simpanOk({ istilah: ISTILAH, dusun: [dua, satu] })
    expect(hasil.dusun.map((d) => [d.id, d.nomor, d.nama])).toEqual([['dsn_tl_2', 1, 'Lamo'], ['dsn_tl_1', 2, 'Tanjung']])
  })

  it('dusun yang dipakai akun Kepala Dusun tidak bisa dihapus; jabatannya ikut nomor baru (fokus 3 tiruan)', async () => {
    const awal = formDariWilayah(await simpanOk(SUSUNAN))
    await uji.sqlMigrasi`insert into pengguna (id, desa_id, nama, jabatan, peran, dusun_id, email, aktif, kata_sandi_hash)
      values ('pgn_kadus_lamo', 'desa_tanjung_lamo', 'Bahar', 'Kepala Dusun II', 'kadus', 'dsn_tl_2', 'bahar@tanjunglamo.desa.id', true, 'x')`
    const tolak = await simpan({ ...awal, dusun: [awal.dusun[0]] })
    expect(tolak.status).toBe(409)
    expect(await galat(tolak)).toMatchObject({ code: 'CONFLICT', message: 'Dusun II Lamo masih dipakai akun Bahar. Ganti peran akun itu dulu di Pengaturan › Pengguna.' })
    expect(await jumlahDusunTl()).toBe(2)
    await simpanOk({ ...awal, dusun: [awal.dusun[1]] })
    const [p] = await uji.sqlMigrasi`select jabatan, dusun_id from pengguna where id = 'pgn_kadus_lamo'`
    expect(p).toMatchObject({ jabatan: 'Kepala Dusun I', dusun_id: 'dsn_tl_2' })
  })

  it('jabatan yang sudah diubah manual tidak ditimpa nomor baru', async () => {
    const awal = formDariWilayah(await simpanOk(SUSUNAN))
    await uji.sqlMigrasi`insert into pengguna (id, desa_id, nama, jabatan, peran, dusun_id, email, aktif, kata_sandi_hash)
      values ('pgn_kadus_lamo', 'desa_tanjung_lamo', 'Bahar', 'Kadus Lamo', 'kadus', 'dsn_tl_2', 'bahar@tanjunglamo.desa.id', true, 'x')`
    await simpanOk({ ...awal, dusun: [awal.dusun[1]] })
    expect((await uji.sqlMigrasi`select jabatan from pengguna where id = 'pgn_kadus_lamo'`)[0].jabatan).toBe('Kadus Lamo')
  })

  it('ID dusun desa lain diperlakukan sebagai dusun baru; dusun Sungai Sialang tidak berubah (fokus 1 tiruan)', async () => {
    const sebelum = await uji.sqlMigrasi`select * from dusun where id = 'dsn_ss_1'`
    const hasil = await simpanOk({ istilah: ISTILAH, dusun: [{ ...SUSUNAN.dusun[1], id: 'dsn_ss_1', nama: 'Bajakan' }] })
    expect(hasil.dusun.map((d) => d.id)).toEqual(['dsn_tl_1'])
    expect(await uji.sqlMigrasi`select * from dusun where id = 'dsn_ss_1'`).toEqual(sebelum)
  })

  it('susunan kosong atau ID kembar ditolak; istilah baru tersimpan bersama susunan dan langsung terlihat di sesi', async () => {
    const kosong = await simpan({ istilah: ISTILAH, dusun: [] })
    expect(kosong.status).toBe(422)
    expect((await galat(kosong)).fields).toMatchObject({ dusun: 'Tambahkan minimal satu dusun' })
    const kembar = await simpan({ istilah: ISTILAH, dusun: [SUSUNAN.dusun[0], { ...SUSUNAN.dusun[1], id: SUSUNAN.dusun[0].id }] })
    expect(kembar.status).toBe(422)
    expect(await jumlahDusunTl()).toBe(0)
    const hasil = await simpanOk({ ...SUSUNAN, istilah: { ...ISTILAH, dusun: 'Jorong' } })
    expect(hasil.istilah.dusun).toBe('Jorong')
    const sesi = sesiAdminSchema.parse(await (await ambil(app, `${TL}/api/v1/sesi`, yusri)).json())
    expect(sesi.desa.istilahWilayah.dusun).toBe('Jorong')
  })

  it('kegagalan di tengah penulisan membatalkan semuanya: tidak ada dusun setengah jadi (fokus 6)', async () => {
    await uji.sqlMigrasi.unsafe(`create function uji_gagal_desa() returns trigger language plpgsql as $$ begin raise exception 'uji gagal'; end $$`)
    await uji.sqlMigrasi.unsafe('grant execute on function uji_gagal_desa() to public')
    await uji.sqlMigrasi.unsafe('create trigger uji_gagal_desa before update on desa for each row execute function uji_gagal_desa()')
    try {
      expect((await simpan({ ...SUSUNAN, istilah: { ...ISTILAH, dusun: 'Jorong' } })).status).toBe(500)
    } finally {
      await uji.sqlMigrasi.unsafe('drop trigger uji_gagal_desa on desa')
      await uji.sqlMigrasi.unsafe('drop function uji_gagal_desa()')
    }
    expect(await jumlahDusunTl()).toBe(0)
    expect((await ambilWilayah()).istilah.dusun).toBe('Dusun')
  })
})

describe('Sungai Sialang: susunan terkunci karena sudah punya penduduk (fokus 2 tiruan)', () => {
  it('GET sama dengan dunia demo dan terkunci', async () => {
    const w = await ambilWilayah(operatorSs, SS)
    expect(w.susunanTerkunci).toBe(true)
    expect(w.istilah).toEqual(ISTILAH)
    expect(w.dusun).toEqual(dunia.dusun.filter((d) => d.desaId === ID_SUNGAI_SIALANG).sort((a, b) => a.nomor - b.nomor))
  })

  it('menambah dusun → 409 CONFLICT dengan pesan tiruan, tidak ada yang berubah', async () => {
    const w = await ambilWilayah(operatorSs, SS)
    const tambah = formDariWilayah(w)
    tambah.dusun.push({ ...SUSUNAN.dusun[0] })
    const r = await simpan(tambah, operatorSs, SS)
    expect(r.status).toBe(409)
    expect(await galat(r)).toMatchObject({ code: 'CONFLICT', message: 'Susunan wilayah sudah berubah. Muat ulang halaman, lalu ulangi perubahan.' })
    expect(await ambilWilayah(operatorSs, SS)).toEqual(w)
    const kurang = formDariWilayah(w)
    kurang.dusun.pop()
    expect((await simpan(kurang, operatorSs, SS)).status).toBe(409)
  })

  it('nama dusun, kepala dusun, ketua RW dan RT boleh diubah; ID, nomor, posyandu, dan susunan tetap', async () => {
    const w = await ambilWilayah(operatorSs, SS)
    const form = formDariWilayah(w)
    form.dusun[0].nama = 'Nama Baru'
    form.dusun[0].kepalaDusun = 'Kepala Baru'
    form.dusun[0].rw[0].ketua = 'Ketua RW Baru'
    form.dusun[0].rw[0].rt[0].ketua = 'Ketua RT Baru'
    const hasil = await simpanOk(form, operatorSs, SS)
    expect(hasil.dusun[0]).toMatchObject({ id: w.dusun[0].id, nomor: w.dusun[0].nomor, nama: 'Nama Baru', kepalaDusun: 'Kepala Baru', posyandu: w.dusun[0].posyandu })
    expect(hasil.dusun[0].rw[0].ketua).toBe('Ketua RW Baru')
    expect(hasil.dusun[0].rw[0].rt[0].ketua).toBe('Ketua RT Baru')
    expect(hasil.dusun[0].rw.map((rw) => rw.nomor)).toEqual(w.dusun[0].rw.map((rw) => rw.nomor))
    expect(hasil.dusun.slice(1)).toEqual(w.dusun.slice(1))
    // Perbedaan sengaja dari tiruan: istilah yang diubah ikut tersimpan walau susunan terkunci (tiruan mengabaikannya).
    form.istilah = { ...ISTILAH, rt: 'Rukun Tetangga' }
    expect((await simpanOk(form, operatorSs, SS)).istilah.rt).toBe('Rukun Tetangga')
    form.istilah = ISTILAH
    expect((await simpanOk(form, operatorSs, SS)).istilah).toEqual(ISTILAH)
  })
})

describe('hak dan batas desa', () => {
  it('Sekretaris Desa boleh; Kepala Desa, Kaur Keuangan, dan Kepala Dusun 403 dengan pesan tiruan; tanpa login 401', async () => {
    const sekdes = (await masukLewatRute(app, SS, 'hendri@sungaisialang.desa.id', 'demo', '10.4.1.0')).kuki as string
    expect((await ambil(app, `${SS}/api/v1/pengaturan/wilayah`, sekdes)).status).toBe(200)
    for (const [i, email] of ['kades@sungaisialang.desa.id', 'nurhayati@sungaisialang.desa.id', 'sukardi@sungaisialang.desa.id'].entries()) {
      const k = (await masukLewatRute(app, SS, email, 'demo', `10.4.1.${i + 1}`)).kuki as string
      for (const r of [await ambil(app, `${SS}/api/v1/pengaturan/wilayah`, k), await simpan(formDariWilayah(await ambilWilayah(operatorSs, SS)), k, SS)]) {
        expect(r.status, email).toBe(403)
        expect((await galat(r)).message).toBe('Peran Anda tidak berhak membuka Pengaturan desa.')
      }
    }
    expect((await ambil(app, `${SS}/api/v1/pengaturan/wilayah`)).status).toBe(401)
    expect((await simpan(SUSUNAN, null)).status).toBe(401)
  })

  it('operator Tanjung Lamo tidak melihat dusun Sungai Sialang dan kuki Sungai Sialang tidak berlaku di sana', async () => {
    expect((await ambilWilayah()).dusun).toEqual([])
    expect((await ambil(app, `${TL}/api/v1/pengaturan/wilayah`, operatorSs)).status).toBe(401)
  })
})

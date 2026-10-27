import { ID_SUNGAI_SIALANG, KATA_SANDI_DEMO } from '@sinfodes/demo/data/desa-demo'
import { bangkitkanDb } from '@sinfodes/demo/generator'
import type { DbDemo } from '@sinfodes/demo/tipe-db'
import { SEKARANG_UJI } from '@sinfodes/demo/uji-akun'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { periksaKataSandi } from '../kripto/kata-sandi'
import type { Penyandi } from '../kripto/penyandi'
import { buatDbUji, penyandiUji, type DbUji } from '../../test/basisdata'
import { KID_UJI, KUNCI_UTAMA_UJI } from '../../test/env-uji'
import { GalatSemai, pastikanKunciData, semaiDunia } from './semai'

let uji: DbUji
let penyandi: Penyandi
let dunia: DbDemo
beforeAll(async () => {
  uji = await buatDbUji()
  penyandi = await penyandiUji(uji.sqlMigrasi)
  dunia = bangkitkanDb(SEKARANG_UJI)
})
afterAll(async () => {
  await uji?.tutup()
})

const hitung = async (tabel: string): Promise<number> => Number((await uji.sqlMigrasi.unsafe(`select count(*)::int as n from ${tabel}`))[0].n)
const opsiUji = () => ({ lingkungan: 'uji' as const, dunia })

describe('semai dari dunia demo (rencana 8C Tugas 6)', () => {
  it('jumlah baris sama dengan dunia demo, 2.812 jiwa dan 806 KK untuk Sungai Sialang', async () => {
    expect(await hitung('desa')).toBe(dunia.desa.length)
    expect(await hitung('alias_alamat')).toBe(dunia.aliasAlamat.length)
    expect(await hitung('dusun')).toBe(dunia.dusun.length)
    expect(await hitung('pengguna')).toBe(dunia.pengguna.length)
    expect(await hitung('keluarga')).toBe(dunia.keluarga.length)
    expect(await hitung('penduduk')).toBe(dunia.penduduk.length)
    const [jiwa] = await uji.sqlMigrasi`select count(*)::int as n from penduduk where desa_id = ${ID_SUNGAI_SIALANG} and status_dasar = 'Hidup'`
    expect(jiwa.n).toBe(2812)
    const [kk] = await uji.sqlMigrasi`select count(distinct keluarga_id)::int as n from penduduk where desa_id = ${ID_SUNGAI_SIALANG} and status_dasar = 'Hidup'`
    expect(kk.n).toBe(806)
  })

  it('ID demo yang terbaca dipertahankan dan identitas desa terpetakan', async () => {
    const [pengguna] = await uji.sqlMigrasi`select desa_id, peran, email from pengguna where id = 'pgn_hendri'`
    expect(pengguna).toMatchObject({ desa_id: ID_SUNGAI_SIALANG, peran: 'sekdes', email: 'hendri@sungaisialang.desa.id' })
    const [warga] = await uji.sqlMigrasi`select desa_id, nama from penduduk where id = 'pdk_siti_rahmah'`
    expect(warga.desa_id).toBe(ID_SUNGAI_SIALANG)
    const [desa] = await uji.sqlMigrasi`select slug, status, kecamatan_nama, warna_aksen, modul, tampilan_warga from desa where id = ${ID_SUNGAI_SIALANG}`
    expect(desa).toMatchObject({ slug: 'sungaisialang', status: 'Aktif', kecamatan_nama: 'Teluk Meranti', modul: { kesehatan: true } })
    expect(desa.warna_aksen).toMatch(/^#[0-9a-fA-F]{6}$/)
    expect(desa.tampilan_warga).toHaveProperty('warnaUtama')
    const [persiapan] = await uji.sqlMigrasi`select tampilan_warga, modul from desa where id = 'desa_tanjung_lamo'`
    expect(persiapan.tampilan_warga).toBeNull()
    expect(persiapan.modul).toEqual({ kesehatan: false })
  })

  it('NIK, nomor KK, dan telepon tidak ada polos di basis data', async () => {
    const warga = dunia.penduduk.filter((p) => p.nik && p.telepon).slice(0, 60)
    expect(warga.length).toBeGreaterThan(20)
    const [{ teks }] = await uji.sqlMigrasi`select string_agg(p::text, E'\n') as teks from penduduk p`
    for (const p of warga) {
      expect(teks.includes(p.nik as string), `NIK ${p.id}`).toBe(false)
      expect(teks.includes(p.telepon as string), `telepon ${p.id}`).toBe(false)
    }
    const [{ teksKk }] = await uji.sqlMigrasi`select string_agg(k::text, E'\n') as "teksKk" from keluarga k`
    for (const k of dunia.keluarga.slice(0, 60)) expect(teksKk.includes(k.nomorKk), `KK ${k.id}`).toBe(false)
    const [bentuk] = await uji.sqlMigrasi`select nik_sandi, telepon_sandi from penduduk where id = ${warga[0].id}`
    expect(bentuk.nik_sandi).toMatch(new RegExp(`^v1\\.${KID_UJI}\\.`))
    expect(bentuk.telepon_sandi).toMatch(new RegExp(`^v1\\.${KID_UJI}\\.`))
  })

  it('buka sandi mengembalikan nilai asli', async () => {
    const warga = dunia.penduduk.filter((p) => p.nik && p.telepon).slice(0, 25)
    for (const p of warga) {
      const [b] = await uji.sqlMigrasi`select nik_sandi, telepon_sandi from penduduk where id = ${p.id}`
      expect(penyandi.bukaSandi(b.nik_sandi, `penduduk.nik:${p.desaId}`)).toBe(p.nik)
      expect(penyandi.bukaSandi(b.telepon_sandi, `penduduk.telepon:${p.desaId}`)).toBe(p.telepon)
    }
    for (const k of dunia.keluarga.slice(0, 25)) {
      const [b] = await uji.sqlMigrasi`select nomor_kk_sandi from keluarga where id = ${k.id}`
      expect(penyandi.bukaSandi(b.nomor_kk_sandi, `keluarga.nomorKk:${k.desaId}`)).toBe(k.nomorKk)
    }
    const tanpaNik = dunia.penduduk.find((p) => p.nik === null)
    if (tanpaNik) {
      const [b] = await uji.sqlMigrasi`select nik_sandi, nik_indeks from penduduk where id = ${tanpaNik.id}`
      expect(b).toMatchObject({ nik_sandi: null, nik_indeks: null })
    }
  })

  it('indeks NIK dan nomor KK unik per desa dan cocok dengan penyandi', async () => {
    const gandaNik = await uji.sqlMigrasi`select desa_id, nik_indeks from penduduk where nik_indeks is not null group by 1, 2 having count(*) > 1`
    expect(gandaNik).toHaveLength(0)
    const gandaKk = await uji.sqlMigrasi`select desa_id, nomor_kk_indeks from keluarga group by 1, 2 having count(*) > 1`
    expect(gandaKk).toHaveLength(0)
    const p = dunia.penduduk.find((x) => x.nik) as NonNullable<DbDemo['penduduk'][number]>
    const [b] = await uji.sqlMigrasi`select nik_indeks from penduduk where id = ${p.id}`
    expect(b.nik_indeks).toBe(penyandi.indeks(p.nik as string, `penduduk.nik:${p.desaId}`))
    const k = dunia.keluarga[0]
    const [bk] = await uji.sqlMigrasi`select nomor_kk_indeks from keluarga where id = ${k.id}`
    expect(bk.nomor_kk_indeks).toBe(penyandi.indeks(k.nomorKk, `keluarga.nomorKk:${k.desaId}`))
  })

  it('setiap pengguna demo dapat masuk dengan KATA_SANDI_DEMO dan hash-nya argon2id', async () => {
    const baris = await uji.sqlMigrasi`select id, kata_sandi_hash from pengguna`
    expect(baris).toHaveLength(dunia.pengguna.length)
    for (const b of baris) {
      expect(b.kata_sandi_hash, b.id).toMatch(/^\$argon2id\$/)
      expect(await periksaKataSandi(b.kata_sandi_hash, KATA_SANDI_DEMO), b.id).toBe(true)
    }
    expect(await periksaKataSandi(baris[0].kata_sandi_hash, 'bukan-kata-sandinya')).toBe(false)
  })

  it('semai menolak lingkungan produksi dan staging tanpa bendera eksplisit, dan tidak menulis apa pun', async () => {
    const sebelum = await hitung('penduduk')
    for (const lingkungan of ['produksi', 'staging'] as const) {
      await expect(semaiDunia(uji.sqlMigrasi, penyandi, SEKARANG_UJI, { lingkungan, dunia })).rejects.toThrow(GalatSemai)
    }
    expect(await hitung('penduduk')).toBe(sebelum)
    await expect(semaiDunia(uji.sqlMigrasi, penyandi, SEKARANG_UJI, { lingkungan: 'staging', izinkanLingkunganNyata: true, dunia })).resolves.toBeTruthy()
  })

  it('semai idempoten: kedua kali tidak menggandakan dan tidak menyandikan ulang', async () => {
    const contoh = dunia.penduduk.find((p) => p.nik) as NonNullable<DbDemo['penduduk'][number]>
    const [sebelum] = await uji.sqlMigrasi`select nik_sandi from penduduk where id = ${contoh.id}`
    const hitungan = [await hitung('desa'), await hitung('dusun'), await hitung('pengguna'), await hitung('keluarga'), await hitung('penduduk')]
    const ringkasan = await semaiDunia(uji.sqlMigrasi, penyandi, SEKARANG_UJI, opsiUji())
    const lagi = await semaiDunia(uji.sqlMigrasi, penyandi, SEKARANG_UJI, opsiUji())
    expect(lagi).toEqual(ringkasan)
    expect([await hitung('desa'), await hitung('dusun'), await hitung('pengguna'), await hitung('keluarga'), await hitung('penduduk')]).toEqual(hitungan)
    const [sesudah] = await uji.sqlMigrasi`select nik_sandi from penduduk where id = ${contoh.id}`
    expect(sesudah.nik_sandi).toBe(sebelum.nik_sandi)
  })

  it('ringkasan hanya berisi angka, tanpa data pribadi', async () => {
    const ringkasan = await semaiDunia(uji.sqlMigrasi, penyandi, SEKARANG_UJI, opsiUji())
    expect(Object.values(ringkasan).every((n) => typeof n === 'number')).toBe(true)
    expect(JSON.stringify(ringkasan)).not.toMatch(/\d{9,}/)
  })

  it('kunci data aktif disisipkan sekali dan dapat dibuka kembali', async () => {
    const sebelum = await pastikanKunciData(uji.sqlMigrasi, KUNCI_UTAMA_UJI, KID_UJI)
    const sesudah = await pastikanKunciData(uji.sqlMigrasi, KUNCI_UTAMA_UJI, KID_UJI)
    expect(sesudah).toEqual(sebelum)
    expect(sebelum.map((b) => b.kid)).toContain(KID_UJI)
    expect(await hitung('kunci_data')).toBe(sebelum.length)
  })
})

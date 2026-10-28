import { riwayatAksesSchema } from '@sinfodes/kontrak/pengaturan/akses-sinfodes'
import { sql as dsql } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { buatDbUji, type DbUji } from '../../test/basisdata'
import { sisipkanDesaContoh } from '../../test/data-contoh'
import { sisipAksesUji, sisipSesiBantuanUji, sisipTiketUji } from '../../test/rakit-app'
import type { Db } from '../basisdata/klien'
import { hashToken } from '../kripto/token'
import {
  aksesBerlaku, aksesBerlakuDesa, beriAkses, cabutAksesBerlaku, cabutSesiBantuan, cariSesiBantuanMenurutHash, catatJejakBantuan,
  geserAktifBantuan, klaimTiket, riwayatAkses, samarkanJalur, sesiBantuanBerlaku, simpanSesiBantuan, simpanTiket,
} from './repositori-bantuan'

let uji: DbUji
beforeAll(async () => {
  uji = await buatDbUji()
  await sisipkanDesaContoh(uji.sqlMigrasi, 'desa_a', 1)
  await sisipkanDesaContoh(uji.sqlMigrasi, 'desa_b', 1)
})
afterAll(async () => {
  await uji?.tutup()
})
beforeEach(async () => {
  await uji.sqlMigrasi`delete from jejak_bantuan`
  await uji.sqlMigrasi`delete from sesi_bantuan`
  await uji.sqlMigrasi`delete from tiket_bantuan`
  await uji.sqlMigrasi`delete from akses_bantuan`
})

const JAM = 3600_000
const MENIT = 60_000
const T0 = new Date('2026-10-28T03:00:00Z')
const lewat = (ms: number): Date => new Date(T0.getTime() + ms)
const dalamDesa = <T>(desaId: string, fn: (db: Db) => Promise<T>): Promise<T> => uji.klien.dalamTransaksi('desa', { desaId }, fn)
const parameter = (id: string, lamaJam: 2 | 24 | 72 = 24) =>
  ({ id, desaId: 'desa_a', diberiOlehId: 'pgn_1', diberiOlehNama: 'Sekretaris Uji', lamaJam, sembunyikanDataPribadi: true, sekarang: T0 }) as const
const berlakuDesaA = async (): Promise<number> =>
  (await uji.sqlMigrasi`select count(*)::int as n from akses_bantuan where desa_id = 'desa_a' and dicabut is null and sampai > ${T0}`)[0].n as number

describe('beriAkses dan cabutAksesBerlaku', () => {
  it('mengisi sampai = mulai + lama dan menutup akses yang masih berlaku, bukan yang sudah habis', async () => {
    const habis = await sisipAksesUji(uji.sqlMigrasi, { desaId: 'desa_a', mulai: lewat(-25 * JAM), lamaJam: 24 })
    const berlaku = await sisipAksesUji(uji.sqlMigrasi, { desaId: 'desa_a', mulai: lewat(-1 * JAM), lamaJam: 24 })
    const baru = await dalamDesa('desa_a', (db) => beriAkses(db, parameter('aks_baru', 2)))
    expect(baru.sampai).toEqual(lewat(2 * JAM))
    expect(baru.mulai).toEqual(T0)
    expect(baru.dicabut).toBeNull()
    expect(baru.diberiOlehNama).toBe('Sekretaris Uji')
    const baris = await uji.sqlMigrasi`select id, dicabut from akses_bantuan where desa_id = 'desa_a'`
    const dicabut = (id: string) => baris.find((b) => b.id === id)?.dicabut as Date | null
    expect(dicabut(habis.id)).toBeNull()
    expect(dicabut(berlaku.id)).toEqual(T0)
    expect(dicabut('aks_baru')).toBeNull()
  })

  it('menunggu kunci penasihat desa yang sama: satu akses berlaku per desa', async () => {
    let lepas!: () => void
    const tahan = new Promise<void>((r) => (lepas = r))
    let terpasang!: () => void
    const siap = new Promise<void>((r) => (terpasang = r))
    const pemegang = uji.klien.dalamTransaksi('desa', { desaId: 'desa_a' }, async (db) => {
      await db.execute(dsql`select pg_advisory_xact_lock(hashtextextended('desa_a', 0))`)
      terpasang()
      await tahan
    })
    await siap
    let selesai = false
    const menunggu = dalamDesa('desa_a', (db) => beriAkses(db, parameter('aks_menunggu'))).then(() => {
      selesai = true
    })
    await new Promise((r) => setTimeout(r, 300))
    expect(selesai).toBe(false)
    lepas()
    await pemegang
    await menunggu
    expect(selesai).toBe(true)
  })

  it('dua pemberian serentak menyisakan tepat satu akses berlaku', async () => {
    await Promise.all([
      dalamDesa('desa_a', (db) => beriAkses(db, parameter('aks_s1'))),
      dalamDesa('desa_a', (db) => beriAkses(db, parameter('aks_s2', 72))),
    ])
    expect(await berlakuDesaA()).toBe(1)
    expect((await uji.sqlMigrasi`select count(*)::int as n from akses_bantuan where desa_id = 'desa_a'`)[0].n).toBe(2)
  })

  it('cabutAksesBerlaku mengembalikan akses yang dicabut, null bila tak ada, dan tidak menyentuh desa lain', async () => {
    const a = await sisipAksesUji(uji.sqlMigrasi, { desaId: 'desa_a', mulai: lewat(-1 * JAM) })
    const b = await sisipAksesUji(uji.sqlMigrasi, { desaId: 'desa_b', mulai: lewat(-1 * JAM) })
    const hasil = await dalamDesa('desa_a', (db) => cabutAksesBerlaku(db, 'desa_a', T0))
    expect(hasil?.id).toBe(a.id)
    expect(hasil?.dicabut).toEqual(T0)
    expect(await dalamDesa('desa_a', (db) => cabutAksesBerlaku(db, 'desa_a', T0))).toBeNull()
    const sisa = await uji.sqlMigrasi`select dicabut from akses_bantuan where id = ${b.id}`
    expect(sisa[0].dicabut).toBeNull()
  })
})

describe('aksesBerlakuDesa', () => {
  it('menemukan akses yang berlaku (juga lewat peran konsol), bukan yang dicabut atau habis', async () => {
    await sisipAksesUji(uji.sqlMigrasi, { desaId: 'desa_a', mulai: lewat(-30 * JAM), lamaJam: 24 })
    await sisipAksesUji(uji.sqlMigrasi, { desaId: 'desa_a', mulai: lewat(-1 * JAM), dicabut: lewat(-30 * MENIT) })
    expect(await dalamDesa('desa_a', (db) => aksesBerlakuDesa(db, 'desa_a', T0))).toBeNull()
    const ada = await sisipAksesUji(uji.sqlMigrasi, { desaId: 'desa_a', mulai: lewat(-1 * JAM), sembunyikan: false })
    const desa = await dalamDesa('desa_a', (db) => aksesBerlakuDesa(db, 'desa_a', T0))
    expect(desa?.id).toBe(ada.id)
    expect(desa?.sembunyikanDataPribadi).toBe(false)
    const konsol = await uji.klien.dalamTransaksi('konsol', {}, (db) => aksesBerlakuDesa(db, 'desa_a', T0))
    expect(konsol?.id).toBe(ada.id)
    expect(await uji.klien.dalamTransaksi('konsol', {}, (db) => aksesBerlakuDesa(db, 'desa_b', T0))).toBeNull()
  })

  it('aksesBerlaku: dicabut atau lewat sampai berarti tidak berlaku', () => {
    expect(aksesBerlaku({ sampai: lewat(MENIT), dicabut: null }, T0)).toBe(true)
    expect(aksesBerlaku({ sampai: T0, dicabut: null }, T0)).toBe(false)
    expect(aksesBerlaku({ sampai: lewat(MENIT), dicabut: T0 }, T0)).toBe(false)
  })
})

describe('tiket: simpan dan klaim', () => {
  const siapkan = async (opsi: { dicabut?: Date; mulai?: Date; lamaJam?: number } = {}) => {
    const akses = await sisipAksesUji(uji.sqlMigrasi, { desaId: 'desa_a', mulai: opsi.mulai ?? lewat(-1 * JAM), lamaJam: opsi.lamaJam, dicabut: opsi.dicabut ?? null })
    const tiket = await sisipTiketUji(uji.sqlMigrasi, { desaId: 'desa_a', aksesId: akses.id, mulai: T0, olehId: 'kon_1', olehNama: 'Dina' })
    return { akses, tiket: tiket.tiket }
  }
  const klaim = (desaId: string, token: string, sekarang: Date) => dalamDesa(desaId, (db) => klaimTiket(db, hashToken(token), sekarang))

  it('klaim pertama berhasil dengan identitas penerbit, klaim kedua null', async () => {
    const { akses, tiket } = await siapkan()
    expect(await klaim('desa_a', tiket, lewat(30_000))).toEqual({ aksesId: akses.id, olehId: 'kon_1', olehNama: 'Dina' })
    expect(await klaim('desa_a', tiket, lewat(31_000))).toBeNull()
  })

  it('tiket lewat 60 detik, akses dicabut, atau akses habis: null dan tiket tetap belum terpakai', async () => {
    const { tiket } = await siapkan()
    expect(await klaim('desa_a', tiket, lewat(61_000))).toBeNull()
    const dicabut = await siapkan({ dicabut: lewat(-1 * MENIT) })
    expect(await klaim('desa_a', dicabut.tiket, lewat(10_000))).toBeNull()
    const habis = await siapkan({ mulai: lewat(-30 * JAM), lamaJam: 24 })
    expect(await klaim('desa_a', habis.tiket, lewat(10_000))).toBeNull()
    expect((await uji.sqlMigrasi`select count(*)::int as n from tiket_bantuan where dipakai is not null`)[0].n).toBe(0)
  })

  it('konteks desa lain tidak bisa mengklaim, dan tiketnya tidak hangus karenanya', async () => {
    const { tiket } = await siapkan()
    expect(await klaim('desa_b', tiket, lewat(10_000))).toBeNull()
    expect(await klaim('desa_a', tiket, lewat(11_000))).not.toBeNull()
  })

  it('dua klaim serentak: tepat satu menang', async () => {
    const { tiket } = await siapkan()
    const hasil = await Promise.all([klaim('desa_a', tiket, lewat(10_000)), klaim('desa_a', tiket, lewat(10_000))])
    expect(hasil.filter((h) => h !== null)).toHaveLength(1)
  })

  it('simpanTiket menyimpan hash (bukan token) dengan masa berlaku sesuai umur', async () => {
    const akses = await sisipAksesUji(uji.sqlMigrasi, { desaId: 'desa_a', mulai: lewat(-1 * JAM) })
    await uji.klien.dalamTransaksi('konsol', {}, (db) =>
      simpanTiket(db, { id: 'tkt_baru', desaId: 'desa_a', aksesId: akses.id, tokenHash: 'hash-uji', olehId: 'kon_1', olehNama: 'Dina', sekarang: T0, umurMs: 60_000 }),
    )
    const [b] = await uji.sqlMigrasi`select token_hash, berlaku_sampai, dipakai from tiket_bantuan where id = 'tkt_baru'`
    expect(b.token_hash).toBe('hash-uji')
    expect(b.berlaku_sampai).toEqual(lewat(60_000))
    expect(b.dipakai).toBeNull()
  })
})

describe('sesi bantuan', () => {
  const siapkan = async (opsi: { dibuat?: Date; terakhirAktif?: Date; aksesDicabut?: Date; aksesMulai?: Date; aksesLamaJam?: number } = {}) => {
    const akses = await sisipAksesUji(uji.sqlMigrasi, { desaId: 'desa_a', mulai: opsi.aksesMulai ?? lewat(-1 * JAM), lamaJam: opsi.aksesLamaJam, dicabut: opsi.aksesDicabut ?? null })
    const sesi = await sisipSesiBantuanUji(uji.sqlMigrasi, { desaId: 'desa_a', aksesId: akses.id, dibuat: opsi.dibuat ?? lewat(-10 * MENIT), terakhirAktif: opsi.terakhirAktif })
    const temu = await dalamDesa('desa_a', (db) => cariSesiBantuanMenurutHash(db, hashToken(sesi.token)))
    if (!temu) throw new Error('sesi uji tidak ditemukan')
    return { akses, sesi, temu }
  }

  it('ditemukan lewat hash di desanya dan tidak di desa lain atau dengan hash ngawur', async () => {
    const { sesi, temu } = await siapkan()
    expect(temu.sesi.id).toBe(sesi.id)
    expect(temu.akses.desaId).toBe('desa_a')
    expect(await dalamDesa('desa_b', (db) => cariSesiBantuanMenurutHash(db, hashToken(sesi.token)))).toBeNull()
    expect(await dalamDesa('desa_a', (db) => cariSesiBantuanMenurutHash(db, 'hash-ngawur'))).toBeNull()
  })

  it('sesiBantuanBerlaku: sah, lalu mati karena dicabut, menganggur 30 menit, lewat 8 jam, akses dicabut, akses habis, atau desa beda', async () => {
    const sah = await siapkan({ terakhirAktif: lewat(-29 * MENIT) })
    expect(sesiBantuanBerlaku(sah.temu, 'desa_a', T0)).toBe(true)
    expect(sesiBantuanBerlaku(sah.temu, 'desa_b', T0)).toBe(false)
    const menganggur = await siapkan({ terakhirAktif: lewat(-30 * MENIT) })
    expect(sesiBantuanBerlaku(menganggur.temu, 'desa_a', T0)).toBe(false)
    const lama = await siapkan({ dibuat: lewat(-8 * JAM - 1000), terakhirAktif: lewat(-1 * MENIT), aksesMulai: lewat(-9 * JAM), aksesLamaJam: 72 })
    expect(sesiBantuanBerlaku(lama.temu, 'desa_a', T0)).toBe(false)
    const aksesMati = await siapkan({ aksesDicabut: lewat(-1 * MENIT) })
    expect(sesiBantuanBerlaku(aksesMati.temu, 'desa_a', T0)).toBe(false)
    const aksesHabis = await siapkan({ aksesMulai: lewat(-3 * JAM), aksesLamaJam: 2 })
    expect(sesiBantuanBerlaku(aksesHabis.temu, 'desa_a', T0)).toBe(false)
    const dicabut = await siapkan()
    await dalamDesa('desa_a', (db) => cabutSesiBantuan(db, dicabut.sesi.id, T0))
    const lagi = await dalamDesa('desa_a', (db) => cariSesiBantuanMenurutHash(db, hashToken(dicabut.sesi.token)))
    expect(sesiBantuanBerlaku(lagi!, 'desa_a', T0)).toBe(false)
  })

  it('geserAktifBantuan memperbarui terakhir_aktif dan simpanSesiBantuan menyimpan hash', async () => {
    const { sesi } = await siapkan()
    await dalamDesa('desa_a', (db) => geserAktifBantuan(db, sesi.id, T0))
    expect((await uji.sqlMigrasi`select terakhir_aktif from sesi_bantuan where id = ${sesi.id}`)[0].terakhir_aktif).toEqual(T0)
    const akses = await sisipAksesUji(uji.sqlMigrasi, { desaId: 'desa_a', mulai: lewat(-1 * JAM) })
    await dalamDesa('desa_a', (db) =>
      simpanSesiBantuan(db, { id: 'sbt_baru', desaId: 'desa_a', aksesId: akses.id, tokenHash: 'hash-sesi', olehId: 'kon_1', olehNama: 'Dina', sekarang: T0 }),
    )
    const [b] = await uji.sqlMigrasi`select token_hash, dibuat, terakhir_aktif, dicabut from sesi_bantuan where id = 'sbt_baru'`
    expect(b.token_hash).toBe('hash-sesi')
    expect(b.dibuat).toEqual(T0)
    expect(b.dicabut).toBeNull()
  })
})

describe('jejak bantuan', () => {
  it('samarkanJalur: query biasa utuh, deretan enam angka atau lebih jadi ***, dipotong 300 karakter', () => {
    expect(samarkanJalur('/penduduk?halaman=2')).toBe('/penduduk?halaman=2')
    expect(samarkanJalur('/penduduk?x=12345')).toBe('/penduduk?x=12345')
    expect(samarkanJalur('/penduduk?kata=1405095203918002')).toBe('/penduduk?kata=***')
    expect(samarkanJalur('/penduduk/123456/riwayat')).toBe('/penduduk/***/riwayat')
    expect(samarkanJalur(`/${'a'.repeat(400)}`)).toHaveLength(300)
  })

  it('catatJejakBantuan menyimpan jalur yang sudah tersamar dengan urutan naik', async () => {
    const akses = await sisipAksesUji(uji.sqlMigrasi, { desaId: 'desa_a', mulai: lewat(-1 * JAM) })
    const sesi = await sisipSesiBantuanUji(uji.sqlMigrasi, { desaId: 'desa_a', aksesId: akses.id, dibuat: lewat(-10 * MENIT) })
    await dalamDesa('desa_a', async (db) => {
      await catatJejakBantuan(db, { desaId: 'desa_a', sesiId: sesi.id, jalur: '/penduduk?kata=1405095203918002', waktu: T0 })
      await catatJejakBantuan(db, { desaId: 'desa_a', sesiId: sesi.id, jalur: '/penduduk/ringkasan', waktu: T0 })
    })
    const baris = await uji.sqlMigrasi`select urut, jalur from jejak_bantuan order by urut`
    expect(baris.map((b) => b.jalur)).toEqual(['/penduduk?kata=***', '/penduduk/ringkasan'])
    expect(Number(baris[1].urut)).toBeGreaterThan(Number(baris[0].urut))
  })
})

describe('riwayatAkses', () => {
  it('terbaru dulu, lolos skema kontrak, berakhir habis, dicabut, atau null, dan desa lain tidak terlihat', async () => {
    const habis = await sisipAksesUji(uji.sqlMigrasi, { desaId: 'desa_a', mulai: lewat(-50 * JAM), lamaJam: 24, diberiOlehNama: 'Pemberi Lama' })
    const dicabut = await sisipAksesUji(uji.sqlMigrasi, { desaId: 'desa_a', mulai: lewat(-5 * JAM), dicabut: lewat(-4 * JAM) })
    const aktif = await sisipAksesUji(uji.sqlMigrasi, { desaId: 'desa_a', mulai: lewat(-1 * JAM), diberiOlehNama: 'Sekretaris Uji' })
    await sisipAksesUji(uji.sqlMigrasi, { desaId: 'desa_b', mulai: lewat(-1 * JAM) })
    const sesi = await sisipSesiBantuanUji(uji.sqlMigrasi, { desaId: 'desa_a', aksesId: aktif.id, dibuat: lewat(-30 * MENIT), olehNama: 'Dina' })
    for (const [i, jalur] of ['/penduduk', '/penduduk/ringkasan'].entries()) {
      await uji.sqlMigrasi`insert into jejak_bantuan (desa_id, sesi_id, jalur, waktu) values ('desa_a', ${sesi.id}, ${jalur}, ${lewat((-20 + i) * MENIT)})`
    }
    const riwayat = await dalamDesa('desa_a', (db) => riwayatAkses(db, 'desa_a', T0))
    expect(riwayatAksesSchema.array().parse(riwayat)).toHaveLength(3)
    expect(riwayat.map((r) => r.id)).toEqual([aktif.id, dicabut.id, habis.id])
    expect(riwayat.map((r) => r.berakhir)).toEqual([null, 'dicabut', 'habis'])
    expect(riwayat[0].diberiOleh).toBe('Sekretaris Uji')
    expect(riwayat[0].sesi).toHaveLength(1)
    expect(riwayat[0].sesi[0].oleh).toBe('Dina')
    expect(riwayat[0].sesi[0].halaman.map((h) => h.jalur)).toEqual(['/penduduk', '/penduduk/ringkasan'])
    expect(await dalamDesa('desa_b', (db) => riwayatAkses(db, 'desa_a', T0))).toEqual([])
  })

  it('paling banyak 20 akses terbaru dan 300 halaman terbaru per sesi (urutan waktu naik)', async () => {
    for (let i = 0; i < 25; i++) await sisipAksesUji(uji.sqlMigrasi, { desaId: 'desa_a', mulai: lewat((-100 + i) * JAM), lamaJam: 2 })
    const aktif = await sisipAksesUji(uji.sqlMigrasi, { desaId: 'desa_a', mulai: lewat(-1 * JAM) })
    const sesi = await sisipSesiBantuanUji(uji.sqlMigrasi, { desaId: 'desa_a', aksesId: aktif.id, dibuat: lewat(-50 * MENIT) })
    await uji.sqlMigrasi`insert into jejak_bantuan (desa_id, sesi_id, jalur, waktu)
      select 'desa_a', ${sesi.id}, '/penduduk?halaman=' || g, ${lewat(-40 * MENIT)}::timestamptz + (g || ' seconds')::interval from generate_series(1, 305) g`
    const riwayat = await dalamDesa('desa_a', (db) => riwayatAkses(db, 'desa_a', T0))
    expect(riwayat).toHaveLength(20)
    expect(riwayat[0].id).toBe(aktif.id)
    const halaman = riwayat[0].sesi[0].halaman
    expect(halaman).toHaveLength(300)
    expect(halaman[0].jalur).toBe('/penduduk?halaman=6')
    expect(halaman[299].jalur).toBe('/penduduk?halaman=305')
  })
})

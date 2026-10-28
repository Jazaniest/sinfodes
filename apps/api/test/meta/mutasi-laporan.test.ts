import { sql as dsql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { GOLONGAN_TABEL } from '../../src/penggolongan'
import { buatDbUji, type DbUji } from '../basisdata'
import { sisipkanDesaContoh } from '../data-contoh'

let uji: DbUji
beforeAll(async () => {
  uji = await buatDbUji()
  for (const desa of ['desa_a', 'desa_b']) {
    await sisipkanDesaContoh(uji.sqlMigrasi, desa, 2)
    await uji.sqlMigrasi`insert into mutasi (id, desa_id, jenis, tanggal, dicatat_oleh_id, dicatat_oleh_nama, dicatat_pada, rincian)
      values (${`mts_${desa}`}, ${desa}, 'datang', '2026-09-01', 'pgn_x', 'Operator', now(), ${uji.sqlMigrasi.json({ nomorSkpwni: '123' })})`
    await uji.sqlMigrasi`insert into mutasi_penduduk (mutasi_id, penduduk_id, desa_id, urutan) values (${`mts_${desa}`}, ${`pdk_${desa}_1`}, ${desa}, 0)`
    await sisipLaporan(`lap_${desa}`, desa, { isi: { jenis: 'perbaikan', pendudukId: `pdk_${desa}_1`, field: 'pekerjaan', nilaiBaru: 'Pedagang', catatan: null } })
  }
})
afterAll(async () => {
  await uji?.tutup()
})

type Isi = Record<string, unknown>
async function sisipLaporan(id: string, desaId: string, o: { isi: Isi; status?: string; ditangani?: boolean; tanggalDitangani?: boolean; oleh?: boolean; lampiran?: string }): Promise<void> {
  const ditangani = o.ditangani ?? false
  await uji.sqlMigrasi`insert into laporan_data (id, desa_id, dusun_id, dibuat_pada, pelapor_penduduk_id, pelapor_nama, status,
      ditangani_oleh_id, ditangani_oleh_nama, ditangani_pada, ditangani_alasan, lampiran_berkas, lampiran_ukuran_kb, isi)
    values (${id}, ${desaId}, ${`dsn_${desaId}`}, now(), ${`pdk_${desaId}_2`}, 'Pelapor', ${o.status ?? 'baru'},
      ${ditangani || o.oleh ? 'pgn_x' : null}, ${ditangani || o.oleh ? 'Operator' : null}, ${ditangani || o.tanggalDitangani ? new Date() : null}, null,
      ${o.lampiran ?? null}, ${o.lampiran === undefined ? null : 12}, ${uji.sqlMigrasi.json(o.isi as never)})`
}

const kodePg = (e: unknown): string | undefined => {
  for (let x = e as { code?: string; cause?: unknown } | undefined; x; x = x.cause as typeof x) if (x.code) return x.code
  return undefined
}
const galatDari = async (p: Promise<unknown>): Promise<unknown> => {
  try {
    await p
    return null
  } catch (e) {
    return e
  }
}
const jalankan = (peran: 'desa' | 'kabupaten' | 'konsol' | 'publik', desaId: string | undefined, perintah: string) =>
  galatDari(uji.klien.dalamTransaksi(peran, { desaId }, (db) => db.execute(dsql.raw(perintah))))
const hitung = (desaId: string | undefined, tabel: string) =>
  uji.klien.dalamTransaksi('desa', { desaId }, async (db) => Number((await db.execute<{ n: number }>(dsql.raw(`select count(*)::int as n from ${tabel}`)))[0].n))
const punyaHak = async (peran: string, tabel: string, hak: string) =>
  (await uji.sqlMigrasi`select has_table_privilege(${peran}, ${tabel}, ${hak}) as ada`)[0].ada as boolean
const punyaHakKolom = async (peran: string, tabel: string, kolom: string) =>
  (await uji.sqlMigrasi`select has_column_privilege(${peran}, ${tabel}, ${kolom}, 'UPDATE') as ada`)[0].ada as boolean
const ubahDesa = (desaId: string, perintah: string) => uji.klien.dalamTransaksi('desa', { desaId }, async (db) => (await db.execute(dsql.raw(perintah))).count)

const TABEL = ['mutasi', 'mutasi_penduduk', 'laporan_data'] as const
const KOLOM_PENANGANAN = ['status', 'ditangani_oleh_id', 'ditangani_oleh_nama', 'ditangani_pada', 'ditangani_alasan']

describe('mutasi dan laporan data (rencana 8E2 Ruling 2 dan 3)', () => {
  it('ketiga tabel digolongkan desa-privat', () => {
    for (const tabel of TABEL) expect(GOLONGAN_TABEL[tabel], tabel).toBe('desa-privat')
  })

  it('mutasi dan mutasi_penduduk: desa hanya SELECT dan INSERT', async () => {
    for (const tabel of ['mutasi', 'mutasi_penduduk']) {
      expect(await punyaHak('sinfodes_desa', tabel, 'SELECT'), `SELECT ${tabel}`).toBe(true)
      expect(await punyaHak('sinfodes_desa', tabel, 'INSERT'), `INSERT ${tabel}`).toBe(true)
      expect(await punyaHak('sinfodes_desa', tabel, 'UPDATE'), `UPDATE ${tabel}`).toBe(false)
      expect(await punyaHak('sinfodes_desa', tabel, 'DELETE'), `DELETE ${tabel}`).toBe(false)
    }
  })

  it('laporan_data: desa SELECT dan UPDATE hanya pada lima kolom penanganan; tanpa INSERT dan DELETE', async () => {
    expect(await punyaHak('sinfodes_desa', 'laporan_data', 'SELECT')).toBe(true)
    expect(await punyaHak('sinfodes_desa', 'laporan_data', 'INSERT')).toBe(false)
    expect(await punyaHak('sinfodes_desa', 'laporan_data', 'DELETE')).toBe(false)
    const kolom = (await uji.sqlMigrasi`select column_name from information_schema.columns where table_schema = 'public' and table_name = 'laporan_data'`).map((b) => b.column_name as string)
    for (const k of kolom) expect(await punyaHakKolom('sinfodes_desa', 'laporan_data', k), k).toBe(KOLOM_PENANGANAN.includes(k))
  })

  it('peran lain tanpa hak apa pun pada ketiga tabel', async () => {
    for (const tabel of TABEL) {
      for (const peran of ['sinfodes_kabupaten', 'sinfodes_konsol', 'sinfodes_publik']) {
        for (const hak of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) expect(await punyaHak(peran, tabel, hak), `${peran} ${hak} ${tabel}`).toBe(false)
      }
    }
  })

  it('tanpa konteks nol baris, dengan konteks hanya baris desanya', async () => {
    for (const tabel of TABEL) {
      expect(await hitung(undefined, tabel), `${tabel} tanpa konteks`).toBe(0)
      expect(await hitung('desa_a', tabel), `${tabel} desa_a`).toBe(1)
      expect(await hitung('desa_b', tabel), `${tabel} desa_b`).toBe(1)
      expect(await hitung('desa_lain', tabel), `${tabel} desa lain`).toBe(0)
    }
  })

  it('desa A tidak bisa menyisipkan baris desa B; UPDATE dan DELETE mutasi ditolak', async () => {
    expect(kodePg(await jalankan('desa', 'desa_a', `insert into mutasi (id, desa_id, jenis, tanggal, dicatat_oleh_id, dicatat_oleh_nama, dicatat_pada, rincian) values ('mts_x', 'desa_b', 'datang', '2026-09-01', 'p', 'P', now(), '{}'::jsonb)`))).toBe('42501')
    expect(kodePg(await jalankan('desa', 'desa_a', `insert into mutasi_penduduk (mutasi_id, penduduk_id, desa_id, urutan) values ('mts_desa_b', 'pdk_desa_b_2', 'desa_b', 1)`))).toBe('42501')
    for (const perintah of [`update mutasi set tanggal = '2026-01-01'`, 'delete from mutasi', 'update mutasi_penduduk set urutan = 5', 'delete from mutasi_penduduk']) {
      expect(kodePg(await jalankan('desa', 'desa_a', perintah)), perintah).toBe('42501')
    }
    expect(await jalankan('desa', 'desa_a', `insert into mutasi (id, desa_id, jenis, tanggal, dicatat_oleh_id, dicatat_oleh_nama, dicatat_pada, rincian) values ('mts_a2', 'desa_a', 'lahir', '2026-09-01', 'p', 'P', now(), '{}'::jsonb)`)).toBeNull()
    await uji.sqlMigrasi`delete from mutasi where id = 'mts_a2'`
  })

  it('desa mengubah status laporan desanya sendiri saja, bukan isi dan bukan baris desa lain', async () => {
    expect(await ubahDesa('desa_a', `update laporan_data set status = 'ditolak', ditangani_oleh_id = 'p', ditangani_oleh_nama = 'P', ditangani_pada = now() where id = 'lap_desa_a'`)).toBe(1)
    expect(await ubahDesa('desa_a', `update laporan_data set status = 'ditolak', ditangani_oleh_id = 'p', ditangani_oleh_nama = 'P', ditangani_pada = now() where id = 'lap_desa_b'`)).toBe(0)
    await uji.sqlMigrasi`update laporan_data set status = 'baru', ditangani_oleh_id = null, ditangani_oleh_nama = null, ditangani_pada = null where id = 'lap_desa_a'`
    for (const kolom of ['isi', 'dibuat_pada', 'desa_id', 'dusun_id', 'pelapor_nama']) {
      expect(kodePg(await jalankan('desa', 'desa_a', `update laporan_data set ${kolom} = ${kolom}`)), kolom).toBe('42501')
    }
    expect(kodePg(await jalankan('desa', 'desa_a', 'delete from laporan_data'))).toBe('42501')
    expect(kodePg(await jalankan('desa', 'desa_a', `insert into laporan_data (id, desa_id, dusun_id, dibuat_pada, pelapor_penduduk_id, pelapor_nama, status, isi) values ('lap_x', 'desa_a', 'dsn_desa_a', now(), 'pdk_desa_a_2', 'P', 'baru', '{"jenis":"kelahiran"}'::jsonb)`))).toBe('42501')
  })

  it('CHECK mutasi: jenis dikenal dan rincian berupa objek', async () => {
    const sisip = (id: string, jenis: string, rincian: string) =>
      galatDari(uji.sqlMigrasi.unsafe(`insert into mutasi (id, desa_id, jenis, tanggal, dicatat_oleh_id, dicatat_oleh_nama, dicatat_pada, rincian) values ('${id}', 'desa_a', '${jenis}', '2026-09-01', 'p', 'P', now(), '${rincian}'::jsonb)`))
    expect(kodePg(await sisip('mts_c1', 'tidakada', '{}'))).toBe('23514')
    expect(kodePg(await sisip('mts_c2', 'lahir', '[]'))).toBe('23514')
    for (const jenis of ['lahir', 'meninggal', 'pindah', 'datang']) expect(await sisip(`mts_ok_${jenis}`, jenis, '{}'), jenis).toBeNull()
    await uji.sqlMigrasi`delete from mutasi where id like 'mts_ok_%'`
  })

  it('CHECK laporan: status dan penanganan konsisten, lampiran utuh atau kosong, jenis isi dikenal', async () => {
    const perbaikan: Isi = { jenis: 'perbaikan', pendudukId: 'pdk_desa_a_1', field: 'pekerjaan', nilaiBaru: 'Pedagang', catatan: null }
    expect(kodePg(await galatDari(sisipLaporan('lap_c1', 'desa_a', { isi: perbaikan, status: 'baru', tanggalDitangani: true, oleh: true })))).toBe('23514')
    expect(kodePg(await galatDari(sisipLaporan('lap_c2', 'desa_a', { isi: perbaikan, status: 'diterapkan' })))).toBe('23514')
    expect(kodePg(await galatDari(sisipLaporan('lap_c3', 'desa_a', { isi: perbaikan, status: 'diterapkan', tanggalDitangani: true })))).toBe('23514')
    expect(kodePg(await galatDari(sisipLaporan('lap_c4', 'desa_a', { isi: perbaikan, status: 'selesai', ditangani: true })))).toBe('23514')
    expect(kodePg(await galatDari(sisipLaporan('lap_c5', 'desa_a', { isi: { jenis: 'lain' } })))).toBe('23514')
    const separuh = galatDari(uji.sqlMigrasi.unsafe(`insert into laporan_data (id, desa_id, dusun_id, dibuat_pada, pelapor_penduduk_id, pelapor_nama, status, lampiran_berkas, isi)
      values ('lap_c6', 'desa_a', 'dsn_desa_a', now(), 'pdk_desa_a_2', 'P', 'baru', 'akta.jpg', '${JSON.stringify(perbaikan)}'::jsonb)`))
    expect(kodePg(await separuh)).toBe('23514')
    expect(await galatDari(sisipLaporan('lap_ok1', 'desa_a', { isi: perbaikan, status: 'diterapkan', ditangani: true, lampiran: 'akta.jpg' }))).toBeNull()
    await uji.sqlMigrasi`delete from laporan_data where id like 'lap_ok%'`
  })

  it('CHECK sandi: perbaikan telepon atau nik wajib tersandi (SPEC-V0.3 §7.6)', async () => {
    const isi = (field: string, nilaiBaru: string): Isi => ({ jenis: 'perbaikan', pendudukId: 'pdk_desa_a_1', field, nilaiBaru, catatan: null })
    expect(kodePg(await galatDari(sisipLaporan('lap_s1', 'desa_a', { isi: isi('telepon', '081234567890') })))).toBe('23514')
    expect(kodePg(await galatDari(sisipLaporan('lap_s2', 'desa_a', { isi: isi('nik', '1405095203918002') })))).toBe('23514')
    expect(await galatDari(sisipLaporan('lap_s3', 'desa_a', { isi: isi('telepon', 'v1.k1.abc') }))).toBeNull()
    expect(await galatDari(sisipLaporan('lap_s4', 'desa_a', { isi: isi('pekerjaan', 'Pedagang') }))).toBeNull()
    await uji.sqlMigrasi`delete from laporan_data where id like 'lap_s%'`
  })
})

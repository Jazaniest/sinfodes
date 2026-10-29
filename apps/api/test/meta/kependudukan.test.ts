import { JENIS_AKTIVITAS } from '@sinfodes/kontrak/aktivitas/schema'
import { FIELD_RIWAYAT } from '@sinfodes/kontrak/penduduk/riwayat'
import { sql as dsql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { GOLONGAN_TABEL } from '../../src/penggolongan'
import { buatDbUji, type DbUji } from '../basisdata'
import { sisipkanDesaContoh } from '../data-contoh'

let uji: DbUji
beforeAll(async () => {
  uji = await buatDbUji()
  await sisipkanDesaContoh(uji.sqlMigrasi, 'desa_a', 2)
  await sisipkanDesaContoh(uji.sqlMigrasi, 'desa_b', 2)
  for (const desa of ['desa_a', 'desa_b']) {
    await uji.sqlMigrasi`insert into riwayat_penduduk (id, desa_id, penduduk_id, field, nilai_lama, nilai_baru, oleh_id, oleh_nama, waktu)
      values (${`rwy_${desa}`}, ${desa}, ${`pdk_${desa}_1`}, 'pekerjaan', 'Petani', 'Pedagang', 'pgn_x', 'Operator', now())`
    await uji.sqlMigrasi`insert into aktivitas (id, desa_id, dusun_id, waktu, jenis, ringkasan, oleh_id, oleh_nama, rujukan_jenis, rujukan_id)
      values (${`akt_${desa}`}, ${desa}, ${`dsn_${desa}`}, now(), 'penduduk-tambah', 'Penduduk ditambahkan', 'pgn_x', 'Operator', 'penduduk', ${`pdk_${desa}_1`})`
  }
})
afterAll(async () => {
  await uji?.tutup()
})

const TABEL_BARU = ['riwayat_penduduk', 'aktivitas'] as const
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

describe('riwayat penduduk dan aktivitas (rencana 8E1 Ruling 5)', () => {
  it('kedua tabel digolongkan desa-privat dan penduduk punya kolom urutan_kk', async () => {
    for (const tabel of TABEL_BARU) expect(GOLONGAN_TABEL[tabel], tabel).toBe('desa-privat')
    const [k] = await uji.sqlMigrasi`select data_type, is_nullable, column_default from information_schema.columns
      where table_schema = 'public' and table_name = 'penduduk' and column_name = 'urutan_kk'`
    expect(k).toMatchObject({ data_type: 'smallint', is_nullable: 'NO' })
    expect(String(k.column_default)).toBe('0')
  })

  it('peran desa hanya SELECT dan INSERT; peran lain tanpa hak apa pun', async () => {
    for (const tabel of TABEL_BARU) {
      expect(await punyaHak('sinfodes_desa', tabel, 'SELECT'), `desa SELECT ${tabel}`).toBe(true)
      expect(await punyaHak('sinfodes_desa', tabel, 'INSERT'), `desa INSERT ${tabel}`).toBe(true)
      expect(await punyaHak('sinfodes_desa', tabel, 'UPDATE'), `desa UPDATE ${tabel}`).toBe(false)
      expect(await punyaHak('sinfodes_desa', tabel, 'DELETE'), `desa DELETE ${tabel}`).toBe(false)
      for (const peran of ['sinfodes_kabupaten', 'sinfodes_konsol', 'sinfodes_publik']) {
        for (const hak of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) expect(await punyaHak(peran, tabel, hak), `${peran} ${hak} ${tabel}`).toBe(false)
      }
    }
  })

  it('tanpa konteks nol baris, dengan konteks hanya baris desanya', async () => {
    for (const tabel of TABEL_BARU) {
      expect(await hitung(undefined, tabel), `${tabel} tanpa konteks`).toBe(0)
      expect(await hitung('desa_a', tabel), `${tabel} desa_a`).toBe(1)
      expect(await hitung('desa_b', tabel), `${tabel} desa_b`).toBe(1)
      expect(await hitung('desa_lain', tabel), `${tabel} desa lain`).toBe(0)
    }
  })

  it('konteks desa A tidak bisa menyisipkan baris desa B, dan UPDATE serta DELETE ditolak', async () => {
    const riwayatB = `insert into riwayat_penduduk (id, desa_id, penduduk_id, field, oleh_id, oleh_nama, waktu) values ('rwy_x', 'desa_b', 'pdk_desa_b_1', 'nama', 'p', 'P', now())`
    const aktivitasB = `insert into aktivitas (id, desa_id, waktu, jenis, ringkasan) values ('akt_x', 'desa_b', now(), 'penduduk-ubah', 'x')`
    expect(kodePg(await jalankan('desa', 'desa_a', riwayatB))).toBe('42501')
    expect(kodePg(await jalankan('desa', 'desa_a', aktivitasB))).toBe('42501')
    for (const perintah of [`update riwayat_penduduk set field = 'nama'`, 'delete from riwayat_penduduk', `update aktivitas set ringkasan = 'x'`, 'delete from aktivitas']) {
      expect(kodePg(await jalankan('desa', 'desa_a', perintah)), perintah).toBe('42501')
    }
  })

  it('field riwayat dan jenis aktivitas dibatasi ke daftar kontrak', async () => {
    for (const field of FIELD_RIWAYAT) {
      const sisip = `insert into riwayat_penduduk (id, desa_id, penduduk_id, field, oleh_id, oleh_nama, waktu) values ('rwy_${field}', 'desa_a', 'pdk_desa_a_1', '${field}', 'p', 'P', now())`
      expect(await jalankan('desa', 'desa_a', sisip), field).toBeNull()
    }
    const asing = `insert into riwayat_penduduk (id, desa_id, penduduk_id, field, oleh_id, oleh_nama, waktu) values ('rwy_asing', 'desa_a', 'pdk_desa_a_1', 'tidakada', 'p', 'P', now())`
    expect(kodePg(await jalankan('desa', 'desa_a', asing))).toBe('23514')
    for (const jenis of JENIS_AKTIVITAS) {
      expect(await jalankan('desa', 'desa_a', `insert into aktivitas (id, desa_id, waktu, jenis, ringkasan) values ('akt_${jenis}', 'desa_a', now(), '${jenis}', 'x')`), jenis).toBeNull()
    }
    expect(kodePg(await jalankan('desa', 'desa_a', `insert into aktivitas (id, desa_id, waktu, jenis, ringkasan) values ('akt_asing', 'desa_a', now(), 'tidakada', 'x')`))).toBe('23514')
  })

  it('nilai NIK dan telepon di riwayat wajib tersandi (v1.), field lain boleh polos (SPEC-V0.3 §7.6)', async () => {
    const nilai = (v: string | null): string => (v === null ? 'null' : `'${v}'`)
    const sisip = (id: string, field: string, lama: string | null, baru: string | null): string =>
      `insert into riwayat_penduduk (id, desa_id, penduduk_id, field, nilai_lama, nilai_baru, oleh_id, oleh_nama, waktu) values ('${id}', 'desa_a', 'pdk_desa_a_1', '${field}', ${nilai(lama)}, ${nilai(baru)}, 'p', 'P', now())`
    for (const field of ['nik', 'telepon']) {
      expect(kodePg(await jalankan('desa', 'desa_a', sisip(`rwy_p1_${field}`, field, '140509 520391 8002', 'v1.k1.abc'))), field).toBe('23514')
      expect(kodePg(await jalankan('desa', 'desa_a', sisip(`rwy_p2_${field}`, field, 'v1.k1.abc', '081234567890'))), field).toBe('23514')
      expect(await jalankan('desa', 'desa_a', sisip(`rwy_ok_${field}`, field, 'v1.k1.abc', null)), field).toBeNull()
      expect(await jalankan('desa', 'desa_a', sisip(`rwy_nol_${field}`, field, null, null)), field).toBeNull()
    }
    expect(await jalankan('desa', 'desa_a', sisip('rwy_polos_ok', 'pekerjaan', 'Petani/Pekebun', 'Pedagang'))).toBeNull()
  })

  it('pelaku dan rujukan aktivitas utuh atau kosong bersama', async () => {
    const sisip = (kolom: string) => `insert into aktivitas (id, desa_id, waktu, jenis, ringkasan, ${kolom.split('=')[0]}) values ('akt_sebagian', 'desa_a', now(), 'penduduk-ubah', 'x', ${kolom.split('=')[1]})`
    expect(kodePg(await jalankan('desa', 'desa_a', sisip('oleh_id=\'p\'')))).toBe('23514')
    expect(kodePg(await jalankan('desa', 'desa_a', sisip('rujukan_jenis=\'penduduk\'')))).toBe('23514')
  })
})

describe('desa menulis istilah wilayahnya sendiri (rencana 8E1 Ruling 12, migrasi 0006)', () => {
  const ISTILAH = `'{"dusun":"Jorong","rw":"RW","rt":"RT"}'::jsonb`
  const hitungDesaPeran = (peran: 'desa' | 'kabupaten' | 'konsol' | 'publik', desaId?: string) =>
    uji.klien.dalamTransaksi(peran, { desaId }, async (db) => Number((await db.execute<{ n: number }>(dsql.raw('select count(*)::int as n from desa')))[0].n))
  const ubahDesa = (desaId: string | undefined, perintah: string) =>
    uji.klien.dalamTransaksi('desa', { desaId }, async (db) => (await db.execute(dsql.raw(perintah))).count)

  it('tabel desa ber-RLS paksa, tetapi keempat peran tetap membaca semua desa', async () => {
    const [d] = await uji.sqlMigrasi`select c.relrowsecurity, c.relforcerowsecurity from pg_class c where c.relname = 'desa' and c.relkind = 'r'`
    expect(d).toMatchObject({ relrowsecurity: true, relforcerowsecurity: true })
    const semua = Number((await uji.sqlMigrasi`select count(*)::int as n from desa`)[0].n)
    expect(semua).toBeGreaterThanOrEqual(2)
    for (const peran of ['desa', 'kabupaten', 'konsol', 'publik'] as const) expect(await hitungDesaPeran(peran), peran).toBe(semua)
  })

  it('desa hanya mengubah kolom istilah_wilayah desanya sendiri', async () => {
    expect(await ubahDesa('desa_a', `update desa set istilah_wilayah = ${ISTILAH} where id = 'desa_a'`)).toBe(1)
    expect(await ubahDesa('desa_a', `update desa set istilah_wilayah = ${ISTILAH} where id = 'desa_b'`)).toBe(0)
    expect(await ubahDesa(undefined, `update desa set istilah_wilayah = ${ISTILAH} where id = 'desa_a'`)).toBe(0)
    const [b] = await uji.sqlMigrasi`select istilah_wilayah from desa where id = 'desa_b'`
    expect(b.istilah_wilayah).toEqual({ dusun: 'Dusun', rw: 'RW', rt: 'RT' })
    // `kode_surat` sengaja dibuka di 0011 (rencana 8F1 Ruling 10); uji hak kolomnya ada di test/meta/surat.test.ts.
    for (const kolom of ['nama', 'slug', 'status', 'modul']) {
      expect(kodePg(await jalankan('desa', 'desa_a', `update desa set ${kolom} = ${kolom} where id = 'desa_a'`)), kolom).toBe('42501')
    }
    expect(kodePg(await jalankan('desa', 'desa_a', `delete from desa where id = 'desa_a'`))).toBe('42501')
  })

  it('kabupaten, Konsol, dan publik tidak bisa mengubah desa', async () => {
    for (const peran of ['kabupaten', 'konsol', 'publik'] as const) {
      expect(kodePg(await jalankan(peran, undefined, `update desa set istilah_wilayah = ${ISTILAH}`)), peran).toBe('42501')
    }
  })
})

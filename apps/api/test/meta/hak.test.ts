import { sql as dsql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { GOLONGAN_TABEL, tabelDengan } from '../../src/penggolongan'
import { buatDbUji, type DbUji } from '../basisdata'
import { sisipkanDesaContoh } from '../data-contoh'

let uji: DbUji
beforeAll(async () => {
  uji = await buatDbUji()
  await sisipkanDesaContoh(uji.sqlMigrasi, 'desa_a', 1)
})
afterAll(async () => {
  await uji?.tutup()
})

const PERAN_LAIN = ['sinfodes_kabupaten', 'sinfodes_konsol', 'sinfodes_publik'] as const
const HAK = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'] as const
const kodePg = (e: unknown): string | undefined => {
  for (let x = e as { code?: string; cause?: unknown } | undefined; x; x = x.cause as typeof x) if (x.code) return x.code
  return undefined
}
const punyaHak = async (peran: string, tabel: string, hak: string): Promise<boolean> =>
  (await uji.sqlMigrasi`select has_table_privilege(${peran}, ${tabel}, ${hak}) as ada`)[0].ada as boolean

describe('hak tabel per peran (SPEC-V0.3 §7.3)', () => {
  it('kabupaten, Konsol, dan publik tidak punya hak apa pun atas tabel desa-privat, sesi, dan jejak audit', async () => {
    for (const tabel of [...tabelDengan('desa-privat'), 'sesi', 'jejak_audit', 'jejak_bantuan', 'kunci_data']) {
      for (const peran of PERAN_LAIN) {
        for (const hak of HAK) expect(await punyaHak(peran, tabel, hak), `${peran} ${hak} ${tabel}`).toBe(false)
      }
    }
  })

  it('publik hanya boleh SELECT pada desa, alias_alamat, dan kabupaten_mitra', async () => {
    for (const tabel of Object.keys(GOLONGAN_TABEL)) {
      for (const hak of HAK) {
        const harus = hak === 'SELECT' && ['desa', 'alias_alamat', 'kabupaten_mitra'].includes(tabel)
        expect(await punyaHak('sinfodes_publik', tabel, hak), `publik ${hak} ${tabel}`).toBe(harus)
      }
    }
  })

  it('peran desa tidak punya DELETE pada sesi dan tidak menulis tabel platform', async () => {
    expect(await punyaHak('sinfodes_desa', 'sesi', 'DELETE')).toBe(false)
    for (const tabel of ['desa', 'alias_alamat', 'kunci_data']) {
      for (const hak of ['INSERT', 'UPDATE', 'DELETE'] as const) expect(await punyaHak('sinfodes_desa', tabel, hak), `${hak} ${tabel}`).toBe(false)
    }
  })

  it('tak ada peran aplikasi yang SUPERUSER atau BYPASSRLS, dan tak ada yang memiliki tabel', async () => {
    const peran = await uji.sqlMigrasi`select rolname, rolsuper, rolbypassrls, rolcreatedb, rolcreaterole from pg_roles where rolname like 'sinfodes\_%'`
    expect(peran.length).toBe(5)
    for (const p of peran) {
      expect(p.rolsuper, p.rolname).toBe(false)
      expect(p.rolbypassrls, p.rolname).toBe(false)
      expect(p.rolcreaterole, p.rolname).toBe(false)
      if (p.rolname !== 'sinfodes_migrasi') expect(p.rolcreatedb, p.rolname).toBe(false)
    }
    const pemilik = await uji.sqlMigrasi`select distinct tableowner from pg_tables where schemaname = 'public'`
    expect(pemilik.map((b) => b.tableowner)).toEqual(['sinfodes_migrasi'])
  })

  it('batas waktu pernyataan dan transaksi menggantung terpasang di empat peran aplikasi', async () => {
    const baris = await uji.sqlMigrasi`select rolname, rolconfig from pg_roles where rolname in ('sinfodes_desa', 'sinfodes_kabupaten', 'sinfodes_konsol', 'sinfodes_publik')`
    expect(baris.length).toBe(4)
    for (const b of baris) {
      const konfig = (b.rolconfig as string[] | null) ?? []
      expect(konfig, b.rolname).toContain('statement_timeout=15s')
      expect(konfig, b.rolname).toContain('idle_in_transaction_session_timeout=15s')
    }
  })

  it('jejak audit hanya tambah: INSERT berhasil, UPDATE, DELETE, dan SELECT ditolak', async () => {
    await uji.klien.dalamTransaksi('desa', { desaId: 'desa_a' }, (db) =>
      db.execute(dsql`insert into jejak_audit (id, desa_id, jenis, waktu) values ('aud_1', 'desa_a', 'uji', now())`),
    )
    for (const perintah of ['update jejak_audit set jenis = \'x\'', 'delete from jejak_audit', 'select * from jejak_audit']) {
      const galat = await uji.klien
        .dalamTransaksi('desa', { desaId: 'desa_a' }, (db) => db.execute(dsql.raw(perintah)))
        .then(() => null, (e: unknown) => e)
      expect(kodePg(galat), perintah).toBe('42501')
    }
    expect((await uji.sqlMigrasi`select count(*)::int as n from jejak_audit`)[0].n).toBe(1)
  })

  it('audit tidak bisa ditulis atas nama desa lain', async () => {
    const galat = await uji.klien
      .dalamTransaksi('desa', { desaId: 'desa_a' }, (db) =>
        db.execute(dsql`insert into jejak_audit (id, desa_id, jenis, waktu) values ('aud_2', 'desa_lain', 'uji', now())`),
      )
      .then(() => null, (e: unknown) => e)
    expect(kodePg(galat)).toBe('42501')
  })
})

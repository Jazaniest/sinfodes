import { getTableConfig } from 'drizzle-orm/pg-core'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { TABEL_SKEMA } from '../../src/basisdata/skema'
import { GOLONGAN_TABEL, tabelDengan } from '../../src/penggolongan'
import { buatDbUji, type DbUji } from '../basisdata'

let uji: DbUji
beforeAll(async () => {
  uji = await buatDbUji()
})
afterAll(async () => {
  await uji?.tutup()
})

describe('skema basis data (SPEC-V0.3 §7.2, §7.10)', () => {
  it('setiap tabel di skema public tercantum di penggolongan, dan sebaliknya', async () => {
    const baris = await uji.sqlMigrasi`select tablename from pg_tables where schemaname = 'public'`
    expect(baris.map((b) => b.tablename as string).sort()).toEqual(Object.keys(GOLONGAN_TABEL).sort())
  })

  it('tabel desa-privat, sesi, dan jejak audit memakai RLS paksa dengan kebijakan untuk peran desa dan pemilik', async () => {
    const baris = await uji.sqlMigrasi`select c.relname, c.relrowsecurity, c.relforcerowsecurity,
        (select count(*)::int from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) as kebijakan
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = any(${[...tabelDengan('desa-privat'), 'sesi', 'jejak_audit']})`
    expect(baris.length).toBe(tabelDengan('desa-privat').length + 2)
    for (const b of baris) {
      expect(b.relrowsecurity, b.relname).toBe(true)
      expect(b.relforcerowsecurity, b.relname).toBe(true)
      expect(b.kebijakan, b.relname).toBeGreaterThanOrEqual(2)
    }
  })

  it('setiap indeks bukan-PK pada tabel desa-privat diawali desa_id', async () => {
    const baris = await uji.sqlMigrasi`select c.relname as tabel, i.relname as indeks, a.attname as kolom_pertama
      from pg_index x
      join pg_class c on c.oid = x.indrelid
      join pg_class i on i.oid = x.indexrelid
      join pg_namespace n on n.oid = c.relnamespace
      left join pg_attribute a on a.attrelid = c.oid and a.attnum = x.indkey[0]
      where n.nspname = 'public' and not x.indisprimary and c.relname = any(${tabelDengan('desa-privat')})`
    expect(baris.length).toBeGreaterThan(0)
    for (const b of baris) expect(b.kolom_pertama, `${b.tabel}.${b.indeks}`).toBe('desa_id')
  })

  it('setiap tabel yang digolongkan (selain _migrasi) punya definisi Drizzle', () => {
    expect(Object.keys(TABEL_SKEMA).sort()).toEqual(Object.keys(GOLONGAN_TABEL).filter((t) => t !== '_migrasi').sort())
  })

  it('kolom tabel Drizzle sama dengan information_schema (tidak hilang, tidak berlebih)', async () => {
    for (const [nama, tabel] of Object.entries(TABEL_SKEMA)) {
      const dibuat = (await uji.sqlMigrasi`select column_name from information_schema.columns where table_schema = 'public' and table_name = ${nama}`).map(
        (b) => b.column_name as string,
      )
      const didefinisikan = getTableConfig(tabel).columns.map((k) => k.name)
      expect(didefinisikan.sort(), nama).toEqual(dibuat.sort())
    }
  })

  it('basis data memakai penyedia kolasi ICU (SPEC-V0.3 §7.10)', async () => {
    const [b] = await uji.sqlMigrasi`select datlocprovider from pg_database where datname = current_database()`
    expect(b.datlocprovider).toBe('i')
  })

  it('PostgreSQL berversi minimal 15', async () => {
    const [b] = await uji.sqlMigrasi`select current_setting('server_version_num')::int as versi`
    expect(b.versi).toBeGreaterThanOrEqual(150000)
  })

  it('migrasi dicatat dengan checksum dan tidak diterapkan dua kali', async () => {
    const baris = await uji.sqlMigrasi`select nama, checksum from _migrasi order by nama`
    expect(baris.map((b) => b.nama)).toContain('0001_dasar.sql')
    for (const b of baris) expect(b.checksum).toMatch(/^[0-9a-f]{64}$/)
  })
})

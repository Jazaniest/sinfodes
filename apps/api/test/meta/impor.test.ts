import { sql as dsql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { GOLONGAN_TABEL } from '../../src/penggolongan'
import { buatDbUji, type DbUji } from '../basisdata'
import { sisipkanDesaContoh } from '../data-contoh'

let uji: DbUji
beforeAll(async () => {
  uji = await buatDbUji()
  for (const desa of ['desa_a', 'desa_b']) {
    await sisipkanDesaContoh(uji.sqlMigrasi, desa, 1)
    await sisipSesi(`imp_${desa}`, desa)
  }
})
afterAll(async () => {
  await uji?.tutup()
})

async function sisipSesi(id: string, desaId: string, o: { isi?: string | null; selesai?: boolean } = {}): Promise<void> {
  const isi = o.isi === undefined ? 'v1.kid.sandi' : o.isi
  await uji.sqlMigrasi`insert into impor_penduduk (id, desa_id, dicatat_oleh_id, nama_berkas, dibuat_pada, jumlah_baris, isi, selesai_pada)
    values (${id}, ${desaId}, 'pgn_x', 'data.xlsx', now(), 3, ${isi}, ${o.selesai ? new Date() : null})`
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
const jalankan = (desaId: string | undefined, perintah: string) =>
  galatDari(uji.klien.dalamTransaksi('desa', { desaId }, (db) => db.execute(dsql.raw(perintah))))
const hitung = (desaId: string | undefined) =>
  uji.klien.dalamTransaksi('desa', { desaId }, async (db) => Number((await db.execute<{ n: number }>(dsql.raw('select count(*)::int as n from impor_penduduk')))[0].n))
const punyaHak = async (tabel: string, hak: string) =>
  (await uji.sqlMigrasi`select has_table_privilege('sinfodes_desa', ${tabel}, ${hak}) as ada`)[0].ada as boolean
const punyaHakKolom = async (kolom: string) =>
  (await uji.sqlMigrasi`select has_column_privilege('sinfodes_desa', 'impor_penduduk', ${kolom}, 'UPDATE') as ada`)[0].ada as boolean

describe('impor_penduduk (rencana 8E3 Ruling 5)', () => {
  it('digolongkan desa-privat dengan RLS paksa', async () => {
    expect(GOLONGAN_TABEL.impor_penduduk).toBe('desa-privat')
    const [t] = await uji.sqlMigrasi`select relrowsecurity, relforcerowsecurity from pg_class where relname = 'impor_penduduk'`
    expect(t).toMatchObject({ relrowsecurity: true, relforcerowsecurity: true })
  })

  it('kolom sama dengan skema Drizzle', async () => {
    const kolom = (await uji.sqlMigrasi`select column_name from information_schema.columns where table_schema = 'public' and table_name = 'impor_penduduk'`).map((b) => b.column_name as string)
    expect(kolom.sort()).toEqual(['desa_id', 'dibuat_pada', 'dicatat_oleh_id', 'id', 'isi', 'jumlah_baris', 'nama_berkas', 'selesai_pada'])
  })

  it('desa: SELECT, INSERT, dan DELETE; UPDATE hanya pada isi dan selesai_pada', async () => {
    for (const hak of ['SELECT', 'INSERT', 'DELETE']) expect(await punyaHak('impor_penduduk', hak), hak).toBe(true)
    expect(await punyaHak('impor_penduduk', 'UPDATE')).toBe(false)
    for (const kolom of ['isi', 'selesai_pada']) expect(await punyaHakKolom(kolom), kolom).toBe(true)
    for (const kolom of ['id', 'desa_id', 'dicatat_oleh_id', 'nama_berkas', 'dibuat_pada', 'jumlah_baris']) expect(await punyaHakKolom(kolom), kolom).toBe(false)
  })

  it('peran lain tidak punya hak apa pun pada tabel ini', async () => {
    for (const peran of ['sinfodes_kabupaten', 'sinfodes_konsol', 'sinfodes_publik']) {
      const [{ ada }] = await uji.sqlMigrasi`select has_table_privilege(${peran}, 'impor_penduduk', 'SELECT') as ada`
      expect(ada, peran).toBe(false)
    }
  })

  it('konteks desa hanya melihat dan menghapus barisnya sendiri; desa lain tidak terlihat', async () => {
    expect(await hitung('desa_a')).toBe(1)
    expect(await hitung('desa_b')).toBe(1)
    expect(await hitung(undefined)).toBe(0)
    await uji.klien.dalamTransaksi('desa', { desaId: 'desa_a' }, (db) => db.execute(dsql.raw("delete from impor_penduduk where id = 'imp_desa_b'")))
    expect(await hitung('desa_b')).toBe(1)
  })

  it('CHECK: isi harus tersandi (v1.); selesai_pada terisi bila dan hanya bila isi kosong', async () => {
    expect(kodePg(await galatDari(sisipSesi('imp_polos', 'desa_a', { isi: '{"kolom":["NIK"],"baris":[]}' })))).toBe('23514')
    expect(kodePg(await galatDari(sisipSesi('imp_selesai_isi', 'desa_a', { selesai: true })))).toBe('23514')
    expect(kodePg(await galatDari(sisipSesi('imp_kosong_belum', 'desa_a', { isi: null })))).toBe('23514')
    expect(await galatDari(sisipSesi('imp_selesai_ok', 'desa_a', { isi: null, selesai: true }))).toBeNull()
  })

  it('desa tidak bisa menyisipkan baris atas nama desa lain, dan UPDATE kolom lain ditolak', async () => {
    const lintas = await jalankan('desa_a', "insert into impor_penduduk (id, desa_id, dicatat_oleh_id, nama_berkas, dibuat_pada, jumlah_baris, isi) values ('imp_x', 'desa_b', 'pgn_x', 'a.csv', now(), 1, 'v1.k.s')")
    expect(kodePg(lintas)).toBe('42501')
    expect(kodePg(await jalankan('desa_a', "update impor_penduduk set nama_berkas = 'lain.csv' where id = 'imp_desa_a'"))).toBe('42501')
    expect(await jalankan('desa_a', "update impor_penduduk set isi = null, selesai_pada = now() where id = 'imp_desa_a'")).toBeNull()
  })
})

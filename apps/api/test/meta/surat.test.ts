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
    await sisipJenis(`js_${desa}_bawaan`, desa, 'SKD', { asal: 'bawaan' })
    await sisipJenis(`js_${desa}_desa`, desa, 'SKU', { asal: 'desa' })
    await uji.sqlMigrasi`insert into pengaturan_surat (desa_id, tata_letak, mode_tanda_tangan, format_nomor, urutan)
      values (${desa}, ${uji.sqlMigrasi.json({ kertas: 'A4' })}, 'tte', '{klasifikasi}/{urut}/{kodeDesa}/{bulanRomawi}/{tahun}', 'per-tahun')`
  }
})
afterAll(async () => {
  await uji?.tutup()
})

type Pilihan = { asal?: string; aktif?: boolean; diarsipkan?: boolean; klasifikasi?: string; subjek?: string; isian?: unknown; syarat?: unknown; masa?: number | null; tataLetak?: unknown }
async function sisipJenis(id: string, desaId: string, kode: string, o: Pilihan = {}): Promise<void> {
  await uji.sqlMigrasi`insert into jenis_surat (id, desa_id, kode, nama, klasifikasi, subjek, isian, boleh_atas_nama, wajib_paraf, masa_berlaku_bulan,
      online, syarat, teks, aktif, asal, diarsipkan, tata_letak)
    values (${id}, ${desaId}, ${kode}, ${`Jenis ${kode}`}, ${o.klasifikasi ?? '470'}, ${o.subjek ?? 'pemohon'}, ${uji.sqlMigrasi.json((o.isian ?? []) as never)},
      false, false, ${o.masa === undefined ? null : o.masa}, true, ${uji.sqlMigrasi.json((o.syarat ?? []) as never)}, 'Teks surat', ${o.aktif ?? true},
      ${o.asal ?? 'desa'}, ${o.diarsipkan ? new Date() : null}, ${o.tataLetak === undefined ? null : uji.sqlMigrasi.json(o.tataLetak as never)})`
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
const ubah = (desaId: string, perintah: string) => uji.klien.dalamTransaksi('desa', { desaId }, async (db) => (await db.execute(dsql.raw(perintah))).count)
const hitung = (desaId: string | undefined, tabel: string) =>
  uji.klien.dalamTransaksi('desa', { desaId }, async (db) => Number((await db.execute<{ n: number }>(dsql.raw(`select count(*)::int as n from ${tabel}`)))[0].n))
const punyaHak = async (peran: string, tabel: string, hak: string) =>
  (await uji.sqlMigrasi`select has_table_privilege(${peran}, ${tabel}, ${hak}) as ada`)[0].ada as boolean
const punyaHakKolom = async (peran: string, tabel: string, kolom: string) =>
  (await uji.sqlMigrasi`select has_column_privilege(${peran}, ${tabel}, ${kolom}, 'UPDATE') as ada`)[0].ada as boolean
const kolomTabel = async (tabel: string) =>
  (await uji.sqlMigrasi`select column_name from information_schema.columns where table_schema = 'public' and table_name = ${tabel}`).map((b) => b.column_name as string)

const TABEL = ['jenis_surat', 'pengaturan_surat'] as const
/** Kolom jenis surat yang boleh diubah peran desa: sama dengan `ubahJenisSuratSchema` ditambah `diarsipkan` (arsip dan aktifkan lagi). */
const KOLOM_UBAH_JENIS = ['nama', 'klasifikasi', 'isian', 'boleh_atas_nama', 'wajib_paraf', 'masa_berlaku_bulan', 'online', 'syarat', 'teks', 'aktif', 'diarsipkan', 'tata_letak']
const KOLOM_UBAH_PENGATURAN = ['tata_letak', 'format_nomor', 'urutan']

describe('jenis surat dan pengaturan surat (rencana 8F1 Tugas 2)', () => {
  it('kedua tabel digolongkan desa-privat', () => {
    for (const tabel of TABEL) expect(GOLONGAN_TABEL[tabel], tabel).toBe('desa-privat')
  })

  it('kolom dan tipenya sesuai rencana', async () => {
    const tipe = async (tabel: string) =>
      Object.fromEntries((await uji.sqlMigrasi`select column_name, data_type from information_schema.columns where table_schema = 'public' and table_name = ${tabel}`).map((b) => [b.column_name, b.data_type]))
    expect(await tipe('jenis_surat')).toEqual({
      urutan: 'bigint', id: 'text', desa_id: 'text', kode: 'text', nama: 'text', klasifikasi: 'text', subjek: 'text', isian: 'jsonb', boleh_atas_nama: 'boolean',
      wajib_paraf: 'boolean', masa_berlaku_bulan: 'integer', online: 'boolean', syarat: 'jsonb', teks: 'text', aktif: 'boolean', asal: 'text',
      diarsipkan: 'timestamp with time zone', tata_letak: 'jsonb', dibuat_pada: 'timestamp with time zone',
    })
    expect(await tipe('pengaturan_surat')).toEqual({ desa_id: 'text', tata_letak: 'jsonb', mode_tanda_tangan: 'text', format_nomor: 'text', urutan: 'text' })
  })

  it('RLS aktif dan dipaksa pada kedua tabel', async () => {
    for (const tabel of TABEL) {
      const [b] = await uji.sqlMigrasi`select relrowsecurity as aktif, relforcerowsecurity as paksa from pg_class where relname = ${tabel}`
      expect(b, tabel).toEqual({ aktif: true, paksa: true })
    }
  })

  it('peran lain tanpa hak apa pun pada kedua tabel', async () => {
    for (const tabel of TABEL) {
      for (const peran of ['sinfodes_kabupaten', 'sinfodes_konsol', 'sinfodes_publik']) {
        for (const hak of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) expect(await punyaHak(peran, tabel, hak), `${peran} ${hak} ${tabel}`).toBe(false)
      }
    }
  })

  it('tanpa konteks nol baris, dengan konteks hanya baris desanya', async () => {
    expect(await hitung(undefined, 'jenis_surat')).toBe(0)
    expect(await hitung('desa_a', 'jenis_surat')).toBe(2)
    expect(await hitung('desa_lain', 'jenis_surat')).toBe(0)
    expect(await hitung(undefined, 'pengaturan_surat')).toBe(0)
    expect(await hitung('desa_a', 'pengaturan_surat')).toBe(1)
    expect(await hitung('desa_lain', 'pengaturan_surat')).toBe(0)
  })

  it('desa A tidak bisa menyisipkan baris desa B', async () => {
    const jenis = (id: string, desaId: string) =>
      `insert into jenis_surat (id, desa_id, kode, nama, klasifikasi, subjek, isian, boleh_atas_nama, wajib_paraf, online, syarat, teks, aktif, asal) values ('${id}', '${desaId}', 'ZZZ', 'Z', '470', 'pemohon', '[]'::jsonb, false, false, true, '[]'::jsonb, 't', true, 'desa')`
    expect(kodePg(await jalankan('desa', 'desa_a', jenis('js_x', 'desa_b')))).toBe('42501')
    expect(await jalankan('desa', 'desa_a', jenis('js_a3', 'desa_a'))).toBeNull()
    await uji.sqlMigrasi`delete from jenis_surat where id = 'js_a3'`
    expect(kodePg(await jalankan('desa', 'desa_a', `insert into pengaturan_surat (desa_id, tata_letak, mode_tanda_tangan, format_nomor, urutan) values ('desa_c', '{}'::jsonb, 'tte', '{urut}', 'per-tahun')`))).toBe('42501')
  })

  it('jenis_surat: hak kolom UPDATE hanya pada kolom yang bisa diubah rute', async () => {
    for (const k of await kolomTabel('jenis_surat')) expect(await punyaHakKolom('sinfodes_desa', 'jenis_surat', k), k).toBe(KOLOM_UBAH_JENIS.includes(k))
    for (const k of ['kode', 'asal', 'desa_id', 'dibuat_pada', 'id', 'subjek']) {
      expect(kodePg(await jalankan('desa', 'desa_a', `update jenis_surat set ${k} = ${k}`)), k).toBe('42501')
    }
    // Kolom identitas GENERATED ALWAYS ditolak lebih awal oleh PostgreSQL (428C9), sebelum pemeriksaan hak.
    expect(await jalankan('desa', 'desa_a', 'update jenis_surat set urutan = urutan')).not.toBeNull()
  })

  it('pengaturan_surat: hak kolom UPDATE hanya tata letak, format nomor, dan urutan; mode tanda tangan tidak bisa diubah', async () => {
    for (const k of await kolomTabel('pengaturan_surat')) expect(await punyaHakKolom('sinfodes_desa', 'pengaturan_surat', k), k).toBe(KOLOM_UBAH_PENGATURAN.includes(k))
    expect(kodePg(await jalankan('desa', 'desa_a', `update pengaturan_surat set mode_tanda_tangan = 'basah'`))).toBe('42501')
    expect(await ubah('desa_a', `update pengaturan_surat set urutan = 'per-jenis'`)).toBe(1)
    expect(await ubah('desa_a', `update pengaturan_surat set urutan = 'per-jenis' where desa_id = 'desa_b'`)).toBe(0)
    await uji.sqlMigrasi`update pengaturan_surat set urutan = 'per-tahun'`
    expect(kodePg(await jalankan('desa', 'desa_a', 'delete from pengaturan_surat'))).toBe('42501')
  })

  it('desa: kode_surat desanya sendiri boleh diubah, nama tidak, desa lain 0 baris', async () => {
    expect(await ubah('desa_a', `update desa set kode_surat = 'SS' where id = 'desa_a'`)).toBe(1)
    expect(await ubah('desa_a', `update desa set kode_surat = 'XX' where id = 'desa_b'`)).toBe(0)
    expect((await uji.sqlMigrasi`select id, kode_surat from desa where id in ('desa_a', 'desa_b') order by id`).map((b) => `${b.id}:${b.kode_surat}`)).toEqual(['desa_a:SS', 'desa_b:470'])
    expect(kodePg(await jalankan('desa', 'desa_a', `update desa set nama = 'Lain' where id = 'desa_a'`))).toBe('42501')
    expect(await ubah('desa_a', `update desa set istilah_wilayah = istilah_wilayah where id = 'desa_a'`)).toBe(1)
  })

  it('DELETE: jenis bawaan tidak terhapus (0 baris), jenis desa terhapus, jenis desa lain tidak tersentuh', async () => {
    expect(await ubah('desa_a', `delete from jenis_surat where id = 'js_desa_a_bawaan'`)).toBe(0)
    expect(await ubah('desa_a', `delete from jenis_surat where id = 'js_desa_b_desa'`)).toBe(0)
    await sisipJenis('js_a_hapus', 'desa_a', 'HPS', { asal: 'desa' })
    expect(await ubah('desa_a', `delete from jenis_surat where id = 'js_a_hapus'`)).toBe(1)
    const sisa = await uji.sqlMigrasi`select id from jenis_surat where id in ('js_desa_a_bawaan', 'js_desa_b_desa') order by id`
    expect(sisa.map((b) => b.id)).toEqual(['js_desa_a_bawaan', 'js_desa_b_desa'])
  })

  it('UNIQUE (desa_id, kode) termasuk terhadap jenis arsip; desa lain boleh memakai kode yang sama', async () => {
    await sisipJenis('js_a_arsip', 'desa_a', 'ARS', { asal: 'desa', aktif: false, diarsipkan: true })
    expect(kodePg(await galatDari(sisipJenis('js_a_kembar', 'desa_a', 'ARS')))).toBe('23505')
    expect(kodePg(await galatDari(sisipJenis('js_a_kembar2', 'desa_a', 'SKD')))).toBe('23505')
    expect(await galatDari(sisipJenis('js_b_ars', 'desa_b', 'ARS'))).toBeNull()
    await uji.sqlMigrasi`delete from jenis_surat where id in ('js_a_arsip', 'js_b_ars')`
  })

  it('CHECK jenis_surat: kode, klasifikasi, subjek, asal, jsonb, dan masa berlaku', async () => {
    const coba = (id: string, kode: string, o: Pilihan) => galatDari(sisipJenis(id, 'desa_a', kode, o))
    expect(kodePg(await coba('c1', 'a', {}))).toBe('23514')
    expect(kodePg(await coba('c2', 'skd', {}))).toBe('23514')
    expect(kodePg(await coba('c3', 'ABCDEF', {}))).toBe('23514')
    expect(kodePg(await coba('c4', 'S', {}))).toBe('23514')
    expect(kodePg(await coba('c5', 'CCC', { klasifikasi: '47' }))).toBe('23514')
    expect(kodePg(await coba('c6', 'CCD', { klasifikasi: '470.' }))).toBe('23514')
    expect(kodePg(await coba('c7', 'CCE', { subjek: 'orang' }))).toBe('23514')
    expect(kodePg(await coba('c8', 'CCF', { asal: 'luar' }))).toBe('23514')
    expect(kodePg(await coba('c9', 'CCG', { isian: {} }))).toBe('23514')
    expect(kodePg(await coba('c10', 'CCH', { syarat: 'x' }))).toBe('23514')
    expect(kodePg(await coba('c11', 'CCI', { tataLetak: [] }))).toBe('23514')
    expect(kodePg(await coba('c12', 'CCJ', { masa: 0 }))).toBe('23514')
    for (const [id, kode, o] of [['ok1', 'AB', {}], ['ok2', 'ABCDE', {}], ['ok3', 'OKA', { klasifikasi: '474.1' }], ['ok4', 'OKB', { subjek: 'kelahiran' }], ['ok5', 'OKC', { subjek: 'kematian', masa: 6 }], ['ok6', 'OKD', { tataLetak: { a: 1 } }]] as const) {
      expect(await coba(id, kode, o), kode).toBeNull()
    }
    await uji.sqlMigrasi`delete from jenis_surat where id like 'ok%'`
  })

  it('CHECK arsip: jenis aktif tidak boleh diarsipkan dan jenis bawaan tidak boleh diarsipkan', async () => {
    expect(kodePg(await galatDari(sisipJenis('a1', 'desa_a', 'ARA', { asal: 'desa', aktif: true, diarsipkan: true })))).toBe('23514')
    expect(kodePg(await galatDari(sisipJenis('a2', 'desa_a', 'ARB', { asal: 'bawaan', aktif: false, diarsipkan: true })))).toBe('23514')
    expect(await galatDari(sisipJenis('a3', 'desa_a', 'ARC', { asal: 'desa', aktif: false, diarsipkan: true }))).toBeNull()
    expect(kodePg(await galatDari(uji.sqlMigrasi`update jenis_surat set aktif = true where id = 'a3'`))).toBe('23514')
    expect(kodePg(await galatDari(uji.sqlMigrasi`update jenis_surat set diarsipkan = now() where id = 'js_desa_a_bawaan'`))).toBe('23514')
    await uji.sqlMigrasi`delete from jenis_surat where id = 'a3'`
  })

  it('CHECK pengaturan_surat: tata letak berupa objek, mode dan urutan dikenal', async () => {
    const sisip = (desaId: string, tataLetak: string, mode: string, urutan: string) =>
      galatDari(uji.sqlMigrasi.unsafe(`insert into pengaturan_surat (desa_id, tata_letak, mode_tanda_tangan, format_nomor, urutan) values ('${desaId}', '${tataLetak}'::jsonb, '${mode}', '{urut}', '${urutan}')`))
    await sisipkanDesaContoh(uji.sqlMigrasi, 'desa_c', 1)
    expect(kodePg(await sisip('desa_c', '[]', 'tte', 'per-tahun'))).toBe('23514')
    expect(kodePg(await sisip('desa_c', '{}', 'digital', 'per-tahun'))).toBe('23514')
    expect(kodePg(await sisip('desa_c', '{}', 'tte', 'bulanan'))).toBe('23514')
    expect(await sisip('desa_c', '{}', 'basah', 'per-jenis')).toBeNull()
    expect(kodePg(await sisip('desa_c', '{}', 'tte', 'per-tahun'))).toBe('23505')
  })

  it('urutan mengikuti urutan sisip dan tidak bisa diisi manual', async () => {
    await sisipJenis('u1', 'desa_a', 'UAA')
    await sisipJenis('u2', 'desa_a', 'UAB')
    await sisipJenis('u3', 'desa_a', 'UAC')
    const urut = await uji.sqlMigrasi`select id from jenis_surat where id in ('u1', 'u2', 'u3') order by urutan`
    expect(urut.map((b) => b.id)).toEqual(['u1', 'u2', 'u3'])
    expect(kodePg(await galatDari(uji.sqlMigrasi.unsafe(`insert into jenis_surat (urutan, id, desa_id, kode, nama, klasifikasi, subjek, isian, boleh_atas_nama, wajib_paraf, online, syarat, teks, aktif, asal) values (1, 'u4', 'desa_a', 'UAD', 'n', '470', 'pemohon', '[]'::jsonb, false, false, true, '[]'::jsonb, 't', true, 'desa')`)))).toBe('428C9')
    await uji.sqlMigrasi`delete from jenis_surat where id in ('u1', 'u2', 'u3')`
  })
})

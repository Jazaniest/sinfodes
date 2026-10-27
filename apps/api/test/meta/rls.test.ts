import { sql as dsql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buatKlien } from '../../src/basisdata/klien'
import { penduduk } from '../../src/basisdata/skema'
import { tabelDengan } from '../../src/penggolongan'
import { buatDbUji, type DbUji } from '../basisdata'
import { sisipkanDesaContoh } from '../data-contoh'

let uji: DbUji
beforeAll(async () => {
  uji = await buatDbUji()
  await sisipkanDesaContoh(uji.sqlMigrasi, 'desa_a', 2)
  await sisipkanDesaContoh(uji.sqlMigrasi, 'desa_b', 3)
})
afterAll(async () => {
  await uji?.tutup()
})

const kodePg = (e: unknown): string | undefined => {
  for (let x = e as { code?: string; cause?: unknown } | undefined; x; x = x.cause as typeof x) if (x.code) return x.code
  return undefined
}
const hitung = async (desaId?: string, tabel = 'penduduk'): Promise<number> =>
  uji.klien.dalamTransaksi('desa', { desaId }, async (db) => {
    const baris = await db.execute<{ n: number }>(dsql.raw(`select count(*)::int as n from ${tabel}`))
    return Number(baris[0].n)
  })

describe('RLS: tolak-bawaan dan batas antardesa (SPEC-V0.3 §7.4)', () => {
  it('tanpa konteks, peran desa membaca nol baris dari setiap tabel ber-RLS', async () => {
    for (const tabel of [...tabelDengan('desa-privat'), 'sesi', 'jejak_audit']) {
      if (tabel === 'jejak_audit') continue // tanpa hak SELECT: diperiksa di uji hak
      expect(await hitung(undefined, tabel), tabel).toBe(0)
    }
    expect(await hitung(undefined)).toBe(0)
  })

  it('dengan konteks desa A, hanya baris desa A yang terlihat', async () => {
    expect(await hitung('desa_a')).toBe(2)
    expect(await hitung('desa_b')).toBe(3)
    expect(await hitung('desa_tidak_ada')).toBe(0)
  })

  it('dengan konteks desa A, baris desa B tidak bisa diubah, dihapus, atau disisipkan', async () => {
    await uji.klien.dalamTransaksi('desa', { desaId: 'desa_a' }, async (db) => {
      const ubah = await db.execute(dsql`update penduduk set nama = 'diretas' where desa_id = 'desa_b'`)
      expect(ubah.count).toBe(0)
      const hapus = await db.execute(dsql`delete from penduduk where desa_id = 'desa_b'`)
      expect(hapus.count).toBe(0)
    })
    const gagal = await uji.klien
      .dalamTransaksi('desa', { desaId: 'desa_a' }, (db) =>
        db.insert(penduduk).values({
          id: 'pdk_selundupan', desaId: 'desa_b', nama: 'X', jenisKelamin: 'L', golonganDarah: 'O', agama: 'Islam', kewarganegaraan: 'WNI',
          tempatLahir: 'U', tanggalLahir: '1990-01-01', keluargaId: 'kk_desa_b', hubunganKeluarga: 'Anak', namaAyah: 'A', namaIbu: 'I',
          dusunId: 'dsn_desa_b', rw: '001', rt: '001', statusDasar: 'Hidup', statusPenduduk: 'Tetap', ktpEl: 'Sudah rekam',
          dibuatPada: new Date(), diubahPada: new Date(),
        }),
      )
      .then(() => null, (e: unknown) => e)
    expect(kodePg(gagal)).toBe('42501')
    expect((await uji.sqlMigrasi`select count(*)::int as n from penduduk where desa_id = 'desa_b'`)[0].n).toBe(3)
  })

  it('konteks tidak tersisa di koneksi yang dipakai ulang (kolam berukuran 1)', async () => {
    const kecil = buatKlien(uji.urlDb, { maks: 1 })
    try {
      const nilai = async (desaId?: string) =>
        kecil.dalamTransaksi('desa', { desaId }, async (db) => {
          const baris = await db.execute<{ n: number; konteks: string | null }>(
            dsql`select (select count(*) from penduduk)::int as n, current_setting('sinfodes.desa_id', true) as konteks`,
          )
          return { n: Number(baris[0].n), konteks: baris[0].konteks }
        })
      expect((await nilai('desa_a')).n).toBe(2)
      const tanpa = await nilai(undefined)
      expect(tanpa.n).toBe(0)
      expect(tanpa.konteks === null || tanpa.konteks === '').toBe(true)
      expect((await nilai('desa_b')).n).toBe(3)
      expect((await nilai(undefined)).n).toBe(0)
    } finally {
      await kecil.tutup()
    }
  })

  it('galat di tengah transaksi membatalkan semuanya dan melepas konteks', async () => {
    await expect(
      uji.klien.dalamTransaksi('desa', { desaId: 'desa_a' }, async (db) => {
        await db.execute(dsql`update penduduk set nama = 'sementara'`)
        throw new Error('batal')
      }),
    ).rejects.toThrow('batal')
    expect((await uji.sqlMigrasi`select count(*)::int as n from penduduk where nama = 'sementara'`)[0].n).toBe(0)
  })
})

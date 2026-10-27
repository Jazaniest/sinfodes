import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buatDbUji, type DbUji } from '../test/basisdata'
import { bukaKunci, GalatBukaKunci } from './buka-kunci'

let uji: DbUji
beforeAll(async () => {
  uji = await buatDbUji()
})
afterAll(async () => {
  await uji?.tutup()
})

const hitung = async (): Promise<Record<string, number>> => {
  const platform = await uji.sqlMigrasi`select jenis, count(*)::int as n from kunci_masuk_platform group by jenis`
  const desa = await uji.sqlMigrasi`select jenis, count(*)::int as n from kunci_masuk_desa group by jenis`
  return Object.fromEntries([...platform, ...desa].map((b) => [b.jenis as string, b.n as number]))
}

const isi = async () => {
  await uji.sqlMigrasi`delete from kunci_masuk_platform`
  await uji.sqlMigrasi`delete from kunci_masuk_desa`
  const sampai = new Date(Date.now() + 24 * 3600_000)
  for (const jenis of ['konsol', 'kabupaten']) {
    await uji.sqlMigrasi`insert into kunci_masuk_platform (jenis, kunci, gagal, kali_terkunci, terkunci_sampai, diubah) values (${jenis}, 'k', 0, 3, ${sampai}, now())`
  }
  for (const jenis of ['warga', 'panel']) {
    await uji.sqlMigrasi`insert into kunci_masuk_desa (desa_id, jenis, kunci, gagal, kali_terkunci, terkunci_sampai, diubah) values ('desa_sungai_sialang', ${jenis}, 'k', 0, 3, ${sampai}, now())`
  }
}

describe('db:buka-kunci (pemulihan bila pemilik Konsol terkunci)', () => {
  it('membuka hanya jenis yang diminta dan melaporkan jumlah kunci yang dihapus', async () => {
    await isi()
    expect(await bukaKunci(uji.sqlMigrasi, 'konsol')).toBe(1)
    expect(await hitung()).toEqual({ kabupaten: 1, warga: 1, panel: 1 })
    expect(await bukaKunci(uji.sqlMigrasi, 'panel')).toBe(1)
    expect(await bukaKunci(uji.sqlMigrasi, 'konsol')).toBe(0)
  })

  it('semua membuka keempat jenis sekaligus', async () => {
    await isi()
    expect(await bukaKunci(uji.sqlMigrasi, 'semua')).toBe(4)
    expect(await hitung()).toEqual({})
  })

  it('jenis yang tidak dikenal ditolak dengan pesan yang menyebut pilihan sah', async () => {
    await expect(bukaKunci(uji.sqlMigrasi, 'apa-saja')).rejects.toThrow(GalatBukaKunci)
    await expect(bukaKunci(uji.sqlMigrasi, 'apa-saja')).rejects.toThrow('konsol, kabupaten, warga, panel, semua')
  })
})

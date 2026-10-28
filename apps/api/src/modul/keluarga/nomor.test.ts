import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buatDbUji, penyandiUji, type DbUji } from '../../../test/basisdata'
import { sisipkanDesaContoh } from '../../../test/data-contoh'
import type { Penyandi } from '../../kripto/penyandi'
import { ruang } from '../../kripto/ruang'
import { nomorKkBaru } from './nomor'

let uji: DbUji
let penyandi: Penyandi
const SEKARANG = new Date('2026-09-24T02:00:00Z')
const DESA = { id: 'desa_a', kodeDesa: '14.05.09.2001' }
// Kode wilayah 140509 + tanggal 24-09-26 -> awalan nomor KK 240926.
const awalan = '140509240926'
beforeAll(async () => {
  uji = await buatDbUji()
  penyandi = await penyandiUji(uji.sqlMigrasi)
  await sisipkanDesaContoh(uji.sqlMigrasi, 'desa_a', 1)
})
afterAll(async () => {
  await uji?.tutup()
})

const sisipKk = async (nomorUrut: number[]): Promise<void> => {
  const baris = nomorUrut.map((n) => {
    const nomor = `${awalan}${String(n).padStart(4, '0')}`
    return { id: `kk_uji_${n}`, desa_id: 'desa_a', nomor_kk_sandi: penyandi.sandikan(nomor, ruang.nomorKk('desa_a')), nomor_kk_indeks: penyandi.indeks(nomor, ruang.nomorKk('desa_a')), kepala_keluarga_id: 'pdk_desa_a_1', dusun_id: 'dsn_desa_a', rw: '001', rt: '001', tanggal_terbit: '2026-09-24' }
  })
  for (let i = 0; i < baris.length; i += 500) await uji.sqlMigrasi`insert into keluarga ${uji.sqlMigrasi(baris.slice(i, i + 500))}`
}
const baru = () => uji.klien.dalamTransaksi('desa', { desaId: 'desa_a' }, (db) => nomorKkBaru(db, DESA, penyandi, SEKARANG))

describe('nomorKkBaru (rencana 8E1 Ruling 6)', () => {
  it('nomor pertama hari ini berakhiran 8001: kode wilayah desa + tanggal terbit + nomor urut', async () => {
    expect(await baru()).toBe(`${awalan}8001`)
  })

  it('melompati nomor urut yang sudah dipakai, termasuk yang berlubang', async () => {
    await sisipKk([8001, 8002, 8004])
    expect(await baru()).toBe(`${awalan}8003`)
    await sisipKk([8003])
    expect(await baru()).toBe(`${awalan}8005`)
  })

  it('hari lain mulai lagi dari 8001', async () => {
    const besok = new Date('2026-09-25T02:00:00Z')
    expect(await uji.klien.dalamTransaksi('desa', { desaId: 'desa_a' }, (db) => nomorKkBaru(db, DESA, penyandi, besok))).toBe('140509250926' + '8001')
  })

  it('nomor urut 8001-9999 habis → CONFLICT yang jelas, bukan 500', async () => {
    const dipakai = Array.from({ length: 1999 }, (_, i) => 8001 + i).filter((n) => ![8001, 8002, 8003, 8004].includes(n))
    await sisipKk(dipakai.filter((n) => n !== 8005))
    expect(await baru()).toBe(`${awalan}8005`)
    await sisipKk([8005])
    await expect(baru()).rejects.toMatchObject({ kode: 'CONFLICT', status: 409, message: 'Nomor urut KK hari ini habis.' })
  })
})

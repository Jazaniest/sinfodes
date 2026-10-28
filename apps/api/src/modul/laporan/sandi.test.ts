import type { IsiLaporan } from '@sinfodes/kontrak/laporan/schema'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buatDbUji, penyandiUji, type DbUji } from '../../../test/basisdata'
import type { Penyandi } from '../../kripto/penyandi'
import { bukaIsiLaporan, sandikanIsiLaporan } from './sandi'

let uji: DbUji
let penyandi: Penyandi
beforeAll(async () => {
  uji = await buatDbUji()
  penyandi = await penyandiUji(uji.sqlMigrasi)
})
afterAll(async () => {
  await uji?.tutup()
})

const perbaikan = (field: 'telepon' | 'pekerjaan', nilaiBaru: string): IsiLaporan => ({
  jenis: 'perbaikan', pendudukId: 'pdk_x', field, nilaiBaru, catatan: 'Nomor lama sudah mati.',
})
const kelahiran: IsiLaporan = {
  jenis: 'kelahiran', ibuId: 'pdk_ibu', nama: 'Nayla Safitri', jenisKelamin: 'P', tanggalLahir: '2026-09-21', jam: '05:20',
  tempatDilahirkan: 'Puskesmas', penolong: 'Bidan/Perawat', beratGram: 3050, panjangCm: 49, catatan: null,
}

describe('sandi isi laporan (rencana 8E2 Ruling 4)', () => {
  it('nilai telepon disandikan di ruang desa dan terbuka kembali; bagian lain isi tidak berubah', () => {
    const polos = perbaikan('telepon', '081234567890')
    const sandi = sandikanIsiLaporan(penyandi, 'desa_a', polos)
    expect(sandi).toMatchObject({ jenis: 'perbaikan', pendudukId: 'pdk_x', field: 'telepon', catatan: 'Nomor lama sudah mati.' })
    expect((sandi as { nilaiBaru: string }).nilaiBaru).toMatch(/^v1\./)
    expect(JSON.stringify(sandi)).not.toContain('081234567890')
    expect(bukaIsiLaporan(penyandi, 'desa_a', sandi)).toEqual(polos)
  })

  it('sandi satu desa tidak terbuka di ruang desa lain', () => {
    const sandi = sandikanIsiLaporan(penyandi, 'desa_a', perbaikan('telepon', '081234567890'))
    expect(() => bukaIsiLaporan(penyandi, 'desa_b', sandi)).toThrow()
  })

  it('field biasa dan laporan kelahiran apa adanya', () => {
    const biasa = perbaikan('pekerjaan', 'Wiraswasta')
    expect(sandikanIsiLaporan(penyandi, 'desa_a', biasa)).toEqual(biasa)
    expect(bukaIsiLaporan(penyandi, 'desa_a', biasa)).toEqual(biasa)
    expect(sandikanIsiLaporan(penyandi, 'desa_a', kelahiran)).toEqual(kelahiran)
    expect(bukaIsiLaporan(penyandi, 'desa_a', kelahiran)).toEqual(kelahiran)
  })
})

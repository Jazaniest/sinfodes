import { describe, expect, it } from 'vitest'
import { contohPermohonan } from '@/test/contoh-surat'
import type { Permohonan, Terbit } from './permohonan'
import { ringkasSuratTerbit } from './ringkas'
import { TATA_LETAK_SIAP } from './tata-letak-siap'

// Kamis, 24 September 2026 pukul 09.00 WIB.
const SEKARANG = new Date('2026-09-24T02:00:00Z')
const terbit = (pada: string): Terbit => ({
  nomor: '470/001/SS/IX/2026', tahun: 2026, urut: 1, kodeVerifikasi: 'SS-AAAA-AAAA', pada,
  penandatangan: { id: 'pgn_nasir', nama: 'H. Muhammad Nasir', peran: 'kades', nip: null }, mode: 'tte', berlakuSampai: null,
  lembar: { judul: 'X', pembuka: 'Y', blok: [], tempatTanggal: 'Z' },
  tataLetak: TATA_LETAK_SIAP.standar, kop: { lambang: null, lambangKabupaten: null },
})
const surat = (masukPada: string, pada: string, ubah: Partial<Permohonan> = {}) =>
  contohPermohonan({ status: 'selesai', masukPada, terbit: terbit(pada), ...ubah })

describe('ringkasSuratTerbit (SPEC §5.3)', () => {
  it('surat Selesai 30 hari terakhir dan rata-rata lama selesainya dalam hari kerja, dibulatkan', () =>
    expect(
      ringkasSuratTerbit(
        [
          surat('2026-09-21T09:00:00+07:00', '2026-09-21T11:00:00+07:00'),
          surat('2026-09-21T09:00:00+07:00', '2026-09-22T10:00:00+07:00'),
          surat('2026-08-01T09:00:00+07:00', '2026-08-03T10:00:00+07:00'),
          surat('2026-09-22T09:00:00+07:00', '2026-09-22T10:00:00+07:00', { status: 'dibatalkan' }),
          contohPermohonan({ status: 'diproses' }),
        ],
        SEKARANG,
      ),
    ).toEqual({ terbit30Hari: 2, rataSelesaiHariKerja: 1 }))
  it('tanpa surat terbit → nol', () => expect(ringkasSuratTerbit([], SEKARANG)).toEqual({ terbit30Hari: 0, rataSelesaiHariKerja: 0 }))
})

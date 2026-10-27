import { describe, expect, it } from 'vitest'
import { pengaturanBawaan } from '@/domain/surat/pengaturan-bawaan'
import type { DetailPermohonan, Terbit } from '@/domain/surat/permohonan'
import { TATA_LETAK_SIAP } from '@/domain/surat/tata-letak-siap'
import { contohPenduduk } from '@/test/contoh'
import { contohJenis, contohPermohonan } from '@/test/contoh-surat'
import { pesanWhatsApp } from './pesan-wa'

const TERBIT: Terbit = {
  nomor: '470/087/SS/IX/2026', tahun: 2026, urut: 87, kodeVerifikasi: 'SS-7K3M-Q9TD', pada: '2026-09-24T10:00:00+07:00',
  penandatangan: { id: 'pgn_nasir', nama: 'H. Muhammad Nasir', peran: 'kades', nip: null }, mode: 'tte', berlakuSampai: '2026-12-24',
  lembar: { judul: 'SURAT KETERANGAN DOMISILI', pembuka: '…', blok: [], tempatTanggal: 'Sungai Sialang, 24 September 2026' },
  tataLetak: TATA_LETAK_SIAP.standar, kop: { lambang: null, lambangKabupaten: null },
}
const detail = (terbit: Terbit): DetailPermohonan => ({
  permohonan: contohPermohonan({ status: 'selesai', terbit }), jenis: contohJenis('SKD'), pemohon: contohPenduduk(),
  subjek: null, mutasi: null, pengaturan: pengaturanBawaan('desa_sungai_sialang'), pejabat: { kades: 'H. Muhammad Nasir', sekdes: 'Hendri Saputra' },
})
const DESA = { nama: 'Sungai Sialang', slug: 'sungaisialang' }

describe('pesan WhatsApp (SPEC §7.4)', () => {
  it('nama, jenis, nomor, tautan unduh, dan masa berlaku', () =>
    expect(pesanWhatsApp(detail(TERBIT), DESA)).toBe(
      [
        'Yth. Siti Rahmah,',
        'Surat Keterangan Domisili Anda sudah selesai ditandatangani.',
        'Nomor: 470/087/SS/IX/2026',
        'Unduh: https://sungaisialang.sinfodes.localhost/unduh/SS-7K3M-Q9TD',
        'Berlaku sampai 24 Desember 2026.',
        'Pemerintah Desa Sungai Sialang',
      ].join('\n'),
    ))
  it('surat tanpa masa berlaku tidak menyebut tanggal berlaku', () =>
    expect(pesanWhatsApp(detail({ ...TERBIT, berlakuSampai: null }), DESA)).not.toContain('Berlaku sampai'))
})

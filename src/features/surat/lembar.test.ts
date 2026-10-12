import { describe, expect, it } from 'vitest'
import { pengaturanBawaan } from '@/domain/surat/pengaturan'
import type { DetailPermohonan, Permohonan, Terbit } from '@/domain/surat/permohonan'
import { contohPenduduk } from '@/test/contoh'
import { contohJenis, contohPermohonan } from '@/test/contoh-surat'
import { contohSesi } from '@/test/sesi'
import { dataLembar, MODE_DEMO } from './lembar'

const { desa, dusun } = contohSesi()
const detail = (ubah: Partial<Permohonan> = {}): DetailPermohonan => ({
  permohonan: contohPermohonan(ubah),
  jenis: contohJenis('SKD'),
  pemohon: contohPenduduk(),
  subjek: null,
  mutasi: null,
  pengaturan: pengaturanBawaan('desa_sungai_sialang'),
  pejabat: { kades: 'H. Muhammad Nasir', sekdes: 'Hendri Saputra' },
})
const KONTEKS = {
  desa, dusun, isian: { keperluan: 'pembukaan rekening bank' }, hariIni: new Date('2026-09-24T02:00:00Z'), asal: 'https://demo.sinfodes.id',
}
const TERBIT: Terbit = {
  nomor: '470/087/SS/IX/2026', tahun: 2026, urut: 87, kodeVerifikasi: 'SS-7K3M-Q9TD', pada: '2026-09-20T10:00:00+07:00',
  penandatangan: { id: 'pgn_hendri', nama: 'Hendri Saputra', peran: 'sekdes' }, mode: 'tte', berlakuSampai: '2026-12-20',
  lembar: { judul: 'SURAT KETERANGAN DOMISILI', pembuka: 'Isi yang dibekukan', blok: [], tempatTanggal: 'Sungai Sialang, 20 September 2026' },
}

describe('dataLembar (SPEC §7.4, §7.5)', () => {
  it('draf: isi dari isian yang sedang diketik; tanpa nomor, QR, dan kaki verifikasi', () => {
    const l = dataLembar(detail(), KONTEKS)
    expect(l.nomor).toBeNull()
    expect(l.verifikasi).toBeNull()
    expect(l.kop).toEqual({
      kabupaten: 'Pelalawan', kecamatan: 'Teluk Meranti', desa: 'Sungai Sialang',
      alamat: 'Jalan Lintas Teluk Meranti Km 4, Sungai Sialang', kodePos: '28353', surel: 'pemdes@sungaisialang.desa.id', lambang: null,
    })
    expect(l.tandaTangan).toEqual({
      tempatTanggal: 'Sungai Sialang, 24 September 2026', jabatan: 'Kepala Desa Sungai Sialang', atasNama: null,
      nama: 'H. Muhammad Nasir', mode: 'tte', qr: null,
    })
    expect(l.isi.blok).toContainEqual({ jenis: 'paragraf', teks: expect.stringContaining('keperluan pembukaan rekening bank') })
    // Penanda simulasi mengikuti VITE_DEMO (berkas .env proyek menyalakannya, juga saat uji).
    expect(l).toMatchObject({ kertas: 'A4', huruf: 'Tinos', simulasi: MODE_DEMO })
  })
  it('sudah terbit: isi yang dibekukan, nomor, QR ke halaman verifikasi, dan a.n. bila Sekdes (fokus review 4)', () => {
    const l = dataLembar(detail({ status: 'selesai', terbit: TERBIT }), KONTEKS)
    expect(l.isi.pembuka).toBe('Isi yang dibekukan')
    expect(l.nomor).toBe('470/087/SS/IX/2026')
    const isiQr = 'https://demo.sinfodes.id/desa/sungai-sialang/verifikasi?kode=SS-7K3M-Q9TD'
    expect(l.tandaTangan).toEqual({
      tempatTanggal: 'Sungai Sialang, 20 September 2026', jabatan: 'Kepala Desa Sungai Sialang', atasNama: 'Sekretaris Desa',
      nama: 'Hendri Saputra', mode: 'tte', qr: { isi: isiQr, kode: 'SS-7K3M-Q9TD' },
    })
    expect(l.verifikasi).toEqual({ kode: 'SS-7K3M-Q9TD', domain: 'sungaisialang.desa.id', isiQr })
  })
  it('lambang yang diunggah desa ikut ke kop surat (3C)', () => {
    const lambang = `data:image/png;base64,${'A'.repeat(64)}`
    expect(dataLembar(detail(), { ...KONTEKS, desa: { ...desa, lambang } }).kop.lambang).toBe(lambang)
  })
})

import { describe, expect, it } from 'vitest'
import { pengaturanBawaan } from '@/domain/surat/pengaturan-bawaan'
import type { DetailPermohonan, Permohonan, Terbit } from '@/domain/surat/permohonan'
import { salinTataLetak, TATA_LETAK_SIAP } from '@/domain/surat/tata-letak-siap'
import { contohPenduduk } from '@/test/contoh'
import { contohJenis, contohPermohonan } from '@/test/contoh-surat'
import { contohSesi } from '@/test/sesi'
import { dataLembar, lembarTerbit, MODE_DEMO } from './lembar'

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
  desa, dusun, isian: { keperluan: 'pembukaan rekening bank' }, hariIni: new Date('2026-09-24T02:00:00Z'), asal: 'http://sungaisialang.sinfodes.localhost:3000',
}
const TERBIT: Terbit = {
  nomor: '470/087/SS/IX/2026', tahun: 2026, urut: 87, kodeVerifikasi: 'SS-7K3M-Q9TD', pada: '2026-09-20T10:00:00+07:00',
  penandatangan: { id: 'pgn_hendri', nama: 'Hendri Saputra', peran: 'sekdes', nip: '198504102011012002' }, mode: 'tte', berlakuSampai: '2026-12-20',
  lembar: { judul: 'SURAT KETERANGAN DOMISILI', pembuka: 'Isi yang dibekukan', blok: [], tempatTanggal: 'Sungai Sialang, 20 September 2026' },
  tataLetak: TATA_LETAK_SIAP.standar, kop: { lambang: null, lambangKabupaten: null },
}

describe('dataLembar (SPEC §7.4, §7.5)', () => {
  it('draf: isi dari isian yang sedang diketik; tanpa nomor, QR, dan kaki verifikasi', () => {
    const l = dataLembar(detail(), KONTEKS)
    expect(l.nomor).toBeNull()
    expect(l.verifikasi).toBeNull()
    expect(l.kop).toEqual({
      kabupaten: 'Pelalawan', kecamatan: 'Teluk Meranti', desa: 'Sungai Sialang',
      alamat: 'Jalan Lintas Teluk Meranti Km 4, Sungai Sialang', kodePos: '28353', surel: 'pemdes@sungaisialang.desa.id', lambang: null, lambangKabupaten: null,
    })
    expect(l.tandaTangan).toEqual({
      tempatTanggal: 'Sungai Sialang, 24 September 2026', jabatan: 'Kepala Desa Sungai Sialang', atasNama: null,
      nama: 'H. Muhammad Nasir', nip: null, mode: 'tte', qr: null,
    })
    expect(l.isi.blok).toContainEqual({ jenis: 'paragraf', teks: expect.stringContaining('keperluan pembukaan rekening bank') })
    // Penanda simulasi mengikuti VITE_DEMO (berkas .env proyek menyalakannya, juga saat uji).
    expect(l).toMatchObject({ tataLetak: TATA_LETAK_SIAP.standar, simulasi: MODE_DEMO })
  })
  it('sudah terbit: isi yang dibekukan, nomor, QR ke halaman verifikasi, dan a.n. bila Sekdes (fokus review 4)', () => {
    const l = dataLembar(detail({ status: 'selesai', terbit: TERBIT }), KONTEKS)
    expect(l.isi.pembuka).toBe('Isi yang dibekukan')
    expect(l.nomor).toBe('470/087/SS/IX/2026')
    const isiQr = 'http://sungaisialang.sinfodes.localhost:3000/verifikasi?kode=SS-7K3M-Q9TD'
    expect(l.tandaTangan).toEqual({
      tempatTanggal: 'Sungai Sialang, 20 September 2026', jabatan: 'Kepala Desa Sungai Sialang', atasNama: 'Sekretaris Desa',
      nama: 'Hendri Saputra', nip: '198504102011012002', mode: 'tte', qr: { isi: isiQr, kode: 'SS-7K3M-Q9TD' },
    })
    expect(l.verifikasi).toEqual({ kode: 'SS-7K3M-Q9TD', domain: 'sungaisialang.sinfodes.localhost', isiQr })
  })
  it('lambang yang diunggah desa ikut ke kop surat (3C)', () => {
    const lambang = `data:image/png;base64,${'A'.repeat(64)}`
    expect(dataLembar(detail(), { ...KONTEKS, desa: { ...desa, lambang } }).kop.lambang).toBe(lambang)
  })
})

describe('lembarTerbit (layanan warga, 4A)', () => {
  it('sama dengan lembar surat terbit di ruang kerja, tanpa butuh data pemohon', () => {
    const d = detail({ status: 'selesai', terbit: TERBIT })
    expect(lembarTerbit(TERBIT, desa, KONTEKS.asal)).toEqual(dataLembar(d, KONTEKS))
  })
})

describe('tata letak yang dipakai lembar (SPEC-V0.2 12.2)', () => {
  const rataTengah = salinTataLetak(TATA_LETAK_SIAP['rata-tengah'])
  it('draf memakai tata letak desa; pengecualian jenis menggantikannya', () => {
    const d = detail()
    d.pengaturan = { ...d.pengaturan, tataLetak: rataTengah }
    expect(dataLembar(d, KONTEKS).tataLetak.siap).toBe('rata-tengah')
    d.jenis = { ...d.jenis, tataLetak: TATA_LETAK_SIAP['dua-lambang'] }
    expect(dataLembar(d, KONTEKS).tataLetak.siap).toBe('dua-lambang')
  })
  it('Review Focus 1: surat terbit memakai tata letak yang dibekukan, walau desa dan jenis sudah berganti', () => {
    const d = detail({ status: 'selesai', terbit: TERBIT })
    d.pengaturan = { ...d.pengaturan, tataLetak: rataTengah }
    d.jenis = { ...d.jenis, tataLetak: TATA_LETAK_SIAP['dua-lambang'] }
    expect(dataLembar(d, KONTEKS).tataLetak).toEqual(TATA_LETAK_SIAP.standar)
    expect(lembarTerbit(TERBIT, desa, KONTEKS.asal).tataLetak).toEqual(TATA_LETAK_SIAP.standar)
  })
  it('lambang surat terbit adalah yang dibekukan, bukan lambang desa sekarang', () => {
    const lama = `data:image/png;base64,${'L'.repeat(64)}`
    const baru = `data:image/png;base64,${'N'.repeat(64)}`
    const terbit: Terbit = { ...TERBIT, kop: { lambang: lama, lambangKabupaten: lama } }
    const l = lembarTerbit(terbit, { ...desa, lambang: baru, lambangKabupaten: baru }, KONTEKS.asal)
    expect(l.kop).toMatchObject({ lambang: lama, lambangKabupaten: lama })
    const draf = dataLembar(detail(), { ...KONTEKS, desa: { ...desa, lambang: baru, lambangKabupaten: baru } })
    expect(draf.kop).toMatchObject({ lambang: baru, lambangKabupaten: baru })
  })
  it('draf memakai NIP Kepala Desa dari pejabat; surat terbit memakai NIP yang dibekukan', () => {
    const d = detail()
    d.pejabat = { ...d.pejabat, nipKades: '198203152010011004' }
    expect(dataLembar(d, KONTEKS).tandaTangan.nip).toBe('198203152010011004')
    expect(lembarTerbit(TERBIT, desa, KONTEKS.asal).tandaTangan.nip).toBe('198504102011012002')
  })
})

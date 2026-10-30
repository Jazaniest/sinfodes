import { POLA_KODE_VERIFIKASI, buatKodeVerifikasi } from '@sinfodes/kontrak/surat/verifikasi'
import { TATA_LETAK_SIAP } from '@sinfodes/kontrak/surat/tata-letak-siap'
import type { Terbit } from '@sinfodes/kontrak/surat/permohonan'
import { describe, expect, it } from 'vitest'
import { penyandiTanpaDb } from '../../../test/rakit-app'
import { acakAman, hashDokumen, jsonKanonik } from './dokumen'
import { buatPengirimSimulator } from './pengirim'
import { buatPenandatanganSimulator } from './penandatangan'

const terbit = (): Terbit => ({
  nomor: '400/012/SS/X/2026',
  tahun: 2026,
  urut: 12,
  kodeVerifikasi: 'SS-7K3M-Q9TD',
  pada: '2026-10-30T09:00:00+07:00',
  penandatangan: { id: 'pgn_nasir', nama: 'H. Muhammad Nasir', peran: 'kades', nip: null },
  mode: 'tte',
  berlakuSampai: '2027-01-30',
  lembar: {
    judul: 'SURAT KETERANGAN DOMISILI',
    pembuka: 'Yang bertanda tangan di bawah ini menerangkan bahwa:',
    blok: [{ jenis: 'tabel', baris: [{ label: 'Nama', nilai: 'Siti Rahmah', tebal: false }] }, { jenis: 'paragraf', teks: 'Benar berdomisili di desa ini.' }],
    tempatTanggal: 'Sungai Sialang, 30 Oktober 2026',
  },
  tataLetak: structuredClone(TATA_LETAK_SIAP.standar),
  kop: { lambang: null, lambangKabupaten: null },
})

describe('jsonKanonik dan hashDokumen (rencana 8F2b Ruling 9)', () => {
  it('kunci objek diurutkan rekursif, array tetap urutannya, tanpa spasi', () => {
    expect(jsonKanonik({ b: 1, a: { d: [3, 1], c: null } })).toBe('{"a":{"c":null,"d":[3,1]},"b":1}')
  })
  it('urutan kunci tidak memengaruhi hasil', () => {
    const t = terbit()
    const terbalik = Object.fromEntries(Object.entries(t).reverse()) as Terbit
    expect(hashDokumen(terbalik)).toBe(hashDokumen(t))
  })
  it('hasilnya 64 karakter heksadesimal dan stabil', () => {
    const h = hashDokumen(terbit())
    expect(h).toMatch(/^[0-9a-f]{64}$/)
    expect(hashDokumen(terbit())).toBe(h)
  })
  it('perubahan satu huruf pada lembar, tata letak, atau kop mengubah hasil', () => {
    const asal = hashDokumen(terbit())
    const lembar = terbit()
    lembar.lembar.judul = 'SURAT KETERANGAN DOMISILI.'
    expect(hashDokumen(lembar)).not.toBe(asal)
    const tataLetak = terbit()
    tataLetak.tataLetak.kop.baris = ['DESA SUNGAI SIALANG']
    expect(hashDokumen(tataLetak)).not.toBe(asal)
    const kop = terbit()
    kop.kop.lambang = 'data:image/png;base64,AAAA'
    expect(hashDokumen(kop)).not.toBe(asal)
    const nomor = { ...terbit(), nomor: '400/013/SS/X/2026' }
    expect(hashDokumen(nomor)).not.toBe(asal)
  })
})

describe('Penandatangan simulator (rencana 8F2b Ruling 9)', () => {
  const penyandi = penyandiTanpaDb()
  const penandatangan = buatPenandatanganSimulator(penyandi)
  const m = { desaId: 'desa_a', hashDokumen: 'a'.repeat(64), penandatanganId: 'pgn_nasir', pada: new Date('2026-10-30T02:00:00Z') }

  it('tanda tangan berawalan sim1. dan diperiksa benar untuk pasangan yang sama', async () => {
    const { tandaTangan } = await penandatangan.tandatangani(m)
    expect(tandaTangan).toMatch(/^sim1\./)
    expect(await penandatangan.periksa({ desaId: m.desaId, hashDokumen: m.hashDokumen, tandaTangan })).toBe(true)
  })
  it('periksa salah bila hash berbeda atau tanda tangan dipalsukan', async () => {
    const { tandaTangan } = await penandatangan.tandatangani(m)
    expect(await penandatangan.periksa({ desaId: m.desaId, hashDokumen: 'b'.repeat(64), tandaTangan })).toBe(false)
    expect(await penandatangan.periksa({ desaId: m.desaId, hashDokumen: m.hashDokumen, tandaTangan: `${tandaTangan}x` })).toBe(false)
    expect(await penandatangan.periksa({ desaId: m.desaId, hashDokumen: m.hashDokumen, tandaTangan: 'bukan-sim' })).toBe(false)
  })
  it('desa lain tidak bisa memeriksa tanda tangan desa ini', async () => {
    const { tandaTangan } = await penandatangan.tandatangani(m)
    expect(await penandatangan.periksa({ desaId: 'desa_b', hashDokumen: m.hashDokumen, tandaTangan })).toBe(false)
  })
  it('tanda tangan tidak memuat hash atau id penandatangan secara polos', async () => {
    const { tandaTangan } = await penandatangan.tandatangani(m)
    expect(tandaTangan).not.toContain(m.hashDokumen)
    expect(tandaTangan).not.toContain('pgn_nasir')
  })
})

describe('Pengirim simulator', () => {
  it('tidak melakukan apa pun dan tidak menyimpan nomor', async () => {
    const pengirim = buatPengirimSimulator()
    await expect(pengirim.kirimWa({ desaId: 'desa_a', ke: '081234567890', pesan: 'Surat Anda sudah terbit.' })).resolves.toBeUndefined()
  })
})

describe('acakAman', () => {
  it('selalu di [0, 1) dan menghasilkan kode yang lolos pola verifikasi', () => {
    for (let i = 0; i < 500; i++) {
      const a = acakAman()
      expect(a).toBeGreaterThanOrEqual(0)
      expect(a).toBeLessThan(1)
    }
    const kode = buatKodeVerifikasi('SS', acakAman)
    expect(kode).toMatch(POLA_KODE_VERIFIKASI)
  })
  it('tidak konstan', () => {
    expect(new Set(Array.from({ length: 50 }, () => acakAman())).size).toBeGreaterThan(40)
  })
})

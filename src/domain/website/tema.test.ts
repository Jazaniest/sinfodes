import { describe, expect, it } from 'vitest'
import { periksaTema } from './kontras'
import { VARIABEL_KONTRAK } from './kontrak-tema'
import { ID_MOTIF } from './motif'
import { LATAR, PASANGAN_HURUF, PRESET_WARNA, TEMA_WARTA_BAWAAN, gayaWarga, pemetaanRegister, temaDasarSchema, turunanWarna, variabelTema } from './tema'

const PNG_KECIL = `data:image/png;base64,${'A'.repeat(1364)}`
const TEMA = TEMA_WARTA_BAWAAN('#1F4E79')
const pesan = (t: unknown) => temaDasarSchema.safeParse(t).error?.issues[0].message

describe('tema Dasar (rencana 7E-1 Tugas 1)', () => {
  it('delapan preset: enam aksen v0.1 dengan hex yang sama, ditambah hijau lumut dan biru laut', () => {
    expect(PRESET_WARNA.map((p) => [p.id, p.hex])).toEqual([
      ['biru-tinta', '#1F4E79'], ['hijau-sawit', '#2F5D3A'], ['teal-sungai', '#1E5F5A'], ['merah-bata', '#9A3B2A'],
      ['coklat-tanah', '#6B4A2E'], ['ungu-songket', '#5A3D6E'], ['hijau-lumut', '#4A6B2F'], ['biru-laut', '#14607A'],
    ])
  })
  it('semua preset lolos pemeriksa kontras di kedua latar', () => {
    for (const p of PRESET_WARNA) {
      for (const latar of Object.keys(LATAR) as (keyof typeof LATAR)[]) {
        const gagal = periksaTema({ warnaUtama: p.hex, warnaAksen: p.hex, latar }).filter((x) => !x.lolos)
        expect(gagal, `${p.id} di latar ${latar}`).toEqual([])
      }
    }
  })
  it('variabelTema memuat semua variabel kontrak', () => {
    const v = variabelTema(TEMA)
    for (const nama of VARIABEL_KONTRAK) expect(v[nama], nama).toBeTruthy()
    expect(Object.keys(v).sort()).toEqual([...VARIABEL_KONTRAK].sort())
    expect(v['--desa-warna-utama']).toBe('#1F4E79')
  })
  it('turunan: tua campur 20% hitam, muda campur 90% putih; sudut, jarak, dan latar sesuai pilihan', () => {
    expect(turunanWarna('#1F4E79')).toEqual({ utama: '#1F4E79', tua: '#193E61', muda: '#E9EDF2' })
    const v = variabelTema({ ...TEMA, sudut: 'bulat', kepadatan: 'rapat', latar: 'putih', huruf: 'fraunces' })
    expect(v).toMatchObject({
      '--desa-sudut': '10px', '--desa-sudut-besar': '16px', '--desa-jarak': '1.5rem', '--desa-jarak-kecil': '0.75rem',
      '--desa-latar': '#FAFAF8', '--desa-lembar': '#FFFFFF',
    })
    expect(v['--desa-huruf-judul']).toBe(PASANGAN_HURUF.fraunces.judul)
    expect(variabelTema(TEMA)).toMatchObject({ '--desa-sudut': '2px', '--desa-sudut-besar': '4px', '--desa-jarak': '2.5rem', '--desa-jarak-kecil': '1.25rem' })
  })
  it('pemetaanRegister menunjuk token Register ke variabel kontrak', () => {
    expect(pemetaanRegister()).toEqual({
      '--color-biru': 'var(--desa-warna-utama)',
      '--color-biru-tua': 'var(--desa-warna-utama-tua)',
      '--color-biru-muda': 'var(--desa-warna-utama-muda)',
      '--color-kertas': 'var(--desa-latar)',
      '--color-lembar': 'var(--desa-lembar)',
      '--font-serif': 'var(--desa-huruf-judul)',
      '--font-sans': 'var(--desa-huruf-isi)',
      '--radius-1': 'var(--desa-sudut)',
      '--radius-2': 'var(--desa-sudut-besar)',
    })
  })
  it('gayaWarga: hanya warna utama dan turunannya, tanpa sudut, latar, atau huruf', () => {
    expect(gayaWarga('#2f5d3a')).toEqual({
      '--desa-warna-utama': '#2F5D3A',
      '--desa-warna-utama-tua': turunanWarna('#2F5D3A').tua,
      '--desa-warna-utama-muda': turunanWarna('#2F5D3A').muda,
      '--color-biru': 'var(--desa-warna-utama)',
      '--color-biru-tua': 'var(--desa-warna-utama-tua)',
      '--color-biru-muda': 'var(--desa-warna-utama-muda)',
    })
  })
  it('skema: tema bawaan sah, hex huruf kecil dinormalkan', () => {
    expect(temaDasarSchema.parse(TEMA)).toEqual(TEMA)
    expect(temaDasarSchema.parse({ ...TEMA, warnaUtama: '#1f4e79' }).warnaUtama).toBe('#1F4E79')
  })
  it('skema: kode warna salah dan sambutan 121 karakter ditolak dengan pesan persis', () => {
    expect(pesan({ ...TEMA, warnaUtama: '#12345' })).toBe('Kode warna harus berbentuk #RRGGBB.')
    expect(pesan({ ...TEMA, warnaAksen: 'biru' })).toBe('Kode warna harus berbentuk #RRGGBB.')
    expect(pesan({ ...TEMA, warga: { fotoLatar: null, sambutan: 'x'.repeat(121) } })).toBe('Kalimat sambutan paling banyak 120 karakter.')
    expect(temaDasarSchema.safeParse({ ...TEMA, warga: { fotoLatar: null, sambutan: 'x'.repeat(120) } }).success).toBe(true)
  })
  it('skema: sambutan dipangkas spasinya, kosong menjadi null', () => {
    expect(temaDasarSchema.parse({ ...TEMA, warga: { fotoLatar: null, sambutan: '  Selamat datang  ' } }).warga.sambutan).toBe('Selamat datang')
    expect(temaDasarSchema.parse({ ...TEMA, warga: { fotoLatar: null, sambutan: '   ' } }).warga.sambutan).toBeNull()
  })
  it('skema: pilihan di luar daftar ditolak; semua motif sah', () => {
    expect(temaDasarSchema.safeParse({ ...TEMA, huruf: 'comic' }).success).toBe(false)
    expect(temaDasarSchema.safeParse({ ...TEMA, sudut: 'lonjong' }).success).toBe(false)
    expect(temaDasarSchema.safeParse({ ...TEMA, kepadatan: 'sesak' }).success).toBe(false)
    expect(temaDasarSchema.safeParse({ ...TEMA, latar: 'hitam' }).success).toBe(false)
    for (const m of ID_MOTIF) expect(temaDasarSchema.safeParse({ ...TEMA, motif: m }).success).toBe(true)
  })
  it('skema: logo dan sampul unggahan atau foto kurasi, foto latar memakai batas sampul', () => {
    const ok = { ...TEMA, logo: PNG_KECIL, sampul: '/demo/foto/sampul-sungai-kampar.jpg', warga: { fotoLatar: '/demo/foto/sampul-sungai-kampar.jpg', sambutan: null } }
    expect(temaDasarSchema.parse(ok)).toEqual(ok)
    expect(pesan({ ...TEMA, sampul: 'https://contoh.id/f.jpg' })).toBe('Foto sampul harus gambar PNG, JPG, WebP, atau SVG, paling besar 1500 KB.')
    expect(temaDasarSchema.safeParse({ ...TEMA, warga: { fotoLatar: 'bukan-gambar', sambutan: null } }).success).toBe(false)
  })
  it('skema: logo paling besar 500 KB', () => {
    const besar = `data:image/png;base64,${'A'.repeat(600 * 1366)}`
    expect(pesan({ ...TEMA, logo: besar })).toBe('Ukuran gambar paling besar 500 KB.')
  })
  it('TEMA_WARTA_BAWAAN: Plex, kertas, tajam, lega, pucuk rebung, tanpa gambar', () => {
    expect(TEMA).toEqual({
      warnaUtama: '#1F4E79', warnaAksen: '#1F4E79', latar: 'kertas', huruf: 'plex', sudut: 'tajam', kepadatan: 'lega',
      motif: 'pucuk-rebung', logo: null, sampul: null, warga: { fotoLatar: null, sambutan: null },
    })
  })
})

import { describe, expect, it } from 'vitest'
import { GalatApi } from '@/api/galat'
import { ambilBerandaPublik, ambilIdentitasPublik } from '@/api/publik'
import { ambilSitus, aturLanjut, simpanDraf, terbitkan } from '@/api/website'
import { susunBlok, type BlokHtml } from '@/domain/website/blok'
import { susunanBawaan } from '@/domain/website/susunan'
import { TEMA_WARTA_BAWAAN } from '@/domain/website/tema'
import { AKUN_UJI, AKUN_WARGA_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { ambilDb } from '../db'

pakaiApiTiruan({ dbSegarTiapUji: true })

const TEMA = TEMA_WARTA_BAWAAN('#1F4E79')
const CSS_KARTU = '.kartu { color: red }'

async function galatDari(janji: Promise<unknown>): Promise<GalatApi> {
  try {
    await janji
  } catch (e) {
    if (e instanceof GalatApi) return e
    throw e
  }
  throw new Error('Seharusnya gagal')
}

const KODE: BlokHtml = {
  id: 'html_peta01',
  nama: 'Peta wisata',
  kode: '<p>Peta wisata desa</p>',
  tinggi: { mode: 'tetap', px: 200 },
}

/** Susunan bawaan dengan satu blok `html` di beranda yang menunjuk kode `KODE`. */
const susunanDenganHtml = () => ({
  ...susunanBawaan(),
  beranda: [...susunanBawaan().beranda, susunBlok({ id: 'blk_htmlu1', jenis: 'html', isi: { htmlId: KODE.id } })],
})

describe('CSS kustom, Blok HTML, dan saklar tingkat Lanjut (rencana 7G Tugas 2)', () => {
  it('PUT draf dengan CSS ber-@import ditolak 422 dengan pesan berbaris di field cssKustom', async () => {
    masukSebagai(AKUN_UJI.operator)
    const g = await galatDari(
      simpanDraf(null, {
        tema: TEMA,
        susunan: susunanBawaan(),
        cssKustom: '@import "x.css";\nbody { background: url(https://x/y.png) }',
        blokHtml: [],
      }),
    )
    expect(g.status).toBe(422)
    expect(g.kode).toBe('VALIDATION')
    expect(g.fields.cssKustom).toBe(
      'Baris 1: @import tidak diizinkan.\nBaris 2: url() hanya boleh ke gambar data atau foto media desa ini.',
    )
    expect((await ambilSitus()).draf).toBeNull()
  })

  it('CSS sah tersimpan: cssKustom utuh untuk penyunting, cssTerlingkup untuk publik', async () => {
    masukSebagai(AKUN_UJI.operator)
    const draf = await simpanDraf(null, { tema: TEMA, susunan: susunanBawaan(), cssKustom: CSS_KARTU, blokHtml: [] })
    expect(draf.cssKustom).toBe(CSS_KARTU)
    expect(draf.cssTerlingkup).toContain(':where([data-situs-kustom]) .kartu')
    expect(draf.cssTerlingkup).toContain('color:red')
  })

  it('lebih dari 10 blok HTML ditolak 422', async () => {
    masukSebagai(AKUN_UJI.operator)
    const blokHtml = Array.from({ length: 11 }, (_, i) => ({
      id: `html_blok${String(i).padStart(2, '0')}`,
      nama: `Blok ${i}`,
      kode: '<p>x</p>',
      tinggi: { mode: 'otomatis' as const },
    }))
    const g = await galatDari(simpanDraf(null, { tema: TEMA, susunan: susunanBawaan(), cssKustom: '', blokHtml }))
    expect(g.status).toBe(422)
    expect(g.fields.blokHtml).toBe('Paling banyak 10 blok HTML.')
  })

  it('isi blok HTML yang tidak sah ditolak dengan pesan persis per isian', async () => {
    masukSebagai(AKUN_UJI.operator)
    const kirim = (blokHtml: BlokHtml[]) => simpanDraf(null, { tema: TEMA, susunan: susunanBawaan(), cssKustom: '', blokHtml })
    const nama = await galatDari(kirim([{ id: 'html_kosong1', nama: '  ', kode: '<p>x</p>', tinggi: { mode: 'otomatis' } }]))
    expect(nama.fields['blokHtml.0.nama']).toBe('Nama blok HTML wajib diisi.')
    const besar = await galatDari(
      kirim([{ id: 'html_besar01', nama: 'Besar', kode: 'a'.repeat(64 * 1024 + 1), tinggi: { mode: 'otomatis' } }]),
    )
    expect(besar.fields['blokHtml.0.kode']).toBe('Kode HTML paling besar 64 KB.')
    const tinggi = await galatDari(kirim([{ id: 'html_rendah1', nama: 'Rendah', kode: '<p>x</p>', tinggi: { mode: 'tetap', px: 10 } }]))
    expect(tinggi.fields['blokHtml.0.tinggi.px']).toBe('Tinggi 40-3000 px.')
  })

  it('blok html yang menunjuk kode yang tidak ada ditolak 422', async () => {
    masukSebagai(AKUN_UJI.operator)
    const susunan = {
      ...susunanBawaan(),
      beranda: [susunBlok({ id: 'blk_htmlu1', jenis: 'html', isi: { htmlId: 'html_belum01' } })],
    }
    const g = await galatDari(simpanDraf(null, { tema: TEMA, susunan, cssKustom: '', blokHtml: [KODE] }))
    expect(g.status).toBe(422)
    expect(g.message).toBe('Blok HTML tidak ditemukan.')
    expect(g.fields.blokHtml).toBe('Blok HTML tidak ditemukan.')
  })

  it('saklar tingkat Lanjut menampilkan dan menyembunyikan CSS serta blok HTML tanpa terbit ulang', async () => {
    masukSebagai(AKUN_UJI.operator)
    await simpanDraf(null, { tema: TEMA, susunan: susunanDenganHtml(), cssKustom: CSS_KARTU, blokHtml: [KODE] })
    await terbitkan('Uji tampilan Lanjut.')
    // Tingkat Lanjut bawaan mati: CSS tidak dikirim dan blok html dilewati, walau kodenya tersimpan di versi terbit.
    expect((await ambilIdentitasPublik('sungaisialang')).cssKustom).toBeNull()
    expect((await ambilBerandaPublik('sungaisialang')).blok.some((b) => b.jenis === 'html')).toBe(false)
    // Menyalakan tingkat Lanjut langsung mengubah website publik tanpa terbit ulang.
    const nyala = await aturLanjut(true)
    expect(nyala.aktif).toBe(true)
    expect(nyala.pertamaDiaktifkan).not.toBeNull()
    expect((await ambilIdentitasPublik('sungaisialang')).cssKustom).toContain(':where([data-situs-kustom])')
    const beranda = await ambilBerandaPublik('sungaisialang')
    const html = beranda.blok.find((b) => b.jenis === 'html')
    expect(html?.data).toEqual({ nama: KODE.nama, kode: KODE.kode, tinggi: { mode: 'tetap', px: 200 } })
    // Dimatikan lagi: hilang dari publik, kode tetap tersimpan di terbit maupun draf.
    await aturLanjut(false)
    expect((await ambilIdentitasPublik('sungaisialang')).cssKustom).toBeNull()
    expect((await ambilBerandaPublik('sungaisialang')).blok.some((b) => b.jenis === 'html')).toBe(false)
    const situs = await ambilSitus()
    expect(situs.terbit.cssKustom).toBe(CSS_KARTU)
    expect(situs.terbit.cssTerlingkup).toContain(':where([data-situs-kustom])')
    expect(situs.terbit.blokHtml).toEqual([KODE])
    const draf = await simpanDraf(null, { tema: TEMA, susunan: susunanBawaan(), cssKustom: CSS_KARTU, blokHtml: [KODE] })
    expect(draf.cssKustom).toBe(CSS_KARTU)
    expect(draf.blokHtml).toEqual([KODE])
    // Menyalakan lagi memakai waktu pengaktifan pertama.
    const nyalaLagi = await aturLanjut(true)
    expect(nyalaLagi.pertamaDiaktifkan).toBe(nyala.pertamaDiaktifkan)
    expect((await ambilIdentitasPublik('sungaisialang')).cssKustom).toContain(':where([data-situs-kustom])')
  })

  it('Kades tidak berhak mengubah tingkat Lanjut', async () => {
    masukSebagai(AKUN_UJI.kades)
    const g = await galatDari(aturLanjut(true))
    expect(g.status).toBe(403)
    expect(g.message).toBe('Peran Anda tidak berhak mengelola Website Desa.')
    masukSebagai(AKUN_UJI.operator)
    expect((await ambilSitus()).lanjut.aktif).toBe(false)
  })

  it('respons verifikasi surat dan layanan warga tidak memuat cssKustom', async () => {
    masukSebagai(AKUN_UJI.operator)
    await simpanDraf(null, { tema: TEMA, susunan: susunanDenganHtml(), cssKustom: CSS_KARTU, blokHtml: [KODE] })
    await terbitkan('Uji kebocoran CSS.')
    await aturLanjut(true)
    const surat = ambilDb().permohonan.find(
      (x) => x.desaId === 'desa_sungai_sialang' && x.terbit !== null && (x.status === 'selesai' || x.status === 'dibatalkan'),
    )
    if (!surat?.terbit) throw new Error('Data uji tidak punya surat terbit')
    // Diperiksa dari respons mentah, supaya tidak lolos hanya karena skema membuang field yang tidak dikenal.
    const verifikasi = await fetch(new URL('/api/v1/publik/sungaisialang/verifikasi', window.location.origin), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kode: surat.terbit.kodeVerifikasi }),
    }).then((r) => r.text())
    expect(verifikasi).toContain(surat.terbit.nomor)
    expect(verifikasi).not.toContain('cssKustom')
    expect(verifikasi).not.toContain('data-situs-kustom')
    const warga = await fetch('http://localhost:3000/api/v1/warga/beranda', {
      headers: { Authorization: `Bearer warga.${AKUN_WARGA_UJI.siti}` },
    }).then((r) => r.text())
    expect(warga).not.toContain('cssKustom')
    expect(warga).not.toContain('data-situs-kustom')
  })
})

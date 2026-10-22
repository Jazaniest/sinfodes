import { describe, expect, it } from 'vitest'
import { GalatApi } from '@/api/galat'
import { ambilIdentitasPublik } from '@/api/publik'
import {
  ambilSitus, buangDraf, daftarRiwayat, pratinjauSitus, pulihkanVersi, simpanDraf, terbitkan,
} from '@/api/website'
import { susunBlok } from '@/domain/website/blok'
import { susunanBawaan, type Susunan } from '@/domain/website/susunan'
import { TEMA_WARTA_BAWAAN } from '@/domain/website/tema'
import type { VersiRiwayat, VersiSitus } from '@/domain/website/situs'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { ambilDb } from '../db'
import { handlerWebsite } from './website'

pakaiApiTiruan({ dbSegarTiapUji: true })

const TEMA = TEMA_WARTA_BAWAAN('#1F4E79')
const PNG_KECIL = `data:image/png;base64,${'A'.repeat(1364)}`

async function galatDari(janji: Promise<unknown>): Promise<GalatApi> {
  try {
    await janji
  } catch (e) {
    if (e instanceof GalatApi) return e
    throw e
  }
  throw new Error('Seharusnya gagal')
}

const halaman = (id: string, nama: string) => ({ id, nama, judul: `Halaman ${nama}`, blok: [] })
const susunanDenganHalamanGanda = (): Susunan => ({
  ...susunanBawaan(),
  halaman: [halaman('hlm_uji001', 'sejarah'), halaman('hlm_uji002', 'sejarah')],
})

/** Versi untuk dibandingkan: gambar data URL diturunkan menjadi penanda seperti respons riwayat. */
function tanpaGambar(v: VersiSitus | VersiRiwayat) {
  return {
    ...v,
    tema: {
      ...v.tema,
      logo: v.tema.logo ? true : null,
      sampul: v.tema.sampul ? true : null,
      warga: { ...v.tema.warga, fotoLatar: v.tema.warga.fotoLatar ? true : null },
    },
  }
}

describe('Situs draf, terbit, dan riwayat (rencana 7F-1 Tugas 2)', () => {
  it('GET situs: draf null setelah data dibangkitkan, terbit Warta lengkap dengan susunan', async () => {
    masukSebagai(AKUN_UJI.operator)
    const { terbit, draf } = await ambilSitus()
    expect(draf).toBeNull()
    expect(terbit.id).toMatch(/^vrs_[0-9]+$/)
    expect(terbit.catatan).toBeNull()
    expect(terbit.susunan.beranda.map((b) => b.jenis)).toEqual([
      'lencana', 'kabar', 'layanan', 'kabar', 'pengumuman-agenda', 'angka', 'apbdes', 'potensi',
    ])
  })
  it('PUT draf menyimpan draf dengan id baru; website publik belum berubah', async () => {
    masukSebagai(AKUN_UJI.operator)
    const draf = await simpanDraf(null, { tema: { ...TEMA, warnaUtama: '#2F5D3A', warnaAksen: '#2F5D3A' }, susunan: susunanBawaan() })
    expect(draf.id).toMatch(/^vrs_[0-9]+$/)
    expect(draf.tema.warnaUtama).toBe('#2F5D3A')
    expect((await ambilSitus()).draf?.id).toBe(draf.id)
    expect((await ambilIdentitasPublik('sungaisialang')).tema.warnaUtama).toBe('#1F4E79')
  })
  it('terbitkan memindah draf ke terbit: publik berubah, riwayat bertambah 1, draf kembali null', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    const draf = await simpanDraf(null, { tema: { ...TEMA, warnaUtama: '#2F5D3A', warnaAksen: '#2F5D3A' }, susunan: susunanBawaan() })
    const terbit = await terbitkan('Ganti warna menjadi hijau.')
    expect(terbit.id).toBe(draf.id)
    expect(terbit.catatan).toBe('Ganti warna menjadi hijau.')
    expect(terbit.oleh).toEqual({ id: 'pgn_hendri', nama: 'Hendri Saputra' })
    const situs = await ambilSitus()
    expect(situs.draf).toBeNull()
    expect(situs.terbit.tema.warnaUtama).toBe('#2F5D3A')
    expect((await ambilIdentitasPublik('sungaisialang')).tema.warnaUtama).toBe('#2F5D3A')
    const riwayat = await daftarRiwayat()
    expect(riwayat.data).toHaveLength(1)
    expect(riwayat.data[0].tema.warnaUtama).toBe('#1F4E79')
  })
  it('terbitkan tanpa draf ditolak 409 dengan pesan persis', async () => {
    masukSebagai(AKUN_UJI.operator)
    const g = await galatDari(terbitkan(null))
    expect(g).toMatchObject({ kode: 'CONFLICT', status: 409, message: 'Tidak ada draf untuk diterbitkan.' })
  })
  it('25 kali simpan draf lalu terbitkan: riwayat tetap 20 terbitan terakhir', async () => {
    masukSebagai(AKUN_UJI.operator)
    for (let i = 1; i <= 25; i++) {
      await simpanDraf(null, { tema: TEMA, susunan: susunanBawaan() })
      await terbitkan(`Terbitan ${i}`)
    }
    const riwayat = await daftarRiwayat()
    expect(riwayat.data).toHaveLength(20)
    expect(riwayat.data[0].catatan).toBe('Terbitan 24')
    expect(riwayat.data[19].catatan).toBe('Terbitan 5')
  })
  it('pulihkan versi kedua menjadi draf; publik belum berubah, dan setelah terbitkan isinya kembali', async () => {
    masukSebagai(AKUN_UJI.operator)
    await simpanDraf(null, { tema: { ...TEMA, warnaUtama: '#2F5D3A', warnaAksen: '#2F5D3A' }, susunan: susunanBawaan() })
    await terbitkan('Hijau.')
    await simpanDraf(null, { tema: { ...TEMA, warnaUtama: '#9A3B2A', warnaAksen: '#9A3B2A' }, susunan: susunanBawaan() })
    await terbitkan('Merah bata.')
    await simpanDraf(null, { tema: { ...TEMA, warnaUtama: '#14607A', warnaAksen: '#14607A' }, susunan: susunanBawaan() })
    await terbitkan('Biru laut.')
    const riwayat = await daftarRiwayat()
    // Riwayat terbaru dulu: [merah, hijau, Warta awal]; versi kedua adalah hijau.
    expect(riwayat.data.map((v) => v.catatan)).toEqual(['Merah bata.', 'Hijau.', null])
    const versiKedua = riwayat.data[1]
    expect(versiKedua.catatan).toBe('Hijau.')
    const sebelum = (await ambilIdentitasPublik('sungaisialang')).tema.warnaUtama
    const draf = await pulihkanVersi(versiKedua.id)
    expect(draf.tema.warnaUtama).toBe('#2F5D3A')
    expect(tanpaGambar(draf)).toEqual({ ...tanpaGambar(versiKedua), id: draf.id, diperbarui: draf.diperbarui })
    expect(draf.id).not.toBe(versiKedua.id)
    expect((await ambilIdentitasPublik('sungaisialang')).tema.warnaUtama).toBe(sebelum)
    const terbit = await terbitkan('Kembali ke hijau.')
    expect(terbit.tema.warnaUtama).toBe('#2F5D3A')
    expect((await ambilIdentitasPublik('sungaisialang')).tema.warnaUtama).toBe('#2F5D3A')
    expect((await daftarRiwayat()).data.map((v) => v.catatan)).toEqual(['Biru laut.', 'Merah bata.', 'Hijau.', null])
  })
  it('DELETE draf membuang draf dan kembali ke versi terbit', async () => {
    masukSebagai(AKUN_UJI.operator)
    await simpanDraf(null, { tema: { ...TEMA, warnaUtama: '#9A3B2A', warnaAksen: '#9A3B2A' }, susunan: susunanBawaan() })
    const situs = await buangDraf()
    expect(situs.draf).toBeNull()
    expect((await ambilSitus()).draf).toBeNull()
    expect(situs.terbit.tema.warnaUtama).toBe('#1F4E79')
  })
  it('susunan dengan halaman ganda ditolak 422 field susunan.halaman.1.nama dengan pesan persis', async () => {
    masukSebagai(AKUN_UJI.operator)
    const g = await galatDari(simpanDraf(null, { tema: TEMA, susunan: susunanDenganHalamanGanda() }))
    expect(g.kode).toBe('VALIDATION')
    expect(g.status).toBe(422)
    expect(g.fields?.['susunan.halaman.1.nama']).toBe('Nama halaman sudah dipakai.')
    expect((await ambilSitus()).draf).toBeNull()
  })
  it('Kades ditolak 403 di semua endpoint situs', async () => {
    masukSebagai(AKUN_UJI.kades)
    for (const janji of [ambilSitus(), simpanDraf(null, { tema: TEMA, susunan: susunanBawaan() }), terbitkan(null), daftarRiwayat(), pulihkanVersi('vrs_1'), buangDraf()]) {
      expect((await galatDari(janji)).kode).toBe('FORBIDDEN')
    }
  })
  it('respons riwayat memakai penanda, bukan data URL gambar', async () => {
    masukSebagai(AKUN_UJI.operator)
    await simpanDraf(null, { tema: { ...TEMA, logo: PNG_KECIL }, susunan: susunanBawaan() })
    await terbitkan('Dengan logo.')
    await simpanDraf(null, { tema: TEMA, susunan: susunanBawaan() })
    await terbitkan('Tanpa logo.')
    await simpanDraf(null, { tema: TEMA, susunan: susunanBawaan() })
    await terbitkan('Ketiga.')
    const riwayat = await daftarRiwayat()
    expect(riwayat.data.find((v) => v.catatan === 'Dengan logo.')?.tema.logo).toBe(true)
    expect(riwayat.data.find((v) => v.catatan === 'Tanpa logo.')?.tema.logo).toBeNull()
    expect(riwayat.data.find((v) => v.catatan === null)?.tema.sampul).toBe(true)
    expect(JSON.stringify(riwayat)).not.toContain('data:image')
  })
  it('pulihkan versi yang tidak ada ditolak 404', async () => {
    masukSebagai(AKUN_UJI.operator)
    const g = await galatDari(pulihkanVersi('vrs_999'))
    expect(g).toMatchObject({ kode: 'NOT_FOUND', message: 'Versi tidak ditemukan.' })
  })
})

describe('Penjaga draf dan pratinjau (rencana 7F-2 Tugas 1)', () => {
  const SUSUNAN_WARTA = ['lencana', 'kabar', 'layanan', 'kabar', 'pengumuman-agenda', 'angka', 'apbdes', 'potensi']

  it('PUT draf dasarId null saat belum ada draf: 200; kedua kali dasarId null: 409; dasarId yang benar: 200 dengan id baru', async () => {
    masukSebagai(AKUN_UJI.operator)
    const pertama = await simpanDraf(null, { tema: TEMA, susunan: susunanBawaan() })
    expect(pertama.id).toMatch(/^vrs_[0-9]+$/)
    const g = await galatDari(simpanDraf(null, { tema: TEMA, susunan: susunanBawaan() }))
    expect(g).toMatchObject({
      kode: 'CONFLICT',
      status: 409,
      message: 'Draf diubah di tempat lain. Muat ulang untuk melihat perubahan terbaru.',
    })
    const kedua = await simpanDraf(pertama.id, { tema: { ...TEMA, warnaUtama: '#2F5D3A', warnaAksen: '#2F5D3A' }, susunan: susunanBawaan() })
    expect(kedua.id).not.toBe(pertama.id)
    expect((await ambilSitus()).draf?.id).toBe(kedua.id)
    const basi = await galatDari(simpanDraf(pertama.id, { tema: TEMA, susunan: susunanBawaan() }))
    expect(basi.kode).toBe('CONFLICT')
  })
  it('tema gagal kontras di PUT draf ditolak 422 dengan pesan 7E-1; draf tidak dibuat', async () => {
    masukSebagai(AKUN_UJI.operator)
    const g = await galatDari(simpanDraf(null, { tema: { ...TEMA, warnaUtama: '#FFD400' }, susunan: susunanBawaan() }))
    expect(g.kode).toBe('VALIDATION')
    expect(g.status).toBe(422)
    expect(g.fields?.warnaUtama).toBe('Kontras warna utama di atas latar 1,3 : 1; perlu paling sedikit 4,5 : 1.')
    expect((await ambilSitus()).draf).toBeNull()
  })
  it('pratinjau Beranda: urutan blok sama dengan terbit; blok kabar bertanda kosong bila artikel dikosongkan', async () => {
    masukSebagai(AKUN_UJI.operator)
    ambilDb().artikel = []
    const { blok } = await pratinjauSitus({ tema: TEMA, susunan: susunanBawaan() }, 'beranda')
    expect(blok.map((b) => b.jenis)).toEqual(SUSUNAN_WARTA)
    expect(blok.filter((b) => b.jenis === 'kabar').map((b) => b.kosong)).toEqual([true, true])
    expect(blok.find((b) => b.jenis === 'lencana')?.kosong).toBe(false)
  })
  it('pratinjau menyertakan blok tersembunyi bertanda tersembunyi dan blok video tanpa URL bertanda kosong', async () => {
    masukSebagai(AKUN_UJI.operator)
    const susunan = susunanBawaan()
    susunan.beranda[0].tersembunyi = true
    susunan.beranda.push(susunBlok({ id: 'blk_video01', jenis: 'video', isi: { url: '', judul: '' } }))
    const { blok } = await pratinjauSitus({ tema: TEMA, susunan }, 'beranda')
    const lencana = blok.find((b) => b.jenis === 'lencana')
    expect(lencana?.tersembunyi).toBe(true)
    expect(lencana?.kosong).toBe(false)
    const video = blok.find((b) => b.jenis === 'video')
    expect(video?.kosong).toBe(true)
  })
  it('pratinjau halaman tambahan yang belum terbit membaca susunan draf', async () => {
    masukSebagai(AKUN_UJI.operator)
    const halaman = { id: 'hlm_prat01', nama: 'sejarah-kampung', judul: 'Sejarah Kampung', blok: [susunBlok({ id: 'blk_teks01', jenis: 'teks' })] }
    const { blok } = await pratinjauSitus({ tema: TEMA, susunan: { ...susunanBawaan(), halaman: [halaman] } }, 'hlm_prat01')
    expect(blok.map((b) => b.jenis)).toEqual(['teks'])
  })
  it('pratinjau halaman tambahan yang tidak ada ditolak 404 dengan pesan persis', async () => {
    masukSebagai(AKUN_UJI.operator)
    const g = await galatDari(pratinjauSitus({ tema: TEMA, susunan: susunanBawaan() }, 'hlm_nope01'))
    expect(g).toMatchObject({ kode: 'NOT_FOUND', status: 404, message: 'Halaman tidak ditemukan.' })
  })
  it('PUT /website/situs/tema sudah dihapus: tidak ada handler dan permintaan tidak dijawab', async () => {
    expect(handlerWebsite.some((h) => h.info.method === 'PUT' && String(h.info.path).includes('/website/situs/tema'))).toBe(false)
    masukSebagai(AKUN_UJI.operator)
    const respons = await fetch('http://localhost/api/v1/website/situs/tema', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer demo.pgn_rosmiati' },
      body: JSON.stringify(TEMA),
    }).catch(() => null)
    expect(respons?.ok ?? false).toBe(false)
  })
})

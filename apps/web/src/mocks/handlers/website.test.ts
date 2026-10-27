import { describe, expect, it } from 'vitest'
import { GalatApi } from '@/api/galat'
import { ambilIdentitasPublik } from '@/api/publik'
import { ambilSesi } from '@/api/sesi'
import { ambilSitus, daftarAgenda, daftarArtikel, daftarGaleri, daftarPengumuman, simpanDraf, terbitkan } from '@/api/website'
import { pasangTema } from '@/domain/website/galeri-dasar'
import { susunanBawaan } from '@/domain/website/susunan'
import { TEMA_WARTA_BAWAAN, type TemaDasar } from '@/domain/website/tema'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'

pakaiApiTiruan({ dbSegarTiapUji: true })

const TEMA = TEMA_WARTA_BAWAAN('#1F4E79')
const PNG_KECIL = `data:image/png;base64,${'A'.repeat(1364)}`

/** Simpan tema lewat alur draf (7F-2): `PUT /website/situs/draf` lalu `terbitkan`. */
const simpanDanTerbitkan = async (tema: TemaDasar) => {
  await simpanDraf(null, { tema, susunan: susunanBawaan() })
  return terbitkan(null)
}

async function galatDari(janji: Promise<unknown>): Promise<GalatApi> {
  try {
    await janji
  } catch (e) {
    if (e instanceof GalatApi) return e
    throw e
  }
  throw new Error('Seharusnya gagal')
}

describe('Website Desa (SPEC §8)', () => {
  it('Operator dan Sekdes boleh mengelola; Kepala Desa, Kaur Keuangan, dan Kepala Dusun ditolak (fokus review 1)', async () => {
    for (const akun of [AKUN_UJI.operator, AKUN_UJI.sekdes]) {
      masukSebagai(akun)
      expect((await daftarArtikel()).meta.total).toBe(12)
    }
    for (const akun of [AKUN_UJI.kades, AKUN_UJI.kaurKeuangan, AKUN_UJI.kadus]) {
      masukSebagai(akun)
      expect((await galatDari(daftarArtikel())).kode).toBe('FORBIDDEN')
      expect((await galatDari(ambilSitus())).kode).toBe('FORBIDDEN')
    }
  })
  it('artikel terbaru dulu; pengumuman, agenda terdekat dulu, dan 15 foto galeri', async () => {
    masukSebagai(AKUN_UJI.operator)
    const artikel = (await daftarArtikel()).data
    expect(artikel[0].judul).toBe('Hasil Musrenbangdes: 5 Usulan Prioritas untuk 2027')
    expect(artikel.map((a) => a.tanggal)).toEqual(artikel.map((a) => a.tanggal).sort().reverse())
    expect((await daftarPengumuman()).meta.total).toBe(4)
    const agenda = (await daftarAgenda()).data
    expect(agenda.map((a) => a.judul)).toEqual([
      'Gotong Royong Parit RT 006-007', 'Penyaluran BLT Dana Desa Tahap III', 'Musyawarah Desa Penyusunan RKPDes 2027',
      'Rapat Pleno BPD', 'Pelatihan Pengolahan Ikan Salai BUMDes',
    ])
    expect((await daftarGaleri()).meta.total).toBe(15)
  })
  it('situs: Sungai Sialang memakai tema dari tampilan v0.1', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    const { terbit } = await ambilSitus()
    expect(terbit.tema).toMatchObject({
      warnaUtama: '#1F4E79', warnaAksen: '#1F4E79', motif: 'pucuk-rebung', huruf: 'plex', latar: 'kertas', sudut: 'tajam', kepadatan: 'lega',
      sampul: '/demo/foto/sampul-sungai-kampar.jpg', logo: null, warga: { fotoLatar: null, sambutan: null },
    })
  })
  it('PUT draf lalu terbitkan: tema sah dan website publik ikut berubah', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    const tema: TemaDasar = { ...TEMA, warnaUtama: '#2F5D3A', warnaAksen: '#4A6B2F', huruf: 'fraunces', logo: PNG_KECIL, motif: 'mega-mendung' }
    const baru = await simpanDanTerbitkan(tema)
    expect(baru.tema).toEqual(tema)
    expect(baru.oleh).toEqual({ id: 'pgn_hendri', nama: 'Hendri Saputra' })
    expect(baru.diperbarui.startsWith('2026-09-24T09:00')).toBe(true)
    expect((await ambilSitus()).terbit.tema.warnaUtama).toBe('#2F5D3A')
    const publik = await ambilIdentitasPublik('sungaisialang')
    expect(publik.tema).toMatchObject({ warnaUtama: '#2F5D3A', huruf: 'fraunces', motif: 'mega-mendung' })
    expect(publik.tema).not.toHaveProperty('warga')
  })
  it('idGaleri dihitung server: tema galeri terpasang ditandai, satu pengaturan diubah → null (7E-2)', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    expect((await ambilSitus()).terbit.tema).toMatchObject({ idGaleri: 'warta', kepala: 'warta', foto: 'bingkai' })
    const pesisir = await simpanDanTerbitkan(pasangTema(TEMA, 'pesisir'))
    expect(pesisir.tema).toMatchObject({ idGaleri: 'pesisir', huruf: 'literata', kepala: 'pita', foto: 'penuh' })
    expect((await ambilIdentitasPublik('sungaisialang')).tema).toMatchObject({ idGaleri: 'pesisir', kepala: 'pita' })
    const diubah = await simpanDanTerbitkan({ ...pesisir.tema, sudut: 'tajam' })
    expect(diubah.tema.idGaleri).toBeNull()
    // Isian idGaleri dari klien tidak dipercaya.
    const palsu = await simpanDanTerbitkan({ ...pesisir.tema, sudut: 'tajam', idGaleri: 'tenun' })
    expect(palsu.tema.idGaleri).toBeNull()
  })
  it('API menolak walau layar dilewati: #FFD400 → 422 field warnaUtama dengan pesan persis (fokus review 2)', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    const g = await galatDari(simpanDraf(null, { tema: { ...TEMA, warnaUtama: '#FFD400' }, susunan: susunanBawaan() }))
    expect(g).toMatchObject({ kode: 'VALIDATION', fields: { warnaUtama: 'Kontras warna utama di atas latar 1,3 : 1; perlu paling sedikit 4,5 : 1.' } })
    expect((await ambilSitus()).terbit.tema.warnaUtama).toBe('#1F4E79')
  })
  it('aksen terlalu terang → 422 field warnaAksen', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    const g = await galatDari(simpanDraf(null, { tema: { ...TEMA, warnaAksen: '#F5F5F5' }, susunan: susunanBawaan() }))
    expect(g.fields?.warnaAksen).toMatch(/^Kontras warna aksen di atas latar 1,\d : 1; perlu paling sedikit 3 : 1\.$/)
  })
  it('kode warna rusak, sambutan 121 karakter, dan sampul bukan gambar ditolak dengan pesan persis', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    const kirim = (t: unknown) => simpanDraf(null, { tema: t as TemaDasar, susunan: susunanBawaan() })
    expect((await galatDari(kirim({ ...TEMA, warnaUtama: '#12345' }))).fields?.warnaUtama).toBe('Kode warna harus berbentuk #RRGGBB.')
    expect((await galatDari(kirim({ ...TEMA, warga: { fotoLatar: null, sambutan: 'x'.repeat(121) } }))).fields?.['warga.sambutan']).toBe(
      'Kalimat sambutan paling banyak 120 karakter.',
    )
    const g = await galatDari(kirim({ ...TEMA, sampul: 'data:text/plain;base64,QUJD' }))
    expect(g.fields?.sampul).toBe('Foto sampul harus gambar PNG, JPG, WebP, atau SVG, paling besar 1500 KB.')
  })
  it('Kades ditolak', async () => {
    masukSebagai(AKUN_UJI.kades)
    expect((await galatDari(simpanDraf(null, { tema: TEMA, susunan: susunanBawaan() }))).kode).toBe('FORBIDDEN')
  })
  it('sesi panel membawa tampilanPanel (aksen dan favicon) yang mengikuti tema', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    expect((await ambilSesi()).tampilanPanel).toEqual({ warnaAksen: '#1F4E79', favicon: null })
    await simpanDanTerbitkan({ ...TEMA, warnaUtama: '#2F5D3A', warnaAksen: '#4A6B2F' })
    expect((await ambilSesi()).tampilanPanel).toEqual({ warnaAksen: '#4A6B2F', favicon: null })
  })
})

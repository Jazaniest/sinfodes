import { describe, expect, it } from 'vitest'
import { GalatApi } from '@/api/galat'
import { ambilTampilan, daftarAgenda, daftarArtikel, daftarGaleri, daftarPengumuman, simpanTampilan } from '@/api/website'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'

pakaiApiTiruan({ dbSegarTiapUji: true })

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

describe('Website Desa (SPEC §8)', () => {
  it('Operator dan Sekdes boleh mengelola; Kepala Desa, Kaur Keuangan, dan Kepala Dusun ditolak (fokus review 1)', async () => {
    for (const akun of [AKUN_UJI.operator, AKUN_UJI.sekdes]) {
      masukSebagai(akun)
      expect((await daftarArtikel()).meta.total).toBe(12)
    }
    for (const akun of [AKUN_UJI.kades, AKUN_UJI.kaurKeuangan, AKUN_UJI.kadus]) {
      masukSebagai(akun)
      expect((await galatDari(daftarArtikel())).kode).toBe('FORBIDDEN')
      expect((await galatDari(ambilTampilan())).kode).toBe('FORBIDDEN')
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
      'Gotong Royong Parit RT 006–007', 'Penyaluran BLT Dana Desa Tahap III', 'Musyawarah Desa Penyusunan RKPDes 2027',
      'Rapat Pleno BPD', 'Pelatihan Pengolahan Ikan Salai BUMDes',
    ])
    expect((await daftarGaleri()).meta.total).toBe(15)
  })
  it('tampilan: aksen, motif, dan logo tersimpan; sampul yang bukan gambar ditolak tanpa mengubah data (fokus review 4)', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    expect(await ambilTampilan()).toMatchObject({ aksen: 'biru-tinta', motif: 'pucuk-rebung', sampul: null, logo: null })
    const baru = await simpanTampilan({ aksen: 'teal-sungai', motif: 'garis', sampul: null, logo: PNG_KECIL })
    expect(baru).toMatchObject({ aksen: 'teal-sungai', motif: 'garis', logo: PNG_KECIL })
    expect(baru.diperbarui.startsWith('2026-09-24T09:00')).toBe(true)
    const g = await galatDari(simpanTampilan({ aksen: 'merah-bata', motif: 'garis', sampul: 'data:text/plain;base64,QUJD', logo: null }))
    expect(g).toMatchObject({ kode: 'VALIDATION', fields: { sampul: 'Foto sampul harus gambar PNG, JPG, WebP, atau SVG, paling besar 1500 KB.' } })
    expect((await ambilTampilan()).aksen).toBe('teal-sungai')
  })
})

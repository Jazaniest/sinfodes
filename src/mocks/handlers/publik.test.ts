import { describe, expect, it } from 'vitest'
import {
  ambilArtikelPublik, ambilBerandaPublik, ambilIdentitasPublik, ambilKreditFotoPublik, ambilLayananPublik, daftarKabarPublik,
} from '@/api/publik'
import { pakaiApiTiruan } from '@/test/api-tiruan'

pakaiApiTiruan()

describe('API website publik (SPEC §9, §3.4)', () => {
  it('identitas dan tampilan desa, tanpa sesi', async () => {
    expect(await ambilIdentitasPublik('sungaisialang')).toMatchObject({
      slug: 'sungaisialang', nama: 'Sungai Sialang', kecamatan: { nama: 'Teluk Meranti' }, kabupaten: { nama: 'Pelalawan' },
      telepon: '081266031140', aksen: 'biru-tinta', motif: 'pucuk-rebung', logo: null,
    })
  })
  it('slug asing dan desa yang belum aktif → "Website desa tidak ditemukan." (fokus review 4)', async () => {
    await expect(ambilIdentitasPublik('tanjunglamo')).rejects.toMatchObject({ kode: 'NOT_FOUND', message: 'Website desa tidak ditemukan.' })
    await expect(ambilBerandaPublik('desa-antah-berantah')).rejects.toMatchObject({ kode: 'NOT_FOUND' })
  })
  it('beranda: berita utama terbaru yang berfoto, 4 kabar terbaru, pengumuman berlaku, agenda mendatang, angka desa, sampul', async () => {
    const b = await ambilBerandaPublik('sungaisialang')
    expect(b.utama).toMatchObject({
      judul: 'Penyaluran BLT Tahap III Dijadwalkan 30 September',
      foto: { berkas: '/demo/foto/penyaluran-bantuan.jpg', keterangan: 'Penyaluran bantuan', kredit: 'Sakila Karema · CC0' },
    })
    expect(b.terbaru.map((a) => a.judul)).toEqual([
      'Semenisasi Jalan Dusun III Capai 70 Persen', 'Layanan Surat Kini Bisa Diajukan dari HP',
      'Kelas Ibu Balita: Cegah Stunting dari Dapur Sendiri', 'BUMDes Sialang Makmur Mulai Pasarkan Ikan Salai Selais',
    ])
    expect(b.terbaru.find((a) => a.judul.startsWith('Kelas Ibu'))?.foto).toBeNull()
    expect(b.pengumuman).toHaveLength(3)
    expect(b.agenda).toHaveLength(5)
    expect(b.agenda.map((a) => a.tanggal)).toEqual([...b.agenda.map((a) => a.tanggal)].sort())
    expect(b.agenda[0]).not.toHaveProperty('desaId')
    expect(b.angka).toMatchObject({ dusun: 4, luasKm2: 48.6 })
    expect(b.angka.jiwa).toBeGreaterThan(b.angka.kk)
    expect(b.angka.rt).toBeGreaterThanOrEqual(b.angka.dusun)
    expect(b.sampul).toEqual({ berkas: '/demo/foto/sampul-sungai-kampar.jpg', keterangan: 'Lanskap Sungai Kampar', kredit: 'M Zai Ar · CC BY-SA 4.0' })
  })
  it('kabar: hanya yang terbit, terbaru dulu; filter kategori; draf tidak bisa dibuka lewat alamatnya (fokus review 4)', async () => {
    const semua = await daftarKabarPublik('sungaisialang', null)
    expect(semua.data).toHaveLength(10)
    expect(semua.data[0].judul).toBe('Penyaluran BLT Tahap III Dijadwalkan 30 September')
    expect(semua.data.map((a) => a.judul)).not.toContain('Festival Bono Teluk Meranti, Warga Siapkan Homestay')
    const budaya = await daftarKabarPublik('sungaisialang', 'Budaya')
    expect(budaya.data.map((a) => a.judul)).toEqual(['Tradisi Menumbai: Panen Madu Sialang Kembali Digelar'])
    const a = await ambilArtikelPublik('sungaisialang', 'tradisi-menumbai-panen-madu-sialang-kembali-digelar')
    expect(a).toMatchObject({ penulis: 'Rosmiati', kategori: 'Budaya', foto: { berkas: '/demo/foto/madu-sialang.jpg' } })
    expect(a.isi).toHaveLength(4)
    await expect(ambilArtikelPublik('sungaisialang', 'festival-bono-teluk-meranti-warga-siapkan-homestay')).rejects.toMatchObject({
      kode: 'NOT_FOUND', message: 'Kabar tidak ditemukan.',
    })
  })
  it('layanan: jenis surat online beserta syarat dan perkiraan waktu; jadwal posyandu setiap dusun yang akan datang', async () => {
    const l = await ambilLayananPublik('sungaisialang')
    expect(l.jenisSurat.map((j) => j.kode)).toContain('SKTM')
    expect(l.jenisSurat.find((j) => j.kode === 'SKD')?.syarat).toEqual(['KTP', 'KK', 'Pengantar RT'])
    expect(l.jenisSurat.every((j) => j.perkiraanHariKerja === null || j.perkiraanHariKerja >= 0)).toBe(true)
    expect(l.posyandu).toHaveLength(4)
    expect(l.posyandu.every((p) => p.jadwal >= '2026-09-24')).toBe(true)
    expect(l.posyandu[0]).toMatchObject({ nama: 'Posyandu Melati', dusun: 'Dusun I Kampung Tengah' })
  })
  it('kredit foto: 15 foto dengan judul asli, sumber, pembuat, dan lisensi', async () => {
    const k = await ambilKreditFotoPublik('sungaisialang')
    expect(k).toHaveLength(15)
    expect(k.find((f) => f.berkas === '/demo/foto/ombak-bono.jpg')).toMatchObject({
      keterangan: 'Ombak Bono di Teluk Meranti', judulAsli: 'Bekudo Bono.jpg', pembuat: 'Domiyanto1977', lisensi: 'CC BY-SA 4.0',
    })
  })
})

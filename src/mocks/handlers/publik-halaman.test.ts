import { describe, expect, it } from 'vitest'
import { ambilBerandaPublik } from '@/api/publik'
import { ambilPotensiPublik, ambilProfilPublik, ambilStatistikPublik, ambilTransparansiPublik } from '@/api/publik-halaman'
import { ambilStatistikPenduduk } from '@/api/statistik'
import { ubahDb } from '@/mocks/db'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'

pakaiApiTiruan({ dbSegarTiapUji: true })

/** Tanggapan mentah API tiruan, sebelum dirapikan skema Zod di klien. */
const mentah = async (jalur: string) => (await fetch(new URL(`/api/v1/publik/sungai-sialang${jalur}`, window.location.origin))).text()

describe('API halaman website desa (SPEC §9, §3.4)', () => {
  it('profil: foto kantor desa, sejarah, visi-misi, geografi, dusun, peta, perangkat, dan lembaga', async () => {
    const p = await ambilProfilPublik('sungai-sialang')
    expect(p.foto).toEqual({ berkas: '/demo/foto/kantor-desa.jpg', keterangan: 'Kantor Desa Sungai Sialang', kredit: expect.stringContaining(' · ') })
    expect(p.sejarah).toHaveLength(3)
    expect(p.visi).toMatch(/^Terwujudnya Desa Sungai Sialang/)
    expect(p.misi).toHaveLength(5)
    expect(p).toMatchObject({ luasKm2: 48.6, batas: { utara: 'Sungai Kampar' }, istilah: { dusun: 'Dusun', rw: 'RW', rt: 'RT' } })
    expect(p.jarak).toEqual([
      { ke: 'ibu kota kecamatan', tempat: 'Teluk Meranti', km: 14 },
      { ke: 'ibu kota kabupaten', tempat: 'Pangkalan Kerinci', km: 152 },
    ])
    expect(p.wilayah[0]).toEqual({ id: 'dsn_ss_1', nama: 'Dusun I Kampung Tengah', kepala: 'Amran', rw: 2, rt: 5 })
    expect(p.peta?.fasilitas.map((f) => f.nama)).toContain('Kantor Desa')
    expect(p.peta?.kegiatan).toHaveLength(7)
    expect(p.perangkat[0]).toEqual({ jabatan: 'Kepala Desa', nama: 'H. Muhammad Nasir', masaBakti: '2021–2029' })
    expect(p.lembaga.map((l) => l.lembaga)).toEqual(['bpd', 'lpm', 'pkk', 'karang-taruna', 'rt-rw', 'kader-posyandu', 'linmas', 'bumdes'])
    expect(p.lembaga[0]).toMatchObject({ nama: 'Badan Permusyawaratan Desa' })
    expect(p.lembaga[0].pengurus).toHaveLength(7)
  })
  it('transparansi: APBDes terbaru, dan 7 kegiatan (berjalan dulu) dengan anggaran dari APBDes dan foto dokumentasi berkredit', async () => {
    const t = await ambilTransparansiPublik('sungai-sialang')
    expect(t.apbdes?.tahun).toBe(2026)
    expect(t.apbdes?.pos.filter((p) => p.kelompok === 'pendapatan' && p.induk === null)).toHaveLength(5)
    expect(t.kegiatan.map((k) => k.status)).toEqual(['berjalan', 'berjalan', 'berjalan', 'perencanaan', 'selesai', 'selesai', 'selesai'])
    expect(t.kegiatan[0]).toMatchObject({
      id: 'kgt_ss_01', nama: 'Semenisasi jalan lingkungan Dusun III', volume: '450 m', anggaran: 245_000_000, progresFisik: 70,
    })
    expect(t.kegiatan[0].dokumentasi.map((d) => d.foto?.kredit ?? null)).toEqual(['sugeng widodo · CC BY-SA 3.0', 'SATELIT BM · CC BY-SA 4.0'])
  })
  it('statistik dan angka Beranda sama dengan Statistik panel admin, dan kelahiran baru langsung terhitung (fokus review 3, alur demo 2)', async () => {
    masukSebagai(AKUN_UJI.operator)
    const admin = await ambilStatistikPenduduk(null)
    const s = await ambilStatistikPublik('sungai-sialang')
    expect(s).toMatchObject({ tanggal: '2026-09-24', jiwa: admin.jiwa, laki: admin.laki, perempuan: admin.perempuan, kk: admin.kk })
    expect(s.agama).toEqual(admin.agama.map(({ label, jumlah }) => ({ label, jumlah })))
    expect((await ambilBerandaPublik('sungai-sialang')).angka).toMatchObject({ jiwa: admin.jiwa, kk: admin.kk })
    ubahDb((d) => {
      const ibu = d.penduduk.find((p) => p.id === 'pdk_siti_rahmah')
      if (!ibu) throw new Error('Siti Rahmah tidak ada')
      d.penduduk.push({ ...structuredClone(ibu), id: 'pdk_bayi_uji', nik: null, nama: 'Bayi Uji', tanggalLahir: '2026-09-23' })
    })
    const sesudah = await ambilStatistikPublik('sungai-sialang')
    expect(sesudah.jiwa).toBe(s.jiwa + 1)
    expect(sesudah.piramida[0].perempuan).toBe(s.piramida[0].perempuan + 1)
  })
  it('potensi: 6 potensi berfoto urut, dan 5 UMKM dengan nama dusun dan WhatsApp', async () => {
    const p = await ambilPotensiPublik('sungai-sialang')
    expect(p.potensi.map((x) => x.id)).toEqual(['ptn_ss_01', 'ptn_ss_02', 'ptn_ss_03', 'ptn_ss_04', 'ptn_ss_05', 'ptn_ss_06'])
    expect(p.potensi[0]).toMatchObject({
      judul: 'Madu sialang', kategori: 'Hasil hutan',
      foto: { berkas: '/demo/foto/madu-sialang.jpg', keterangan: 'Panen madu sialang', kredit: 'Zhilal Darma · CC BY-SA 4.0' },
    })
    expect(p.umkm).toHaveLength(5)
    expect(p.umkm.find((u) => u.pemilik === 'Zulkifli')).toMatchObject({
      nama: 'Toko Bangunan Rengas Jaya', dusun: 'Dusun III Teluk Rengas', whatsapp: '081371185570',
    })
  })
  it('beranda: cuplikan APBDes terbaru dan potensi desa (SPEC §9)', async () => {
    const b = await ambilBerandaPublik('sungai-sialang')
    expect(b.apbdes).toMatchObject({ tahun: 2026, pendapatan: { anggaran: 1_826_650_000 }, belanja: { anggaran: 1_866_650_000 } })
    expect(b.apbdes?.pendapatan.realisasi).toBeGreaterThan(0)
    expect(b.potensi).toHaveLength(6)
    expect(b.potensi[0]).toEqual({
      id: 'ptn_ss_01', judul: 'Madu sialang', kategori: 'Hasil hutan',
      foto: { berkas: '/demo/foto/madu-sialang.jpg', keterangan: 'Panen madu sialang', kredit: 'Zhilal Darma · CC BY-SA 4.0' },
    })
  })
  it('desa yang belum melengkapi isinya: bagian kosong atau null, bukan galat (fokus review 1)', async () => {
    ubahDb((d) => {
      d.profilDesa = []
      d.peta = []
      d.apbdes = []
      d.kegiatan = []
      d.potensi = []
      d.umkm = []
    })
    const p = await ambilProfilPublik('sungai-sialang')
    expect(p).toMatchObject({ foto: null, sejarah: [], visi: null, misi: [], jarak: [], peta: null })
    expect(p.perangkat.length).toBeGreaterThan(0)
    expect(await ambilTransparansiPublik('sungai-sialang')).toEqual({ apbdes: null, kegiatan: [] })
    expect(await ambilPotensiPublik('sungai-sialang')).toEqual({ potensi: [], umkm: [] })
    expect(await ambilBerandaPublik('sungai-sialang')).toMatchObject({ apbdes: null, potensi: [] })
  })
  it('desa yang websitenya belum dibuka → NOT_FOUND', async () => {
    await expect(ambilProfilPublik('tanjung-lamo')).rejects.toMatchObject({ kode: 'NOT_FOUND' })
    await expect(ambilStatistikPublik('desa-antah-berantah')).rejects.toMatchObject({ kode: 'NOT_FOUND' })
  })
  it('tanggapan mentah tidak memuat NIK, nomor KK, tanggal lahir, atau rujukan data penduduk (fokus review 3)', async () => {
    for (const jalur of ['/profil', '/transparansi', '/statistik', '/potensi', '/beranda']) {
      const teks = await mentah(jalur)
      expect(teks, jalur).not.toMatch(/"(nik|noKk|nomorKk|pendudukId|tanggalLahir|kunci)"/)
      expect(teks, jalur).not.toMatch(/\d{16}/)
    }
  })
})

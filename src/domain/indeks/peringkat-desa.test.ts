import { describe, expect, it } from 'vitest'
import { alasanBukanPeserta, susunSaran, type HitunganSaran } from './peringkat-desa'

const HARI_INI = '2026-09-24'
const aman: HitunganSaran = {
  suratTtdLama: 0,
  suratMenungguLama: 0,
  pengaduanBaru: 0,
  pendudukBelumLengkap: 0,
  apbdesSinkron: '2026-09-10T08:00:00+07:00',
  kegiatanTanpaKabar: 0,
  suratMasukBulanIni: 4,
  persenOnline: 10,
  adaKabarMingguIni: true,
  serapan: 90,
}

describe('susunSaran (rencana 7C-2 Global Constraints)', () => {
  it('tanpa masalah: tidak ada saran', () => {
    expect(susunSaran(aman, {}, HARI_INI)).toEqual([])
  })
  it('kalimat dan tautan persis untuk setiap baris tabel', () => {
    const semua: HitunganSaran = {
      suratTtdLama: 2,
      suratMenungguLama: 1234,
      pengaduanBaru: 3,
      pendudukBelumLengkap: 5,
      apbdesSinkron: '2026-08-01T08:00:00+07:00',
      kegiatanTanpaKabar: 2,
      suratMasukBulanIni: 20,
      persenOnline: 12.4,
      adaKabarMingguIni: false,
      serapan: 61.6,
    }
    const saran = susunSaran(semua, {}, HARI_INI)
    expect(saran).toHaveLength(5)
    const penuh = susunSaran(semua, { layanan: 90, responsif: 90, data: 90, transparan: 90, digital: 90, website: 90, serapan: 90 }, HARI_INI)
    expect(penuh).toHaveLength(5)
    const per = (h: Partial<HitunganSaran>) => susunSaran({ ...aman, ...h }, {}, HARI_INI)
    expect(per({ suratTtdLama: 2 })).toEqual([{ kategori: 'layanan', kalimat: '2 surat menunggu tanda tangan lebih dari 2 hari', href: '/admin/surat' }])
    expect(per({ suratMenungguLama: 1234 })).toEqual([{ kategori: 'layanan', kalimat: '1.234 permohonan belum diproses lebih dari 1 hari', href: '/admin/surat' }])
    expect(per({ pengaduanBaru: 3 })).toEqual([{ kategori: 'responsif', kalimat: '3 pengaduan belum dibalas', href: '/admin/pengaduan' }])
    expect(per({ pendudukBelumLengkap: 5 })).toEqual([{ kategori: 'data', kalimat: 'Data 5 penduduk belum lengkap', href: '/admin/kependudukan/penduduk' }])
    expect(per({ apbdesSinkron: '2026-08-01T08:00:00+07:00' })).toEqual([
      { kategori: 'transparan', kalimat: 'Realisasi APBDes terakhir disinkronkan 1 Agustus 2026', href: '/admin/keuangan' },
    ])
    expect(per({ kegiatanTanpaKabar: 2 })).toEqual([
      { kategori: 'transparan', kalimat: '2 kegiatan pembangunan belum punya kabar kemajuan bulan ini', href: '/admin/pembangunan' },
    ])
    expect(per({ suratMasukBulanIni: 20, persenOnline: 12.4 })).toEqual([
      { kategori: 'digital', kalimat: 'Baru 12% surat bulan ini diajukan warga lewat layanan mandiri', href: '/admin/surat' },
    ])
    expect(per({ adaKabarMingguIni: false })).toEqual([{ kategori: 'website', kalimat: 'Belum ada kabar atau pengumuman minggu ini', href: '/admin/website' }])
    expect(per({ serapan: 61.6 })).toEqual([{ kategori: 'serapan', kalimat: 'Realisasi belanja 62% dari target berjalan', href: '/admin/keuangan' }])
  })
  it('saran digital tidak muncul bila surat masuk kurang dari 10 atau sudah 25% online', () => {
    expect(susunSaran({ ...aman, suratMasukBulanIni: 9, persenOnline: 0 }, {}, HARI_INI)).toEqual([])
    expect(susunSaran({ ...aman, suratMasukBulanIni: 10, persenOnline: 25 }, {}, HARI_INI)).toEqual([])
    expect(susunSaran({ ...aman, suratMasukBulanIni: 10, persenOnline: 24.9 }, {}, HARI_INI)).toHaveLength(1)
  })
  it('APBDes tanpa data atau disinkronkan tepat 35 hari lalu tidak memunculkan saran', () => {
    expect(susunSaran({ ...aman, apbdesSinkron: null }, {}, HARI_INI)).toEqual([])
    expect(susunSaran({ ...aman, apbdesSinkron: '2026-08-20T00:00:00+07:00' }, {}, HARI_INI)).toEqual([])
    expect(susunSaran({ ...aman, apbdesSinkron: '2026-08-19T23:00:00+07:00' }, {}, HARI_INI)).toHaveLength(1)
  })
  it('paling banyak 5 dan berurutan dari skor terendah (null dianggap 0)', () => {
    const semua: HitunganSaran = {
      suratTtdLama: 2, suratMenungguLama: 1, pengaduanBaru: 3, pendudukBelumLengkap: 5, apbdesSinkron: '2026-08-01T08:00:00+07:00',
      kegiatanTanpaKabar: 2, suratMasukBulanIni: 20, persenOnline: 12, adaKabarMingguIni: false, serapan: 50,
    }
    const saran = susunSaran(semua, { layanan: 80, responsif: 70, data: 60, transparan: 50, digital: 40, website: null, serapan: 30 }, HARI_INI)
    expect(saran.map((s) => s.kategori)).toEqual(['website', 'serapan', 'digital', 'transparan', 'transparan'])
  })
})

describe('alasanBukanPeserta', () => {
  it('kalimat persis', () => {
    expect(alasanBukanPeserta('Tanjung Lamo')).toBe('Desa Tanjung Lamo belum ikut peringkat. Peringkat diikuti desa berstatus Aktif sepanjang periode.')
  })
})

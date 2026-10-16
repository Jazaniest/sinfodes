// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { ambilBeranda } from '@/api/beranda'
import { ambilIsiBuku } from '@/api/buku'
import { ambilKeluarga } from '@/api/keluarga'
import { ambilApbdes } from '@/api/keuangan'
import { ambilPemantauan } from '@/api/konsol'
import { catatLahir } from '@/api/mutasi'
import { daftarPengaduan } from '@/api/pengaduan'
import { daftarPenduduk } from '@/api/penduduk'
import { verifikasiSurat } from '@/api/publik'
import { ambilStatistikPublik } from '@/api/publik-halaman'
import { ambilStatistikPenduduk } from '@/api/statistik'
import { daftarPermohonan, jalankanAksi } from '@/api/surat'
import { ambilRiwayatWarga, kirimPermohonanWarga } from '@/api/warga'
import { tanggalIsoWib } from '@/domain/format/tanggal'
import { jumlahKelompok } from '@/domain/keuangan/schema'
import { bulatJam, median } from '@/domain/konsol/pemantauan'
import type { MasukanLahir } from '@/domain/mutasi/masukan'
import { ambilDb } from '@/mocks/db'
import {
  AKUN_KONSOL_UJI, AKUN_UJI, AKUN_WARGA_UJI, masukKonsolSebagai, masukSebagai, masukSebagaiWarga, pakaiApiTiruan, SEKARANG_UJI,
} from '@/test/api-tiruan'

pakaiApiTiruan({ dbSegarTiapUji: true })

const HARI_MS = 86_400_000
const jamAntara = (dari: string, sampai: string) => (Date.parse(sampai) - Date.parse(dari)) / 3_600_000
const foto = (nama: string) => new File([new Uint8Array(200 * 1024)], nama, { type: 'image/jpeg' })

/** Semua halaman satu daftar admin, 100 baris per halaman. */
async function semuaHalaman<T>(ambil: (page: number) => Promise<{ data: T[]; meta: { total: number } }>): Promise<T[]> {
  const hasil: T[] = []
  for (let page = 1; ; page++) {
    const { data, meta } = await ambil(page)
    hasil.push(...data)
    if (data.length === 0 || hasil.length >= meta.total) return hasil
  }
}

const LAHIR: MasukanLahir = {
  ibuId: 'pdk_siti_rahmah',
  ayahId: 'pdk_syahrial',
  pelapor: 'Syahrial',
  bayi: {
    nama: 'Aisyah Putri', jenisKelamin: 'P', tempatLahir: 'Pelalawan', tanggalLahir: '2026-09-20', jam: '04:15',
    tempatDilahirkan: 'Puskesmas', jenisKelahiran: 'Tunggal', anakKe: 3, penolong: 'Bidan/Perawat', beratGram: 3100, panjangCm: 49,
  },
}

describe('tiga alur demo kriteria selesai tahap 1 (SPEC §13.5)', () => {
  it('1. SKTM dari HP sampai verifikasi QR', async () => {
    const sktm = ambilDb().jenisSurat.find((j) => j.desaId === 'desa_sungai_sialang' && j.kode === 'SKTM')
    if (!sktm) throw new Error('Jenis SKTM tidak ada')
    // 1. Siti Rahmah mengajukan SKTM dari layanan warga.
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    const { id } = await kirimPermohonanWarga(
      {
        kunci: 'alur-demo-sktm-0001', jenisId: sktm.id, untukId: AKUN_WARGA_UJI.siti,
        isian: { keperluan: 'Pendidikan', instansiTujuan: 'SMA Negeri 1 Teluk Meranti' },
        lampiran: [{ syarat: 'KTP' }, { syarat: 'KK' }, { syarat: 'Pengantar RT' }],
      },
      [foto('ktp.jpg'), foto('kk.jpg'), foto('pengantar-rt.jpg')],
    )
    expect((await ambilRiwayatWarga(id)).permohonan.status).toBe('menunggu')
    // 2. Operator memprosesnya, lalu Sekdes memaraf.
    masukSebagai(AKUN_UJI.operator)
    expect((await jalankanAksi(id, 'proses')).permohonan.status).toBe('diproses')
    expect((await jalankanAksi(id, 'ajukan-ttd')).permohonan).toMatchObject({ status: 'perlu-ttd', tahap: 'paraf' })
    masukSebagai(AKUN_UJI.sekdes)
    expect((await jalankanAksi(id, 'paraf')).permohonan).toMatchObject({ status: 'perlu-ttd', tahap: 'tanda-tangan' })
    // 3. Kades menandatangani (tampilan HP-nya diperiksa di panel browser, Tugas 7).
    masukSebagai(AKUN_UJI.kades)
    expect((await jalankanAksi(id, 'tandatangani', { passphrase: 'sialang2026' })).permohonan.status).toBe('selesai')
    // 4. Siti melihat status Selesai dan suratnya.
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    const riwayat = await ambilRiwayatWarga(id)
    expect(riwayat.permohonan.status).toBe('selesai')
    if (!riwayat.terbit) throw new Error('Surat belum terbit')
    // 5. Kode surat lolos di halaman verifikasi website desa.
    expect(await verifikasiSurat('sungaisialang', riwayat.terbit.kodeVerifikasi)).toMatchObject({
      nomor: riwayat.terbit.nomor,
      berlaku: { status: 'berlaku' },
    })
  })
  it('2. mencatat kelahiran: penduduk dan KK bertambah, bayi tanpa NIK; Statistik, Buku Mutasi, Buku hari ini, dan website berubah', async () => {
    masukSebagai(AKUN_UJI.operator)
    const jiwaAwal = (await ambilStatistikPenduduk(null)).jiwa
    const jiwaWebAwal = (await ambilStatistikPublik('sungaisialang')).jiwa
    const anggotaAwal = (await ambilKeluarga('kk_syahrial')).anggota.length
    const mutasiAwal = (await ambilIsiBuku('mutasi-penduduk', { page: 1, pageSize: 25 })).meta.total
    const [bayi] = (await catatLahir(LAHIR)).penduduk
    expect(bayi).toMatchObject({ nik: null, keluargaId: 'kk_syahrial', namaIbu: 'Siti Rahmah' })
    expect((await ambilKeluarga('kk_syahrial')).anggota).toHaveLength(anggotaAwal + 1)
    expect((await ambilStatistikPenduduk(null)).jiwa).toBe(jiwaAwal + 1)
    expect((await ambilIsiBuku('mutasi-penduduk', { page: 1, pageSize: 25 })).meta.total).toBe(mutasiAwal + 1)
    expect((await ambilBeranda()).bukuHariIni?.map((a) => a.ringkasan)).toContain('Kelahiran dicatat · Aisyah Putri')
    expect((await ambilStatistikPublik('sungaisialang')).jiwa).toBe(jiwaWebAwal + 1)
  })
  it('3. pemantau Pelalawan melihat Sungai Sialang dengan angka yang sama dengan panel desanya (fokus review 2)', async () => {
    masukKonsolSebagai(AKUN_KONSOL_UJI.pemantau)
    const ss = (await ambilPemantauan(null)).kecamatan
      .find((k) => k.kecamatan.nama === 'Teluk Meranti')
      ?.desa.find((d) => d.nama === 'Sungai Sialang')
    if (!ss) throw new Error('Sungai Sialang tidak ada di Pemantauan')
    masukSebagai(AKUN_UJI.operator)
    // Kelengkapan: jiwa dikurangi preset Data belum lengkap.
    const jiwa = (await ambilStatistikPenduduk(null)).jiwa
    const belumLengkap = (await daftarPenduduk({ preset: 'data-belum-lengkap' })).meta.total
    expect(ss.jiwa).toBe(jiwa)
    expect(ss.kelengkapan).toBeCloseTo((jiwa - belumLengkap) / jiwa, 10)
    // Surat: daftar Selesai di panel; untuk surat Selesai, ditutupPada adalah waktu terbit.
    const selesai = await semuaHalaman((page) => daftarPermohonan({ status: 'selesai', periode: 365, pageSize: 100, page }))
    const terbit = selesai.flatMap((b) => (b.ditutupPada ? [{ masuk: b.masukPada, terbit: b.ditutupPada }] : []))
    const bulan = tanggalIsoWib(SEKARANG_UJI).slice(0, 7)
    expect(ss.suratBulanIni).toBeGreaterThan(0)
    expect(ss.suratBulanIni).toBe(terbit.filter((t) => tanggalIsoWib(new Date(t.terbit)).startsWith(bulan)).length)
    const batas30 = SEKARANG_UJI.getTime() - 30 * HARI_MS
    expect(ss.waktuLayananJam).toBe(bulatJam(median(terbit.filter((t) => Date.parse(t.terbit) >= batas30).map((t) => jamAntara(t.masuk, t.terbit)))))
    // Pengaduan: daftar Ditanggapi dan Selesai di panel.
    const dibalas = [
      ...(await semuaHalaman((page) => daftarPengaduan({ status: 'ditanggapi', pageSize: 100, page }))),
      ...(await semuaHalaman((page) => daftarPengaduan({ status: 'selesai', pageSize: 100, page }))),
    ]
    const batas90 = SEKARANG_UJI.getTime() - 90 * HARI_MS
    const tanggapan = dibalas.flatMap((a) =>
      a.tanggapanPertamaPada && Date.parse(a.masukPada) >= batas90 ? [jamAntara(a.masukPada, a.tanggapanPertamaPada)] : [],
    )
    expect(ss.waktuTanggapanJam).toBe(bulatJam(median(tanggapan)))
    // APBDes: halaman Keuangan, tahun berjalan.
    expect(ss.apbdes).toEqual(jumlahKelompok(await ambilApbdes(), 'belanja'))
  })
})

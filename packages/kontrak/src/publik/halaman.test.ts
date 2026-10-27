import { describe, expect, it } from 'vitest'
import { tautanWhatsapp } from '../format/whatsapp'
import type { PosApbdes } from '../keuangan/schema'
import type { StatistikPenduduk } from '../statistik/penduduk'
import { pesanUmkm } from './potensi'
import { ringkasLembaga } from './profil'
import { keStatistikPublik } from './statistik'
import { bagianApbdes } from './transparansi'

const pos = (kode: string, kelompok: PosApbdes['kelompok'], nama: string, anggaran: number, realisasi: number, induk: string | null = null): PosApbdes => ({
  kode, induk, kelompok, nama, anggaran, realisasi,
})

describe('aturan halaman website desa (SPEC §9)', () => {
  it('ringkasan lembaga: pengurus pertama beserta jabatannya, dan jumlah pengurus', () => {
    expect(
      ringkasLembaga([
        { jabatan: 'Ketua', nama: 'Siti Aminah', masaBakti: '2021-2029' },
        { jabatan: 'Sekretaris', nama: 'Wan Salmah', masaBakti: '2021-2029' },
      ]),
    ).toBe('Siti Aminah (Ketua) · 2 pengurus')
    expect(ringkasLembaga([{ jabatan: 'Kepala Satuan Linmas', nama: 'Sutrisno', masaBakti: 'sejak 2024' }])).toBe('Sutrisno (Kepala Satuan Linmas)')
  })
  it('APBDes untuk layar dan lembar cetak: pendapatan per sumber, belanja per bidang tanpa rincian kegiatan, dan pembiayaan netto (fokus review 5)', () => {
    const b = bagianApbdes({
      pos: [
        pos('4.1', 'pendapatan', 'Dana Desa', 1_000_000, 800_000),
        pos('4.2', 'pendapatan', 'Alokasi Dana Desa', 600_000, 300_000),
        pos('5.1', 'belanja', 'Penyelenggaraan Pemerintahan Desa', 900_000, 500_000),
        pos('5.2', 'belanja', 'Pelaksanaan Pembangunan Desa', 740_000, 400_000),
        pos('5.2.01', 'belanja', 'Semenisasi jalan', 240_000, 150_000, '5.2'),
        pos('6.1.1', 'pembiayaan-penerimaan', 'SiLPA 2025', 65_000, 65_000),
        pos('6.2.1', 'pembiayaan-pengeluaran', 'Penyertaan modal BUMDes', 25_000, 25_000),
      ],
    })
    expect(b.map((x) => [x.kunci, x.judul])).toEqual([
      ['pendapatan', 'Pendapatan per sumber'], ['belanja', 'Belanja per bidang'], ['pembiayaan', 'Pembiayaan'],
    ])
    expect(b[0].jumlah).toEqual({ label: 'Jumlah pendapatan', nilai: { anggaran: 1_600_000, realisasi: 1_100_000 } })
    expect(b[1].baris.map((r) => r.kode)).toEqual(['5.1', '5.2'])
    expect(b[1].jumlah).toEqual({ label: 'Jumlah belanja', nilai: { anggaran: 1_640_000, realisasi: 900_000 } })
    expect(b[2].baris.map((r) => r.nama)).toEqual(['Penerimaan · SiLPA 2025', 'Pengeluaran · Penyertaan modal BUMDes'])
    expect(b[2].jumlah).toEqual({ label: 'Pembiayaan netto', nilai: { anggaran: 40_000, realisasi: 40_000 } })
  })
  it('statistik publik hanya angka agregat: tanpa kunci filter daftar penduduk dan tanpa KTP-el (fokus review 3)', () => {
    const s: StatistikPenduduk = {
      dusun: null, jiwa: 10, laki: 6, perempuan: 4, kk: 3,
      piramida: [{ label: '0-4', umurMin: 0, umurMax: 4, laki: 1, perempuan: 2 }],
      perDusun: [{ kunci: '1', label: 'Dusun I Kampung Tengah', jumlah: 10 }],
      agama: [{ kunci: 'Islam', label: 'Islam', jumlah: 9 }, { kunci: null, label: 'Belum diisi', jumlah: 1 }],
      pendidikan: [], pekerjaan: [], perkawinan: [],
      ktpEl: [{ kunci: 'Belum rekam', label: 'Belum rekam', jumlah: 1 }],
    }
    const p = keStatistikPublik(s, '2026-09-24')
    expect(p).toMatchObject({ tanggal: '2026-09-24', jiwa: 10, laki: 6, perempuan: 4, kk: 3 })
    expect(p.perDusun).toEqual([{ label: 'Dusun I Kampung Tengah', jumlah: 10 }])
    expect(p.agama).toEqual([{ label: 'Islam', jumlah: 9 }, { label: 'Belum diisi', jumlah: 1 }])
    expect(p).not.toHaveProperty('ktpEl')
    expect(p).not.toHaveProperty('dusun')
    expect(JSON.stringify(p)).not.toContain('kunci')
  })
  it('pesan WhatsApp ke penjual UMKM menyebut usahanya dan website desanya (fokus review 4)', () => {
    expect(pesanUmkm('Madu Sialang Tunas Rimba', 'Sungai Sialang')).toBe(
      'Halo, saya melihat Madu Sialang Tunas Rimba di website Desa Sungai Sialang. Apakah produknya masih tersedia?',
    )
    expect(tautanWhatsapp('081275503418', pesanUmkm('Madu Sialang Tunas Rimba', 'Sungai Sialang'))).toBe(
      'https://wa.me/6281275503418?text=Halo%2C%20saya%20melihat%20Madu%20Sialang%20Tunas%20Rimba%20di%20website%20Desa%20Sungai%20Sialang.%20Apakah%20produknya%20masih%20tersedia%3F',
    )
  })
})

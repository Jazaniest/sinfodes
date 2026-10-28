import { describe, expect, it } from 'vitest'
import type { BarisPenduduk } from '../penduduk/schema'
import type { Mutasi } from '../mutasi/schema'
import type { Dusun } from '../wilayah/schema'
import { KODE_BUKU_PENDUDUK, susunBukuPenduduk, type BahanBukuPenduduk } from './penduduk'

const istilah = { dusun: 'Dusun', rw: 'RW', rt: 'RT' }
const dusun: Dusun[] = [1, 2].map((n) => ({
  id: `dsn_${n}`, desaId: 'desa_a', nomor: n, nama: n === 1 ? 'Tengah' : 'Hilir', kepalaDusun: 'K', posyandu: 'P',
  rw: [{ nomor: '001', ketua: 'R', rt: [{ nomor: '001', ketua: 'T' }, { nomor: '002', ketua: 'T' }] }],
}))

let urut = 0
function orang(sisa: Partial<BarisPenduduk> = {}): BarisPenduduk {
  urut += 1
  return {
    id: `pdk_${urut}`, desaId: 'desa_a', nik: `14050901019000${String(urut).padStart(2, '0')}`, nama: `Orang ${urut}`, jenisKelamin: 'L',
    golonganDarah: 'O', agama: 'Islam', kewarganegaraan: 'WNI', tempatLahir: 'Teluk', tanggalLahir: '1990-01-01', nomorAktaLahir: null,
    keluargaId: 'kk_1', hubunganKeluarga: 'Kepala Keluarga', namaAyah: 'A', namaIbu: 'B', dusunId: 'dsn_1', rw: '001', rt: '001',
    pendidikan: null, pekerjaan: null, statusPerkawinan: null, statusDasar: 'Hidup', statusPenduduk: 'Tetap', ktpEl: 'Sudah rekam',
    telepon: null, catatan: null, dibuatPada: '2026-01-01T08:00:00+07:00', diubahPada: '2026-01-01T08:00:00+07:00',
    nomorKk: '1405090101900001', ...sisa,
  } as BarisPenduduk
}

function mutasi(sisa: Partial<Mutasi> & Pick<Mutasi, 'jenis' | 'tanggal' | 'pendudukIds'>, id: string, dicatatPada: string): Mutasi {
  return {
    id, desaId: 'desa_a', dicatatOleh: { id: 'pgn_1', nama: 'Rosmiati' }, dicatatPada,
    rincian: { tujuan: { provinsi: 'Riau', kabupaten: 'Dumai', kecamatan: 'K', desa: 'D', alamat: '' }, alasan: 'Pekerjaan' },
    ...sisa,
  } as Mutasi
}

function bahan(sisa: Partial<BahanBukuPenduduk> = {}): BahanBukuPenduduk {
  return { hariIni: new Date('2026-09-24T02:00:00Z'), dusun, istilah, penduduk: [], mutasi: [], keluarga: [], ...sisa }
}

describe('susunBukuPenduduk (SPEC Lampiran B)', () => {
  it('lima kode buku penduduk', () => {
    expect([...KODE_BUKU_PENDUDUK]).toEqual(['induk-penduduk', 'mutasi-penduduk', 'rekapitulasi-penduduk', 'penduduk-sementara', 'ktp-kk'])
  })

  it('Buku Induk: hanya penduduk Hidup, urut dusun, RW, RT, nomor KK, kedudukan, lalu tanggal lahir; nomor berurut', () => {
    const anak = orang({ nama: 'Anak', hubunganKeluarga: 'Anak', tanggalLahir: '2010-05-05' })
    const kepala = orang({ nama: 'Kepala', hubunganKeluarga: 'Kepala Keluarga' })
    const dusun2 = orang({ nama: 'Dusun Dua', dusunId: 'dsn_2', nomorKk: '1405090101900000' })
    const wafat = orang({ nama: 'Wafat', statusDasar: 'Meninggal' })
    const isi = susunBukuPenduduk('induk-penduduk', bahan({ penduduk: [dusun2, anak, wafat, kepala] }))
    expect(isi.baris.map((b) => b[1])).toEqual(['Kepala', 'Anak', 'Dusun Dua'])
    expect(isi.baris.map((b) => b[0])).toEqual(['1', '2', '3'])
    expect(isi.kolom[1]).toBe('Nama lengkap')
    expect(isi.diperbarui).toBe('2026-01-01T08:00:00+07:00')
  })

  it('Buku Mutasi: satu baris per orang per kejadian, terlama dulu, nama dan NIK juga untuk yang tidak Hidup', () => {
    const a = orang({ nama: 'Tutup Usia', statusDasar: 'Pindah' })
    const b = orang({ nama: 'Pindah Bersama' })
    const baru = mutasi({ jenis: 'pindah', tanggal: '2026-09-10', pendudukIds: [a.id, b.id] }, 'mts_2', '2026-09-10T09:00:00+07:00')
    const lama = mutasi({ jenis: 'pindah', tanggal: '2026-08-01', pendudukIds: [b.id] }, 'mts_1', '2026-08-01T09:00:00+07:00')
    const isi = susunBukuPenduduk('mutasi-penduduk', bahan({ penduduk: [a, b], mutasi: [baru, lama] }))
    expect(isi.kolom).toEqual(['No', 'Tanggal', 'Jenis mutasi', 'Nama', 'NIK', 'Rincian', 'Dicatat oleh'])
    expect(isi.baris.map((r) => [r[0], r[3]])).toEqual([['1', 'Pindah Bersama'], ['2', 'Tutup Usia'], ['3', 'Pindah Bersama']])
    expect(isi.baris[1][4]).toBe(a.nik)
    expect(isi.baris[0][2]).toBe('Pindah keluar')
    expect(isi.baris[0][5]).toBe('Ke Dumai · Pekerjaan')
    expect(isi.baris[0][6]).toBe('Rosmiati')
    expect(isi.diperbarui).toBe('2026-09-10T09:00:00+07:00')
  })

  it('Rekapitulasi: per dusun lalu Jumlah, mutasi bulan berjalan menurut WIB', () => {
    const l = orang({ jenisKelamin: 'L' })
    const p = orang({ jenisKelamin: 'P' })
    const lain = orang({ jenisKelamin: 'P', dusunId: 'dsn_2' })
    const pindahSep = mutasi({ jenis: 'pindah', tanggal: '2026-09-03', pendudukIds: [lain.id] }, 'mts_1', '2026-09-03T09:00:00+07:00')
    const pindahAgu = mutasi({ jenis: 'pindah', tanggal: '2026-08-03', pendudukIds: [l.id] }, 'mts_2', '2026-08-03T09:00:00+07:00')
    const isi = susunBukuPenduduk(
      'rekapitulasi-penduduk',
      bahan({
        penduduk: [l, p, lain], mutasi: [pindahSep, pindahAgu],
        keluarga: [{ dusunId: 'dsn_1', jumlahAnggota: 2 }, { dusunId: 'dsn_2', jumlahAnggota: 1 }, { dusunId: 'dsn_2', jumlahAnggota: 0 }],
      }),
    )
    expect(isi.baris.map((b) => b[0])).toEqual(['Dusun I Tengah', 'Dusun II Hilir', 'Jumlah'])
    expect(isi.baris[0].slice(1)).toEqual(['1', '1', '2', '1', '0', '0', '0', '0'])
    expect(isi.baris[1].slice(1)).toEqual(['0', '1', '1', '1', '0', '0', '0', '1'])
    expect(isi.baris[2].slice(1)).toEqual(['1', '2', '3', '2', '0', '0', '0', '1'])
  })

  it('Rekapitulasi: 31 Desember 17.30 UTC sudah Januari 2027 menurut WIB', () => {
    const p = orang()
    const des = mutasi({ jenis: 'pindah', tanggal: '2026-12-20', pendudukIds: [p.id] }, 'mts_1', '2026-12-20T09:00:00+07:00')
    const jan = mutasi({ jenis: 'pindah', tanggal: '2027-01-02', pendudukIds: [p.id] }, 'mts_2', '2027-01-02T09:00:00+07:00')
    const isi = susunBukuPenduduk(
      'rekapitulasi-penduduk',
      bahan({ hariIni: new Date('2026-12-31T17:30:00Z'), penduduk: [p], mutasi: [des, jan], keluarga: [{ dusunId: 'dsn_1', jumlahAnggota: 1 }] }),
    )
    expect(isi.baris.at(-1)?.slice(-4)).toEqual(['0', '0', '0', '1'])
  })

  it('Penduduk Sementara: hanya status Sementara; tanpa NIK ditulis "Belum ada NIK"', () => {
    const tetap = orang({ nama: 'Tetap' })
    const sementara = orang({ nama: 'Sementara', statusPenduduk: 'Sementara', nik: null, catatan: 'Pekerja kebun' })
    const isi = susunBukuPenduduk('penduduk-sementara', bahan({ penduduk: [tetap, sementara] }))
    expect(isi.baris).toHaveLength(1)
    expect(isi.baris[0].slice(1, 4)).toEqual(['Sementara', 'Laki-laki', 'Belum ada NIK'])
    expect(isi.baris[0].at(-1)).toBe('Pekerja kebun')
  })

  it('KTP dan KK: penduduk Hidup per KK dengan status KTP-el', () => {
    const a = orang({ nama: 'A', ktpEl: 'Belum rekam' })
    const isi = susunBukuPenduduk('ktp-kk', bahan({ penduduk: [a] }))
    expect(isi.kolom).toContain('KTP-el')
    expect(isi.baris[0].slice(0, 5)).toEqual(['1', a.nomorKk, a.nik, 'A', 'Laki-laki'])
    expect(isi.baris[0]).toContain('Belum rekam')
  })

  it('bahan kosong: baris kosong dan diperbarui null', () => {
    for (const kode of ['induk-penduduk', 'mutasi-penduduk', 'penduduk-sementara', 'ktp-kk'] as const) {
      expect(susunBukuPenduduk(kode, bahan())).toMatchObject({ baris: [], diperbarui: null })
    }
  })
})

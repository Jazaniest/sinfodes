import type { ReactNode } from 'react'
import { formatTanggal, formatUmur } from '@/domain/format/tanggal'
import { kelompokkanNik } from '@/domain/penduduk/nik'
import { penandaPenduduk } from '@/domain/penduduk/penanda'
import type { BarisPenduduk } from '@/domain/penduduk/schema'
import { alamatPendek } from '@/domain/wilayah/alamat'
import type { Desa, Dusun } from '@/domain/wilayah/schema'
import type { KolomTabel } from '@/ui/data/DataTable'
import { Nik } from '@/ui/domain/Nik'
import { PenandaCap } from './PenandaCap'

export const KOLOM_BAWAAN_PENDUDUK = ['nik', 'nama', 'keluarga', 'alamat', 'pekerjaan', 'penanda'] as const

export type KonteksKolom = {
  dusun: readonly Dusun[]
  istilah: Desa['istilahWilayah']
  kodeWilayahDesa: string
  hariIni: Date
}

export const jenisKelaminPanjang = (jk: 'L' | 'P') => (jk === 'P' ? 'Perempuan' : 'Laki-laki')
const atauBelumDiisi = (nilai: string | null): ReactNode => nilai ?? <span className="text-tinta-2">Belum diisi</span>

/** Kolom daftar penduduk (SPEC §6.2): enam kolom bawaan + kolom tambahan lewat "Atur kolom". */
export function buatKolomPenduduk(ctx: KonteksKolom): KolomTabel<BarisPenduduk>[] {
  return [
    { id: 'nik', judul: 'NIK', wajib: true, lebar: 'w-48', isi: (p) => <Nik nik={p.nik} /> },
    {
      id: 'nama',
      judul: 'Nama',
      wajib: true,
      urut: 'nama',
      isi: (p) => (
        <>
          <span className="block font-medium">{p.nama}</span>
          <span className="block text-teks-kecil text-tinta-2">
            {jenisKelaminPanjang(p.jenisKelamin)}
            {p.statusDasar === 'Hidup' && ` · ${formatUmur(p.tanggalLahir, ctx.hariIni)}`}
          </span>
        </>
      ),
    },
    {
      id: 'keluarga',
      judul: 'Hubungan · No. KK',
      isi: (p) => (
        <>
          <span className="block">{p.hubunganKeluarga}</span>
          <span className="block font-mono text-teks-kecil text-tinta-2">{kelompokkanNik(p.nomorKk)}</span>
        </>
      ),
    },
    { id: 'alamat', judul: 'Alamat', urut: 'dusun', isi: (p) => alamatPendek(p, ctx.dusun, ctx.istilah) },
    { id: 'pekerjaan', judul: 'Pekerjaan', isi: (p) => atauBelumDiisi(p.pekerjaan) },
    {
      id: 'penanda',
      judul: 'Penanda',
      // BELUM ADA NIK sudah tampil di kolom NIK.
      isi: (p) => <PenandaCap penanda={penandaPenduduk(p, ctx).filter((x) => x !== 'belum-ada-nik')} />,
    },
    { id: 'agama', judul: 'Agama', isi: (p) => p.agama },
    { id: 'pendidikan', judul: 'Pendidikan', isi: (p) => atauBelumDiisi(p.pendidikan) },
    { id: 'kawin', judul: 'Status perkawinan', isi: (p) => atauBelumDiisi(p.statusPerkawinan) },
    { id: 'ttl', judul: 'Tempat, tanggal lahir', isi: (p) => `${p.tempatLahir}, ${formatTanggal(p.tanggalLahir, 'pendek')}` },
    { id: 'darah', judul: 'Gol. darah', isi: (p) => p.golonganDarah },
    { id: 'telepon', judul: 'Telepon', isi: (p) => atauBelumDiisi(p.telepon) },
  ]
}

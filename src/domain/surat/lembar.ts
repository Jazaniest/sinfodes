import { formatRupiah, terbilangRupiah } from '../format/angka'
import { namaUntukSurat } from '../format/nama'
import { formatTanggal } from '../format/tanggal'
import type { Mutasi } from '../mutasi/schema'
import type { Penduduk } from '../penduduk/schema'
import { alamatLengkap } from '../wilayah/alamat'
import type { Desa, Dusun } from '../wilayah/schema'
import type { BarisLembar, BlokLembar, IsiLembar } from './isi-lembar'
import { PENANDA_TABEL, type IsianTambahan, type JenisSurat } from './jenis'
import { berlakuSampai } from './waktu'

/** Tanda isian yang belum diisi di pratinjau draf. */
export const KOSONG = '……'
const JENIS_KELAMIN = { L: 'Laki-laki', P: 'Perempuan' } as const

export type KonteksLembar = {
  jenis: JenisSurat
  isian: Readonly<Record<string, string>>
  pemohon: Penduduk
  /** Orang yang diterangkan bila bukan pemohon: bayi (kelahiran) atau almarhum (kematian). */
  subjek: Penduduk | null
  mutasi: Mutasi | null
  desa: Pick<Desa, 'nama' | 'kecamatan' | 'kabupaten' | 'istilahWilayah'>
  dusun: readonly Dusun[]
  /** Tanggal surat (YYYY-MM-DD): tanggal tanda tangan, atau hari ini untuk draf. */
  tanggal: string
}

const atauKosong = (nilai: string | null | undefined) => (nilai && nilai.trim() !== '' ? nilai : KOSONG)

/** Nilai isian tambahan. Di dalam `kalimat`, pilihan ditulis huruf kecil ("untuk keperluan pendidikan"). */
function nilaiIsian(d: IsianTambahan, mentah: string | undefined, kalimat: boolean): string {
  const nilai = (mentah ?? '').trim()
  if (nilai === '') return KOSONG
  if (d.jenis === 'tanggal' && /^\d{4}-\d{2}-\d{2}$/.test(nilai)) return formatTanggal(nilai)
  if (d.jenis === 'angka' && d.rupiah && /^\d+$/.test(nilai)) {
    const angka = Number(nilai)
    return `${formatRupiah(angka)} (${terbilangRupiah(angka)})`
  }
  if (d.jenis === 'pilihan' && kalimat) return nilai.toLocaleLowerCase('id-ID')
  return nilai
}

function barisSubjek(k: KonteksLembar, orang: Penduduk, alamat: string): BarisLembar[] {
  const baris = (label: string, nilai: string | null | undefined, tebal = false): BarisLembar => ({ label, nilai: atauKosong(nilai), tebal })
  if (k.jenis.subjek === 'kelahiran') {
    const lahir = k.mutasi?.jenis === 'lahir' ? k.mutasi.rincian : null
    return [
      baris('Nama', namaUntukSurat(orang.nama), true),
      baris('Jenis kelamin', JENIS_KELAMIN[orang.jenisKelamin]),
      baris('Tempat lahir', orang.tempatLahir),
      baris('Hari, tanggal lahir', formatTanggal(orang.tanggalLahir, 'hari')),
      baris('Pukul', lahir ? `${lahir.jam.replace(':', '.')} WIB` : null),
      baris('Anak ke', lahir ? String(lahir.anakKe) : null),
      baris('Nama ayah', orang.namaAyah),
      baris('Nama ibu', orang.namaIbu),
      baris('Alamat', alamat),
    ]
  }
  return [
    baris('Nama', namaUntukSurat(orang.nama), true),
    baris('NIK', orang.nik),
    baris('Tempat, tanggal lahir', `${orang.tempatLahir}, ${formatTanggal(orang.tanggalLahir)}`),
    baris('Jenis kelamin', JENIS_KELAMIN[orang.jenisKelamin]),
    baris('Agama', orang.agama),
    baris('Status perkawinan', orang.statusPerkawinan),
    baris('Pekerjaan', orang.pekerjaan),
    baris('Kewarganegaraan', orang.kewarganegaraan),
    baris('Alamat', alamat),
  ]
}

/**
 * Isi lembar surat dari jenis surat, isian, dan data penduduk (SPEC §7.5). Dipakai untuk pratinjau langsung dan
 * dibekukan di `terbit.lembar` saat ditandatangani.
 */
export function susunLembar(k: KonteksLembar): IsiLembar {
  const orang = k.jenis.subjek === 'pemohon' ? k.pemohon : (k.subjek ?? k.pemohon)
  const alamat = `${alamatLengkap(orang, k.dusun, k.desa.istilahWilayah)}, Desa ${k.desa.nama}`
  const sampai = berlakuSampai(k.tanggal, k.jenis.masaBerlakuBulan)
  const sisipan: Record<string, string> = {
    nama: orang.nama,
    nik: atauKosong(orang.nik),
    tempatTanggalLahir: `${orang.tempatLahir}, ${formatTanggal(orang.tanggalLahir)}`,
    jenisKelamin: JENIS_KELAMIN[orang.jenisKelamin],
    alamat,
    pekerjaan: orang.pekerjaan ? orang.pekerjaan.toLocaleLowerCase('id-ID') : KOSONG,
    namaAyah: atauKosong(orang.namaAyah),
    namaIbu: atauKosong(orang.namaIbu),
    namaDesa: k.desa.nama,
    kecamatan: k.desa.kecamatan.nama,
    kabupaten: k.desa.kabupaten.nama,
    berlakuSampai: sampai ? formatTanggal(sampai) : KOSONG,
  }
  for (const d of k.jenis.isian) sisipan[d.kunci] = nilaiIsian(d, k.isian[d.kunci], true)
  const rincian: BarisLembar[] = k.jenis.isian
    .filter((d) => d.diTabel && (d.wajib || (k.isian[d.kunci] ?? '').trim() !== ''))
    .map((d) => ({ label: d.label, nilai: nilaiIsian(d, k.isian[d.kunci], false), tebal: false }))

  const blok: BlokLembar[] = [{ jenis: 'tabel', baris: barisSubjek(k, orang, alamat) }]
  for (const paragraf of k.jenis.teks.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)) {
    if (paragraf === `[${PENANDA_TABEL}]`) {
      if (rincian.length > 0) blok.push({ jenis: 'tabel', baris: rincian })
    } else {
      blok.push({ jenis: 'paragraf', teks: paragraf.replace(/\[(\w+)\]/g, (asli: string, kunci: string) => sisipan[kunci] ?? asli) })
    }
  }
  return {
    judul: k.jenis.nama.toLocaleUpperCase('id-ID'),
    pembuka: `Yang bertanda tangan di bawah ini, Kepala Desa ${k.desa.nama}, Kecamatan ${k.desa.kecamatan.nama}, Kabupaten ${k.desa.kabupaten.nama}, menerangkan bahwa:`,
    blok,
    tempatTanggal: `${k.desa.nama}, ${formatTanggal(k.tanggal)}`,
  }
}

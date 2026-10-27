import { tanggalIsoWib } from '@sinfodes/kontrak/format/tanggal'
import type { StatusDesa } from '@sinfodes/kontrak/wilayah/schema'
import type { Acak } from '../prng'
import type { RekamDesa } from '../tipe-db'

/**
 * Belanja per bulan desa rekaman untuk Dana Desa kabupaten (SPEC-V0.2 §8.3): realisasi tahun berjalan dibagi ke Januari
 * sampai bulan acuan dengan bobot acak 0,6-1,4. Bulan acuan baru terisi sebagian (sebanding hari yang sudah lewat). Sisa
 * pembulatan masuk ke bulan terakhir, jadi jumlahnya sama persis dengan realisasi.
 */
export function belanjaBulananFiktif(acak: Acak, apbdes: RekamDesa['apbdes'], acuan: Date): RekamDesa['belanjaBulanan'] {
  if (apbdes === null) return null
  const hariIni = tanggalIsoWib(acuan)
  const tahun = hariIni.slice(0, 4)
  const bulanIni = Number(hariIni.slice(5, 7))
  const bobot = Array.from({ length: bulanIni }, (_, i) => {
    const b = 0.6 + acak.angka() * 0.8
    return i === bulanIni - 1 ? (b * Number(hariIni.slice(8, 10))) / 30 : b
  })
  const total = bobot.reduce((n, b) => n + b, 0)
  let sisa = apbdes.realisasi
  return bobot.map((b, i) => {
    const belanja = i === bobot.length - 1 ? sisa : Math.round((apbdes.realisasi * b) / total)
    sisa -= belanja
    return { bulan: `${tahun}-${String(i + 1).padStart(2, '0')}`, belanja }
  })
}

/**
 * Komposisi penduduk dan penerima bansos desa rekaman untuk Data gabungan kabupaten (SPEC-V0.2 §8.3 butir 6). Desa Persiapan
 * belum mengelola bansos di Sinfodes, jadi semua angka bansosnya 0. BLT-DD sengaja kadang hanya 1-4 KK, supaya penyamaran
 * angka di bawah 5 terlihat di demo.
 */
export function komposisiFiktif(acak: Acak, jiwa: number, status: StatusDesa): RekamDesa['komposisi'] {
  if (jiwa === 0) return null
  const persen = (dari: number, sampai: number) => Math.round(jiwa * (dari + acak.angka() * (sampai - dari)))
  const laki = persen(0.49, 0.53)
  const kk = Math.round(jiwa / (3.3 + acak.angka() * 0.6))
  const u0_4 = persen(0.07, 0.1)
  const u5_14 = persen(0.16, 0.2)
  const u60 = persen(0.07, 0.12)
  const bansos = (dari: number, sampai: number) => Math.round(kk * (dari + acak.angka() * (sampai - dari)))
  const persiapan = status === 'Persiapan'
  const blt = persiapan ? 0 : acak.peluang(0.25) ? acak.bulat(1, 4) : bansos(0.03, 0.07)
  return {
    laki, perempuan: jiwa - laki, kk, u0_4, u5_14, u15_59: jiwa - u0_4 - u5_14 - u60, u60,
    blt, pkh: persiapan ? 0 : bansos(0.05, 0.12), pangan: persiapan ? 0 : bansos(0.1, 0.2),
  }
}

import type { Penomoran } from '../pengaturan/penomoran'
import type { JenisSurat } from './jenis'
import { urutBerikutnya, type ModeUrutan } from './nomor-surat'

export type NomorTerbit = { jenisId: string; tahun: number; urut: number }

/**
 * Jawaban pengaturan Penomoran: format, urutan, kode desa, dan contoh dari jenis surat yang paling sering terbit
 * (pratinjau SPEC §7.2). Dipakai tiruan dan server, jadi jawabannya sama. Seri terbit ditentukan kode jenis menurut abjad.
 * Nomor surat yang jenisnya sudah tidak ada tetap menggeser urut per tahun (SPEC §7.1: nomor tidak dipakai ulang).
 */
export function susunPenomoran(masukan: {
  formatNomor: string
  urutan: ModeUrutan
  kodeSurat: string
  jenis: readonly Pick<JenisSurat, 'id' | 'kode' | 'nama' | 'klasifikasi'>[]
  terbit: readonly NomorTerbit[]
  tahun: number
}): Penomoran {
  const { jenis, terbit, tahun } = masukan
  const kodeJenis = new Map(jenis.map((j) => [j.id, j.kode]))
  const terpakai = terbit.map((n) => ({ tahun: n.tahun, urut: n.urut, jenisKode: kodeJenis.get(n.jenisId) ?? '' }))
  const jumlah = (id: string) => terbit.filter((n) => n.jenisId === id).length
  const contoh = [...jenis].sort((a, b) => jumlah(b.id) - jumlah(a.id) || a.kode.localeCompare(b.kode))[0]
  const jenisKode = contoh?.kode ?? ''
  return {
    formatNomor: masukan.formatNomor,
    urutan: masukan.urutan,
    kodeSurat: masukan.kodeSurat,
    contoh: {
      jenis: contoh?.nama ?? 'Surat keterangan',
      kode: contoh?.kode ?? 'SKD',
      klasifikasi: contoh?.klasifikasi ?? '470',
      urutPerTahun: urutBerikutnya(terpakai, { tahun, jenisKode, mode: 'per-tahun' }),
      urutPerJenis: urutBerikutnya(terpakai, { tahun, jenisKode, mode: 'per-jenis' }),
    },
  }
}

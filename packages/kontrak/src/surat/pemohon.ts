import type { Mutasi } from '../mutasi/schema'
import type { Penduduk } from '../penduduk/schema'
import type { JenisSurat } from './jenis'

export type PemeriksaanPemohon = { blokir: { kolom: 'pemohon' | 'subjek'; pesan: string } | null; peringatan: string[] }

const blokir = (kolom: 'pemohon' | 'subjek', pesan: string): PemeriksaanPemohon => ({ blokir: { kolom, pesan }, peringatan: [] })

/**
 * Langkah Pemohon (SPEC §7.4 layar 2): pemohon Meninggal/Pindah memblokir, kecuali pengantar pindah untuk orang yang
 * kepindahannya baru dicatat. Data yang belum lengkap hanya diperingatkan, boleh lanjut. Dipakai layar dan API tiruan.
 */
export function periksaPemohon(
  jenis: Pick<JenisSurat, 'kode' | 'subjek'>,
  pemohon: Penduduk,
  subjek: Penduduk | null,
  mutasi: Pick<Mutasi, 'jenis' | 'pendudukIds'> | null,
): PemeriksaanPemohon {
  const pindahTercatat = jenis.kode === 'SPP' && mutasi?.jenis === 'pindah' && mutasi.pendudukIds.includes(pemohon.id)
  if (pemohon.statusDasar !== 'Hidup' && !pindahTercatat) {
    return blokir(
      'pemohon',
      `${pemohon.nama} berstatus ${pemohon.statusDasar}. Surat tidak bisa dibuat atas nama penduduk yang sudah meninggal atau pindah.`,
    )
  }
  if (jenis.subjek === 'kelahiran' && !subjek) return blokir('subjek', 'Pilih bayi yang diterangkan surat ini.')
  if (jenis.subjek === 'kematian') {
    if (!subjek) return blokir('subjek', 'Pilih penduduk yang meninggal.')
    if (subjek.statusDasar !== 'Meninggal') {
      return blokir('subjek', `${subjek.nama} belum dicatat meninggal. Catat kematiannya lebih dulu di Mutasi.`)
    }
  }
  const orang = jenis.subjek === 'pemohon' ? pemohon : (subjek ?? pemohon)
  const peringatan: string[] = []
  if (jenis.subjek !== 'kelahiran') {
    if (orang.nik === null) peringatan.push(`${orang.nama} belum punya NIK`)
    if (orang.pekerjaan === null) peringatan.push('Pekerjaan belum diisi')
    if (orang.statusPerkawinan === null) peringatan.push('Status perkawinan belum diisi')
  }
  if (jenis.kode === 'SKBM' && orang.statusPerkawinan !== null && orang.statusPerkawinan !== 'Belum Kawin') {
    peringatan.push(`Status perkawinan tercatat ${orang.statusPerkawinan}`)
  }
  return { blokir: null, peringatan }
}

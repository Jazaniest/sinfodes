import { hasilImporSchema, laporanImporSchema, type KonfirmasiImpor } from '@/domain/impor/schema'
import { panggilApi } from './client'

/** Kirim berkas untuk diperiksa (SPEC §6.8). `null`: pakai berkas contoh ("Coba dengan file contoh"). */
export function unggahImpor(berkas: File | null) {
  if (berkas === null) return panggilApi('POST', '/impor/penduduk', { skema: laporanImporSchema, body: { contoh: true } })
  const isi = new FormData()
  isi.append('berkas', berkas)
  return panggilApi('POST', '/impor/penduduk', { skema: laporanImporSchema, body: isi })
}

export function konfirmasiImpor(id: string, masukan: KonfirmasiImpor) {
  return panggilApi('POST', `/impor/penduduk/${encodeURIComponent(id)}/konfirmasi`, { skema: hasilImporSchema, body: masukan })
}

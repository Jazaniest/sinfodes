/** Foto dari HP dikecilkan sebelum dikirim (SPEC §10): sisi terpanjang 1600px, JPEG kualitas 0,7. */
export const SISI_TERPANJANG_FOTO = 1600
export const KUALITAS_JPEG = 0.7
/** Batas foto asli yang dipilih warga, sebelum dikecilkan. */
export const MAKS_FOTO_ASLI_MB = 15
/** Batas foto yang diterima API, sesudah dikecilkan. */
export const MAKS_FOTO_KIRIM_KB = 2048

/** Ukuran baru dengan sisi terpanjang paling banyak `maks`; foto yang lebih kecil tidak diperbesar. */
export function ukuranKecil(lebar: number, tinggi: number, maks = SISI_TERPANJANG_FOTO): { lebar: number; tinggi: number } {
  const skala = Math.min(1, maks / Math.max(lebar, tinggi))
  return { lebar: Math.round(lebar * skala), tinggi: Math.round(tinggi * skala) }
}

export const ukuranKb = (byte: number): number => Math.max(1, Math.ceil(byte / 1024))

/** Pesan bila berkas kiriman bukan foto atau masih terlalu besar; null bila diterima. Dipakai API tiruan. */
export function periksaFotoKirim(berkas: { type: string; size: number }): string | null {
  if (!/^image\/(jpeg|png|webp)$/.test(berkas.type)) return 'Lampiran harus berupa foto (JPG, PNG, atau WebP).'
  if (berkas.size > MAKS_FOTO_KIRIM_KB * 1024) {
    return `Foto terlalu besar sesudah dikecilkan (paling besar ${MAKS_FOTO_KIRIM_KB / 1024} MB).`
  }
  return null
}

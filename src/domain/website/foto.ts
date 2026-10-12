/** Foto website versi web (SPEC §9): versi besar untuk layar lebar dan versi kecil untuk HP, keduanya ≤ 1600px. */
export const LEBAR_FOTO = { kecil: 960, besar: 1280 } as const

/** "/demo/foto/posyandu.jpg" → "/demo/foto/posyandu-960.jpg". */
export const jalurFotoKecil = (berkas: string): string => berkas.replace(/\.jpg$/, `-${LEBAR_FOTO.kecil}.jpg`)

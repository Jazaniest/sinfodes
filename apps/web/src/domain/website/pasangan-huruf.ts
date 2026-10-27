/** Id pasangan huruf website. Berkas kecil sendiri supaya skema alamat tidak menarik seluruh modul tema ke JS awal. */
export const ID_PASANGAN_HURUF = ['plex', 'source', 'literata', 'fraunces', 'bitter', 'archivo'] as const
export type IdPasanganHuruf = (typeof ID_PASANGAN_HURUF)[number]

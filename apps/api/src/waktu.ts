/** Jam yang disuntikkan ke semua lapisan, supaya batas sesi dan batas laju dapat diuji tanpa menunggu. */
export type Waktu = () => Date

export const waktuNyata: Waktu = () => new Date()

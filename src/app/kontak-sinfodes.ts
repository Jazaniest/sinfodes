/** Kontak Tim Sinfodes untuk pendaftaran desa (SPEC-V0.2 §4.4). Nomor dan surel ini contoh sampai kontak resmi ditetapkan. */
export const KONTAK_SINFODES = { whatsapp: '6280000000000', email: 'daftar@sinfodes.example' } as const

const PESAN_DAFTAR = 'Halo Tim Sinfodes, kami ingin mendaftarkan desa kami.'

/** Tautan WhatsApp dengan pesan pembuka untuk mendaftarkan desa. */
export const tautanDaftarDesa = (): string => `https://wa.me/${KONTAK_SINFODES.whatsapp}?text=${encodeURIComponent(PESAN_DAFTAR)}`

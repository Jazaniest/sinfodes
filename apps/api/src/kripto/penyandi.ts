import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes } from 'node:crypto'

/**
 * Enkripsi data pribadi di aplikasi (SPEC-V0.3 §7.6, §15.1): AES-256-GCM dengan kunci data yang dibungkus kunci utama,
 * dan `kid` ikut sandi sehingga kunci bisa diputar tanpa mengenkripsi ulang sekaligus.
 */

/** Satu baris tabel `kunci_data`: kunci data (32 bita) yang dibungkus kunci utama. */
export type BarisKunciData = { kid: string; dibungkus: string }

export type Penyandi = {
  /** Sandi `v1.<kid>.<iv>.<teks>.<tag>`; `ruang` (mis. `penduduk.nik:<desaId>`) ikut diautentikasi tetapi tidak disimpan. */
  sandikan(nilai: string, ruang: string): string
  bukaSandi(sandi: string, ruang: string): string
  /** Indeks HMAC untuk pencarian persis dan keunikan per ruang; tidak bergantung pada kunci utama. */
  indeks(nilai: string, ruang: string): string
}

/** Galat netral: tidak pernah memuat nilai, sandi, atau sebab. */
export class GalatKripto extends Error {
  constructor(pesan = 'Data terenkripsi tidak dapat dibuka.') {
    super(pesan)
    this.name = 'GalatKripto'
  }
}

const b64 = (b: Buffer): string => b.toString('base64url')
const dariB64 = (s: string): Buffer => Buffer.from(s, 'base64url')

function sandikanDengan(kunci: Buffer, teks: Buffer, aad: string): { iv: Buffer; isi: Buffer; tag: Buffer } {
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', kunci, iv)
  c.setAAD(Buffer.from(aad))
  const isi = Buffer.concat([c.update(teks), c.final()])
  return { iv, isi, tag: c.getAuthTag() }
}

function bukaDengan(kunci: Buffer, iv: Buffer, isi: Buffer, tag: Buffer, aad: string): Buffer {
  try {
    const d = createDecipheriv('aes-256-gcm', kunci, iv)
    d.setAAD(Buffer.from(aad))
    d.setAuthTag(tag)
    return Buffer.concat([d.update(isi), d.final()])
  } catch {
    throw new GalatKripto()
  }
}

/** Membuat kunci data baru dan membungkusnya dengan kunci utama; hasilnya disimpan di `kunci_data`. */
export function buatKunciDataBaru(kunciUtama: Buffer, kid: string): BarisKunciData {
  const { iv, isi, tag } = sandikanDengan(kunciUtama, randomBytes(32), `kunci_data:${kid}`)
  return { kid, dibungkus: `v1.${b64(iv)}.${b64(isi)}.${b64(tag)}` }
}

function bukaKunciData(kunciUtama: Buffer, baris: BarisKunciData): Buffer {
  const bagian = baris.dibungkus.split('.')
  if (bagian.length !== 4 || bagian[0] !== 'v1') throw new GalatKripto()
  const kunci = bukaDengan(kunciUtama, dariB64(bagian[1]), dariB64(bagian[2]), dariB64(bagian[3]), `kunci_data:${baris.kid}`)
  if (kunci.length !== 32) throw new GalatKripto()
  return kunci
}

export function buatPenyandi(kunciUtama: Buffer, barisKunci: BarisKunciData[], kidAktif: string, kunciIndeks: Buffer): Penyandi {
  const kunciData = new Map(barisKunci.map((b) => [b.kid, bukaKunciData(kunciUtama, b)] as const))
  const aktif = kunciData.get(kidAktif)
  if (!aktif) throw new GalatKripto('Kunci data aktif tidak ditemukan.')

  return {
    sandikan(nilai, ruang) {
      const { iv, isi, tag } = sandikanDengan(aktif, Buffer.from(nilai, 'utf8'), ruang)
      return `v1.${kidAktif}.${b64(iv)}.${b64(isi)}.${b64(tag)}`
    },
    bukaSandi(sandi, ruang) {
      const bagian = sandi.split('.')
      if (bagian.length !== 5 || bagian[0] !== 'v1') throw new GalatKripto()
      const kunci = kunciData.get(bagian[1])
      if (!kunci) throw new GalatKripto()
      return bukaDengan(kunci, dariB64(bagian[2]), dariB64(bagian[3]), dariB64(bagian[4]), ruang).toString('utf8')
    },
    indeks(nilai, ruang) {
      const turunan = Buffer.from(hkdfSync('sha256', kunciIndeks, Buffer.alloc(0), `indeks:${ruang}`, 32))
      return b64(createHmac('sha256', turunan).update(nilai, 'utf8').digest())
    },
  }
}

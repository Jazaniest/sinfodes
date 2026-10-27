/**
 * Alamat subdomain (SPEC-V0.2 §4): desa, kabupaten, Konsol, dan induk dibedakan dari hostname. Semua fungsi di sini
 * murni; domain induk diberikan pemanggil (`VITE_DOMAIN_INDUK` di `app/alamat.ts`).
 */

/** Label yang tidak boleh dipakai desa (SPEC-V0.2 §4.2). */
export const NAMA_TERLARANG: readonly string[] = [
  'www', 'konsol', 'api', 'admin', 'mail', 'smtp', 'imap', 'pop', 'ftp', 'webmail', 'autodiscover', 'status', 'bantuan',
  'docs', 'blog', 'cdn', 'aset', 'static', 'demo', 'app', 'panel', 'akun', 'masuk', 'login', 'daftar', 'id', 'sinfodes',
  'dev', 'staging', 'uji', 'test', 'beta', 'ns1', 'ns2', 'kab', 'kota', 'kabupaten', 'provinsi', 'konten',
]

/** Hasil membaca hostname. `alihkan-induk`: `www.` dan `localhost` polos; `luar`: host di luar domain induk. */
export type KonteksAlamat =
  | { jenis: 'induk' }
  | { jenis: 'konsol' }
  | { jenis: 'kabupaten'; label: string }
  | { jenis: 'desa'; label: string }
  | { jenis: 'terlarang'; label: string }
  | { jenis: 'alihkan-induk' }
  | { jenis: 'luar' }

/** Alamat yang bisa dituju tautan. */
export type TujuanAlamat =
  | { jenis: 'induk' }
  | { jenis: 'konsol' }
  | { jenis: 'kabupaten'; label: string }
  | { jenis: 'desa'; label: string }

const POLA_LABEL = /^[a-z0-9]+(-[a-z0-9]+)*$/
const AWALAN_KABUPATEN = /^(kab|kota)-[a-z0-9]+(-[a-z0-9]+)*$/
const AWALAN_TERLARANG = ['kab-', 'kota-', 'xn--']

/** Pesan bila label alamat desa tidak lolos `labelAlamatSah`. */
export const PESAN_ALAMAT_TIDAK_SAH = 'Alamat 3-40 karakter: huruf kecil, angka, dan tanda hubung, bukan nama yang dicadangkan.'

/** Label alamat desa: 3-40 karakter, huruf kecil dan angka dengan tanda hubung tunggal, bukan nama atau awalan terlarang. */
export function labelAlamatSah(label: string): boolean {
  return (
    label.length >= 3 &&
    label.length <= 40 &&
    POLA_LABEL.test(label) &&
    !NAMA_TERLARANG.includes(label) &&
    !AWALAN_TERLARANG.some((a) => label.startsWith(a))
  )
}

export function bacaAlamat(hostname: string, domainInduk: string): KonteksAlamat {
  const host = hostname.toLowerCase()
  const induk = domainInduk.toLowerCase()
  if (host === induk) return { jenis: 'induk' }
  if (host === 'localhost' && induk.endsWith('.localhost')) return { jenis: 'alihkan-induk' }
  if (!host.endsWith(`.${induk}`)) return { jenis: 'luar' }
  const label = host.slice(0, -induk.length - 1)
  if (label === 'www') return { jenis: 'alihkan-induk' }
  if (label === 'konsol') return { jenis: 'konsol' }
  if (AWALAN_KABUPATEN.test(label)) return { jenis: 'kabupaten', label }
  // Alias v0.1 (mis. "sungai-sialang") lolos di sini dan diselesaikan oleh API; aturan panjang dan awalan hanya untuk alamat baru.
  if (POLA_LABEL.test(label) && !label.startsWith('xn--') && !NAMA_TERLARANG.includes(label)) return { jenis: 'desa', label }
  return { jenis: 'terlarang', label }
}

/** "Sungai Sialang" → "sungaisialang": huruf kecil, tanpa diakritik, spasi, dan tanda baca. */
export function normalkanNama(nama: string): string {
  return nama
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

/** "Pelalawan" → "kab-pelalawan", "Kota Dumai" → "kota-dumai". */
export function labelKabupaten(nama: string): string {
  const rapi = nama.trim()
  if (/^kota\s/i.test(rapi)) return `kota-${normalkanNama(rapi.replace(/^kota\s+/i, ''))}`
  return `kab-${normalkanNama(rapi.replace(/^(kabupaten|kab\.)\s*/i, ''))}`
}

/** Alamat pertama yang bebas dan sah: nama, nama-kabupaten, nama-kecamatan, nama-kecamatan-kabupaten (SPEC-V0.2 §4.2). */
export function usulanAlamatDesa(
  w: { nama: string; kecamatan: string; kabupaten: string },
  terpakai: ReadonlySet<string>,
): string | null {
  const nama = normalkanNama(w.nama)
  const kab = normalkanNama(w.kabupaten.replace(/^(kabupaten|kab\.|kota)\s*/i, ''))
  const kec = normalkanNama(w.kecamatan)
  const calon = [nama, `${nama}-${kab}`, `${nama}-${kec}`, `${nama}-${kec}-${kab}`]
  return calon.find((c) => labelAlamatSah(c) && !terpakai.has(c)) ?? null
}

function hostTujuan(tujuan: TujuanAlamat, domainInduk: string): string {
  switch (tujuan.jenis) {
    case 'induk':
      return domainInduk
    case 'konsol':
      return `konsol.${domainInduk}`
    case 'kabupaten':
    case 'desa':
      return `${tujuan.label}.${domainInduk}`
  }
}

/** URL lengkap ke alamat lain. `jalur` kosong memberi asalnya saja (tanpa garis miring). */
export function alamatLuar(
  tujuan: TujuanAlamat,
  jalur: string,
  asal: { domainInduk: string; protokol: string; port: string },
): string {
  const port = asal.port ? `:${asal.port}` : ''
  return `${asal.protokol}//${hostTujuan(tujuan, asal.domainInduk)}${port}${jalur}`
}

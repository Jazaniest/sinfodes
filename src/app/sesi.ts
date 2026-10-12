import { aturTokenSesi, type BagianSesi } from '@/api/client'

const KUNCI: Readonly<Record<BagianSesi, string>> = { admin: 'sinfodes.sesi.admin', warga: 'sinfodes.sesi.warga' }

export function simpanSesi(token: string, bagian: BagianSesi = 'admin'): void {
  try {
    localStorage.setItem(KUNCI[bagian], token)
  } catch {
    // Penyimpanan tidak tersedia (mis. mode privat): sesi hanya bertahan sampai halaman ditutup.
  }
  aturTokenSesi(token, bagian)
}

function bacaToken(bagian: BagianSesi): string | null {
  try {
    return localStorage.getItem(KUNCI[bagian])
  } catch {
    return null
  }
}

/** Pulihkan sesi admin dan sesi warga dari perangkat. Mengembalikan token admin. */
export function pulihkanSesi(): string | null {
  aturTokenSesi(bacaToken('warga'), 'warga')
  const token = bacaToken('admin')
  aturTokenSesi(token)
  return token
}

/** Hapus satu sesi saja; sesi bagian lain tetap (fokus review 1). */
export function hapusSesi(bagian: BagianSesi = 'admin'): void {
  try {
    localStorage.removeItem(KUNCI[bagian])
  } catch {
    // Diabaikan.
  }
  aturTokenSesi(null, bagian)
}

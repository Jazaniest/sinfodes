import { aturTokenSesi } from '@/api/client'

const KUNCI = 'sinfodes.sesi.admin'

export function simpanSesi(token: string): void {
  try {
    localStorage.setItem(KUNCI, token)
  } catch {
    // Penyimpanan tidak tersedia (mis. mode privat): sesi hanya bertahan sampai halaman ditutup.
  }
  aturTokenSesi(token)
}

function bacaToken(): string | null {
  try {
    return localStorage.getItem(KUNCI)
  } catch {
    return null
  }
}

export function pulihkanSesi(): string | null {
  const token = bacaToken()
  aturTokenSesi(token)
  return token
}

export function hapusSesi(): void {
  try {
    localStorage.removeItem(KUNCI)
  } catch {
    // Diabaikan.
  }
  aturTokenSesi(null)
}

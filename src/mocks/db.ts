import { bangkitkanDb } from './generator'
import type { Penyimpanan } from './penyimpanan'
import { VERSI_DATA, type DbDemo } from './tipe-db'

export const KUNCI_DB = 'sinfodes.demo.db'

let db: DbDemo | null = null
let penyimpananAktif: Penyimpanan | null = null
let jadwalSimpan: ReturnType<typeof setTimeout> | null = null

export function ambilDb(): DbDemo {
  if (!db) throw new Error('Data demo belum dimuat. Panggil muatDb() lebih dulu.')
  return db
}

function tampakSepertiDb(nilai: unknown): nilai is DbDemo {
  if (typeof nilai !== 'object' || nilai === null) return false
  const n = nilai as { versiData?: unknown; penduduk?: unknown }
  return n.versiData === VERSI_DATA && Array.isArray(n.penduduk)
}

export async function muatDb(penyimpanan: Penyimpanan, sekarang: Date = new Date()): Promise<DbDemo> {
  penyimpananAktif = penyimpanan
  const tersimpan = await penyimpanan.baca(KUNCI_DB)
  if (tampakSepertiDb(tersimpan)) {
    db = tersimpan
    return db
  }
  db = bangkitkanDb(sekarang)
  await penyimpanan.tulis(KUNCI_DB, db)
  return db
}

/** Tombol "Reset data" di toolbar demo: bangkitkan ulang dengan tanggal acuan = sekarang. */
export async function resetDb(sekarang: Date = new Date()): Promise<DbDemo> {
  if (!penyimpananAktif) throw new Error('Data demo belum dimuat.')
  if (jadwalSimpan) clearTimeout(jadwalSimpan)
  jadwalSimpan = null
  db = bangkitkanDb(sekarang)
  await penyimpananAktif.tulis(KUNCI_DB, db)
  return db
}

/** Ubah data, lalu simpan setelah jeda 300 ms agar perubahan beruntun cukup ditulis sekali. */
export function ubahDb(ubah: (d: DbDemo) => void): void {
  const d = ambilDb()
  ubah(d)
  if (jadwalSimpan) clearTimeout(jadwalSimpan)
  jadwalSimpan = setTimeout(() => {
    jadwalSimpan = null
    void penyimpananAktif?.tulis(KUNCI_DB, d)
  }, 300)
}

export async function simpanSekarang(): Promise<void> {
  if (jadwalSimpan) clearTimeout(jadwalSimpan)
  jadwalSimpan = null
  if (penyimpananAktif && db) await penyimpananAktif.tulis(KUNCI_DB, db)
}

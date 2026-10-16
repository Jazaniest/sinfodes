import { ID_SUNGAI_SIALANG, PENGGUNA_DEMO } from './data/desa-demo'
import { PENGGUNA_KONSOL_DEMO } from './data/desa-konsol'
import { ambilDb, resetDb } from './db'
import type { DbDemo } from './tipe-db'

export { aturModeJaringan, bacaModeJaringan, MODE_JARINGAN } from './jaringan'
export { dataDemoTerpisah } from './status-penyimpanan'
export type { ModeJaringan } from './jaringan'

/** Satu akun desa berstatus Persiapan untuk tombol masuk di halaman demo. */
export type AkunDesaBaru = { id: string; nama: string; email: string; jabatan: string; namaDesa: string }

export type InfoDataDemo = { tanggalAcuan: string; jiwa: number; kk: number; dusun: number; desaBaru: AkunDesaBaru[] }

/**
 * Akun aktif desa berstatus Persiapan, dibaca dari data (tahap 6C): Tanjung Lamo (SPEC §12.9), Sekretaris Desa undangan
 * Tim Sinfodes, dan admin desa dari Tambah desa. Desa fiktif Konsol tidak punya akun panel, jadi tidak ikut.
 */
function akunDesaBaru(db: DbDemo): AkunDesaBaru[] {
  const persiapan = new Map(db.desa.filter((d) => d.status === 'Persiapan').map((d) => [d.id, d.nama]))
  return db.pengguna
    .flatMap((p) => {
      const namaDesa = persiapan.get(p.desaId)
      return p.aktif && namaDesa ? [{ id: p.id, nama: p.nama, email: p.email, jabatan: p.jabatan, namaDesa }] : []
    })
    .sort((a, b) => a.namaDesa.localeCompare(b.namaDesa, 'id'))
}

/** Ringkasan data demo untuk halaman demo (SPEC §3.6). */
export function infoDataDemo(): InfoDataDemo {
  const db = ambilDb()
  return {
    tanggalAcuan: db.tanggalAcuan,
    jiwa: db.penduduk.filter((p) => p.desaId === ID_SUNGAI_SIALANG && p.statusDasar === 'Hidup').length,
    kk: db.keluarga.filter((k) => k.desaId === ID_SUNGAI_SIALANG).length,
    dusun: db.dusun.filter((d) => d.desaId === ID_SUNGAI_SIALANG).length,
    desaBaru: akunDesaBaru(db),
  }
}

export async function resetDataDemo(): Promise<InfoDataDemo> {
  await resetDb()
  return infoDataDemo()
}

export { KATA_SANDI_DEMO, PASSPHRASE_TTE_DEMO } from './data/desa-demo'

/** Akun panel admin Desa Sungai Sialang untuk tombol masuk dan pilihan peran (SPEC §12.9). */
export const AKUN_DEMO_ADMIN = PENGGUNA_DEMO.filter((p) => p.desaId === ID_SUNGAI_SIALANG).map(({ id, nama, peran, email }) => ({
  id,
  nama,
  peran,
  email,
}))

/** Akun layanan warga untuk tombol masuk di halaman demo (SPEC §12.9). */
export { AKUN_WARGA_DEMO as AKUN_DEMO_WARGA } from './data/warga-demo'

/** Akun Konsol (SPEC §12.9): Tim Sinfodes dan pemantau Kabupaten Pelalawan. */
export const AKUN_DEMO_KONSOL = PENGGUNA_KONSOL_DEMO.map(({ id, nama, peran, email, wilayah }) => ({ id, nama, peran, email, wilayah }))

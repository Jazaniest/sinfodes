import { ID_SUNGAI_SIALANG, PENGGUNA_DEMO } from './data/desa-demo'
import { ambilDb, resetDb } from './db'

export { aturModeJaringan, bacaModeJaringan, MODE_JARINGAN } from './jaringan'
export type { ModeJaringan } from './jaringan'

export type InfoDataDemo = { tanggalAcuan: string; jiwa: number; kk: number; dusun: number }

/** Ringkasan data demo untuk halaman demo (SPEC §3.6). */
export function infoDataDemo(): InfoDataDemo {
  const db = ambilDb()
  return {
    tanggalAcuan: db.tanggalAcuan,
    jiwa: db.penduduk.filter((p) => p.desaId === ID_SUNGAI_SIALANG && p.statusDasar === 'Hidup').length,
    kk: db.keluarga.filter((k) => k.desaId === ID_SUNGAI_SIALANG).length,
    dusun: db.dusun.filter((d) => d.desaId === ID_SUNGAI_SIALANG).length,
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

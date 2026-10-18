import { urutAkunKabupaten } from '@/domain/kabupaten/pengguna'
import type { PeranKabupaten } from '@/domain/kabupaten/schema'
import { PERAN, type Peran } from '@/domain/pengguna/schema'
import { ID_SUNGAI_SIALANG, PENGGUNA_DEMO } from './data/desa-demo'
import { PENGGUNA_KONSOL_DEMO } from './data/desa-konsol'
import { ambilDb, resetDb } from './db'
import type { DbDemo } from './tipe-db'

export { aturModeJaringan, bacaModeJaringan, MODE_JARINGAN } from './jaringan'
export { dataDemoTerpisah } from './status-penyimpanan'
export type { ModeJaringan } from './jaringan'

/** Satu akun desa berstatus Persiapan untuk tombol masuk di halaman demo. */
export type AkunDesaBaru = { id: string; nama: string; email: string; jabatan: string; namaDesa: string; labelDesa: string }

/** Satu akun kabupaten aktif untuk tombol masuk di halaman demo. */
export type AkunKabupatenDemo = { id: string; nama: string; jabatan: string; peran: PeranKabupaten; namaKabupaten: string; label: string }

export type InfoDataDemo = {
  tanggalAcuan: string
  jiwa: number
  kk: number
  dusun: number
  desaBaru: AkunDesaBaru[]
  akunKabupaten: AkunKabupatenDemo[]
}

/**
 * Akun aktif desa berstatus Persiapan, dibaca dari data (tahap 6C): Tanjung Lamo (SPEC §12.9), Sekretaris Desa undangan
 * Tim Sinfodes, dan admin desa dari Tambah desa. Desa fiktif Konsol tidak punya akun panel, jadi tidak ikut.
 */
function akunDesaBaru(db: DbDemo): AkunDesaBaru[] {
  const persiapan = new Map(db.desa.filter((d) => d.status === 'Persiapan').map((d) => [d.id, d]))
  return db.pengguna
    .flatMap((p) => {
      const desa = persiapan.get(p.desaId)
      return p.aktif && desa
        ? [{ id: p.id, nama: p.nama, email: p.email, jabatan: p.jabatan, namaDesa: desa.nama, labelDesa: desa.slug }]
        : []
    })
    .sort((a, b) => a.namaDesa.localeCompare(b.namaDesa, 'id'))
}

/**
 * Akun aktif semua kabupaten mitra, dibaca dari data: tiga akun demo (SPEC-V0.2 §13) dan akun yang dibuat kemudian, mis. Admin
 * kabupaten baru dari Konsol. Urut nama kabupaten, lalu Admin dulu.
 */
function akunKabupaten(db: DbDemo): AkunKabupatenDemo[] {
  const mitra = new Map(db.kabupatenMitra.map((k) => [k.kode, k]))
  return db.penggunaKabupaten
    .filter((p) => p.aktif && mitra.has(p.kabupatenKode))
    .sort((a, b) => (mitra.get(a.kabupatenKode)?.nama ?? '').localeCompare(mitra.get(b.kabupatenKode)?.nama ?? '', 'id') || urutAkunKabupaten(a, b))
    .map((p) => {
      const k = mitra.get(p.kabupatenKode)
      return { id: p.id, nama: p.nama, jabatan: p.jabatan, peran: p.peran, namaKabupaten: k?.nama ?? '', label: k?.label ?? '' }
    })
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
    akunKabupaten: akunKabupaten(db),
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

/** Akun Konsol (SPEC §12.9): Tim Sinfodes. */
export const AKUN_DEMO_KONSOL = PENGGUNA_KONSOL_DEMO.map(({ id, nama, peran, email }) => ({ id, nama, peran, email }))

/** Akun demo yang dikenali dari kuncinya (ID akun), untuk masuk cepat lintas alamat (SPEC-V0.2 §4.6). */
export type AkunDemoCepat =
  | { bagian: 'admin'; email: string; labelDesa: string }
  | { bagian: 'warga'; nik: string; pin: string; labelDesa: string }
  | { bagian: 'konsol'; email: string }
  | { bagian: 'kabupaten'; email: string; labelKabupaten: string }

export function cariAkunDemo(kunci: string): AkunDemoCepat | null {
  const db = ambilDb()
  const labelDesa = (desaId: string) => db.desa.find((d) => d.id === desaId)?.slug
  const pengguna = db.pengguna.find((p) => p.id === kunci && p.aktif)
  if (pengguna) {
    const label = labelDesa(pengguna.desaId)
    return label ? { bagian: 'admin', email: pengguna.email, labelDesa: label } : null
  }
  // PIN dibaca dari data, bukan seed: warga demo bisa sudah menggantinya di halaman Akun.
  const akunWarga = db.akunWarga.find((a) => a.pendudukId === kunci)
  const penduduk = db.penduduk.find((p) => p.id === kunci && p.statusDasar === 'Hidup')
  if (akunWarga && penduduk?.nik) {
    const label = labelDesa(penduduk.desaId)
    return label ? { bagian: 'warga', nik: penduduk.nik, pin: akunWarga.pin, labelDesa: label } : null
  }
  const konsol = db.penggunaKonsol.find((p) => p.id === kunci)
  if (konsol) return { bagian: 'konsol', email: konsol.email }
  const kab = db.penggunaKabupaten.find((p) => p.id === kunci && p.aktif)
  const mitra = kab && db.kabupatenMitra.find((m) => m.kode === kab.kabupatenKode)
  return kab && mitra ? { bagian: 'kabupaten', email: kab.email, labelKabupaten: mitra.label } : null
}

/** Akun panel aktif satu desa (menurut alamatnya), urut peran lalu nama, untuk pilihan peran di toolbar demo. */
export function akunPanelDesa(label: string): { id: string; nama: string; peran: Peran; email: string }[] {
  const db = ambilDb()
  const desa = db.desa.find((d) => d.slug === label)
  if (!desa) return []
  return db.pengguna
    .filter((p) => p.desaId === desa.id && p.aktif)
    .sort((a, b) => PERAN.indexOf(a.peran) - PERAN.indexOf(b.peran) || a.nama.localeCompare(b.nama, 'id'))
    .map(({ id, nama, peran, email }) => ({ id, nama, peran, email }))
}

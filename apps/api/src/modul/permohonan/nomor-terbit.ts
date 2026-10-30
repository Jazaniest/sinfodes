import type { PengaturanSurat } from '@sinfodes/kontrak/surat/pengaturan'
import type { JenisSurat } from '@sinfodes/kontrak/surat/jenis'
import { formatNomorSurat, urutBerikutnya } from '@sinfodes/kontrak/surat/nomor-surat'
import { buatKodeVerifikasi } from '@sinfodes/kontrak/surat/verifikasi'
import type { Db } from '../../basisdata/klien'
import { GalatApp } from '../../galat'
import { bacaUrutTerbitTertinggi, kodeVerifikasiAda, kunciNomorTerbit } from './repositori-tulis'

/** Percobaan membuat kode verifikasi yang belum dipakai sebelum menyerah (rencana 8F2b Ruling 8). */
const BATAS_ULANG_KODE = 10

/**
 * Nomor surat terbit berikutnya untuk desa dan tahun dari `tanggal` (YYYY-MM-DD WIB), di bawah kunci penasihat desa dan tahun.
 * Pemanggil wajib memakai hasilnya di transaksi yang sama (kunci dilepas saat transaksi selesai), jadi penanda tangan serentak
 * antre dan nomornya berurutan tanpa lubang dan tanpa ganda. Surat dibatalkan tetap terhitung. Indeks unik 0012 hanya menjadi
 * sabuk kedua untuk mode per-jenis; mode per-tahun dijaga kunci ini (rencana 8F2b Ruling 6).
 */
export async function alokasiNomorTerbit(
  db: Db,
  m: {
    desaId: string
    jenis: Pick<JenisSurat, 'kode' | 'klasifikasi'>
    pengaturan: Pick<PengaturanSurat, 'formatNomor' | 'urutan'>
    tanggal: string
    kodeDesa: string
  },
): Promise<{ tahun: number; urut: number; nomor: string }> {
  const tahun = Number(m.tanggal.slice(0, 4))
  await kunciNomorTerbit(db, m.desaId, tahun)
  const terpakai = (await bacaUrutTerbitTertinggi(db, m.desaId, tahun)).map((b) => ({ tahun, urut: b.urut, jenisKode: b.jenisKode }))
  const urut = urutBerikutnya(terpakai, { tahun, jenisKode: m.jenis.kode, mode: m.pengaturan.urutan })
  const nomor = formatNomorSurat(m.pengaturan.formatNomor, {
    klasifikasi: m.jenis.klasifikasi,
    kodeJenis: m.jenis.kode,
    urut,
    kodeDesa: m.kodeDesa,
    tanggal: m.tanggal,
  })
  return { tahun, urut, nomor }
}

/**
 * Kode verifikasi yang belum dipakai di desa itu, dari sumber acak `acak` (di server: `crypto.randomInt`). Dicek di bawah
 * kunci nomor; `UNIQUE (desa_id, terbit_kode)` menjadi sabuk kedua. Setelah 10 kali bentrok: 500.
 */
export async function kodeVerifikasiBaru(db: Db, desaId: string, kodeDesa: string, acak: () => number): Promise<string> {
  for (let i = 0; i < BATAS_ULANG_KODE; i++) {
    const kode = buatKodeVerifikasi(kodeDesa, acak)
    if (!(await kodeVerifikasiAda(db, desaId, kode))) return kode
  }
  throw new GalatApp('SERVER', 'Kode verifikasi tidak bisa dibuat. Coba lagi.', 500)
}

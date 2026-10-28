import { tanggalIsoWib } from '@sinfodes/kontrak/format/tanggal'
import { buatNomorKk } from '@sinfodes/kontrak/keluarga/nomor-kk'
import { kodeWilayahNik } from '@sinfodes/kontrak/wilayah/alamat'
import { inArray, sql } from 'drizzle-orm'
import type { Db } from '../../basisdata/klien'
import { keluarga } from '../../basisdata/skema'
import { GalatApp } from '../../galat'
import type { Penyandi } from '../../kripto/penyandi'
import { ruang } from '../../kripto/ruang'

const URUT_PERTAMA = 8001
const URUT_TERAKHIR = 9999
const UKURAN_KELOMPOK = 100

/**
 * Nomor KK baru: kode wilayah desa + tanggal terbit hari ini + nomor urut 8001-9999 pertama yang belum dipakai (SPEC-V0.2
 * §12.5). Kunci penasihat per desa membuat dua permintaan serentak antre, jadi tidak ada yang memilih nomor yang sama;
 * indeks unik `(desa_id, nomor_kk_indeks)` tetap menjadi sabuk kedua. Ketersediaan diperiksa lewat indeks HMAC kandidat,
 * tanpa membuka sandi KK lain. Wajib dipanggil di dalam transaksi permintaan (kunci dilepas saat transaksi selesai).
 */
export async function nomorKkBaru(db: Db, desa: { id: string; kodeDesa: string }, penyandi: Penyandi, sekarang: Date): Promise<string> {
  await db.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`nomor-kk:${desa.id}`}, 0))`)
  const kodeWilayah = kodeWilayahNik(desa)
  const tanggalTerbit = tanggalIsoWib(sekarang)
  for (let mulai = URUT_PERTAMA; mulai <= URUT_TERAKHIR; mulai += UKURAN_KELOMPOK) {
    const kandidat = Array.from({ length: Math.min(UKURAN_KELOMPOK, URUT_TERAKHIR - mulai + 1) }, (_, i) => {
      const nomor = buatNomorKk({ kodeWilayah, tanggalTerbit, nomorUrut: mulai + i })
      return { nomor, indeks: penyandi.indeks(nomor, ruang.nomorKk(desa.id)) }
    })
    const dipakai = new Set(
      (await db.select({ indeks: keluarga.nomorKkIndeks }).from(keluarga).where(inArray(keluarga.nomorKkIndeks, kandidat.map((k) => k.indeks)))).map((b) => b.indeks),
    )
    const bebas = kandidat.find((k) => !dipakai.has(k.indeks))
    if (bebas) return bebas.nomor
  }
  throw new GalatApp('CONFLICT', 'Nomor urut KK hari ini habis.', 409)
}

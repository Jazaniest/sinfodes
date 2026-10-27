import { tanggalIsoWib } from '@/domain/format/tanggal'
import {
  hargaTagihan,
  jadwalTagihan,
  type Kwitansi,
  nomorTagihan,
  PELAKU_SISTEM,
  periodeTagihanBerikut,
  periodeTagihanMemuat,
  type RentangTagihan,
  type Tagihan,
} from '@/domain/langganan/tagihan'
import type { Langganan } from '@/domain/konsol/schema'
import type { Desa } from '@/domain/wilayah/schema'
import type { DbDemo } from './tipe-db'

/** Fungsi murni tagihan, terpisah dari `tagihan.ts` supaya generator bisa memakainya tanpa mengimpor `db.ts` (impor melingkar). */

const KODE_MAKS = 999

/** FNV-1a 32 bit: kode awal yang sama untuk ID yang sama, tanpa PRNG supaya data lain tidak bergeser. */
function fnv1a(teks: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < teks.length; i++) h = Math.imul(h ^ teks.charCodeAt(i), 0x01000193)
  return h >>> 0
}

const AKTIF_BERTAGIH = new Set<Tagihan['status']>(['terbit', 'menunggu-verifikasi'])

/** Nomor desa tiga digit = urutan desa di `db.desa` (SPEC-V0.2 §10; sama dengan nomor di tagihan v0.1). */
export function nomorDesa(db: Pick<DbDemo, 'desa'>, desaId: string): string {
  const i = db.desa.findIndex((d) => d.id === desaId)
  if (i < 0) throw new Error(`Desa ${desaId} tidak ada`)
  return String(i + 1).padStart(3, '0')
}

/**
 * Kode unik 1-999 (keputusan 7D-1 butir 4): mulai dari hash ID tagihan, naik satu sampai belum dipakai tagihan `terbit` atau
 * `menunggu-verifikasi` desa mana pun, lalu kembali ke 1 setelah 999. Kode tagihan lunas atau dibatalkan boleh dipakai lagi.
 */
export function pilihKodeUnik(db: Pick<DbDemo, 'tagihan'>, tagihanId: string): number {
  const terpakai = new Set(db.tagihan.filter((t) => AKTIF_BERTAGIH.has(t.status)).map((t) => t.kodeUnik))
  const awal = fnv1a(tagihanId) % KODE_MAKS
  for (let i = 0; i < KODE_MAKS; i++) {
    const kode = ((awal + i) % KODE_MAKS) + 1
    if (!terpakai.has(kode)) return kode
  }
  throw new Error('Semua kode unik tagihan sudah terpakai')
}

function idTagihan(db: Pick<DbDemo, 'tagihan'>, desaId: string, mulai: string): string {
  const dasar = `tgh_${desaId.replace(/^desa_/, '')}_${mulai}`
  let id = dasar
  for (let n = 2; db.tagihan.some((t) => t.id === id); n++) id = `${dasar}_${n}`
  return id
}

/** Tagihan `terbit` untuk satu periode. Tidak menyimpan apa pun; pemanggil memasukkannya ke `db.tagihan`. */
export function buatTagihan(
  db: Pick<DbDemo, 'desa' | 'tagihan'>,
  o: { desa: Pick<Desa, 'id'>; langganan: Pick<Langganan, 'paket' | 'periodeTagihan'>; periode: RentangTagihan },
): Tagihan {
  const id = idTagihan(db, o.desa.id, o.periode.mulai)
  const jadwal = jadwalTagihan(o.periode)
  const harga = hargaTagihan(o.langganan.paket, o.langganan.periodeTagihan)
  const kodeUnik = pilihKodeUnik(db, id)
  return {
    id,
    nomor: nomorTagihan(o.periode, o.langganan.periodeTagihan, nomorDesa(db, o.desa.id)),
    desaId: o.desa.id,
    paket: o.langganan.paket,
    periode: { jenis: o.langganan.periodeTagihan, ...o.periode },
    harga,
    kodeUnik,
    nominal: harga + kodeUnik,
    terbit: jadwal.terbit,
    jatuhTempo: jadwal.jatuhTempo,
    status: 'terbit',
    metode: 'transfer-manual',
    referensiPembayaran: null,
    bukti: null,
    penolakanTerakhir: null,
    riwayatBukti: [],
    lunas: null,
    kwitansi: null,
    dibatalkan: null,
    riwayat: [{ status: 'terbit', pada: `${jadwal.terbit}T00:00:00+07:00`, oleh: PELAKU_SISTEM, catatan: null }],
  }
}

/**
 * Tagihan yang seharusnya sudah terbit tetapi belum ada: setiap periode dengan tanggal terbit (mulai - 14) pada atau sebelum
 * hari ini, untuk desa Aktif saja, termasuk periode yang tertinggal. Fungsi murni. Periode berpatokan pada tagihan terakhir
 * yang tidak dibatalkan; desa tanpa tagihan mulai dari periode yang memuat awal langganannya (atau hari ini).
 */
export function tagihanJatuh(db: Pick<DbDemo, 'desa' | 'langganan' | 'tagihan'>, sekarang: Date): Tagihan[] {
  const hariIni = tanggalIsoWib(sekarang)
  const kerja = { desa: db.desa, tagihan: [...db.tagihan] }
  const baru: Tagihan[] = []
  for (const desa of db.desa) {
    if (desa.status !== 'Aktif') continue
    const langganan = db.langganan.find((l) => l.desaId === desa.id)
    if (!langganan) continue
    const sampai = kerja.tagihan.filter((t) => t.desaId === desa.id && t.status !== 'dibatalkan').map((t) => t.periode.sampai).sort().at(-1)
    let periode = sampai
      ? periodeTagihanBerikut(langganan.periodeTagihan, sampai)
      : periodeTagihanMemuat(langganan.periodeTagihan, langganan.mulai ?? hariIni)
    while (jadwalTagihan(periode).terbit <= hariIni) {
      const tagihan = buatTagihan(kerja, { desa, langganan, periode })
      kerja.tagihan.push(tagihan)
      baru.push(tagihan)
      periode = periodeTagihanBerikut(langganan.periodeTagihan, periode.sampai)
    }
  }
  return baru
}

/** Tagihan `terbit` atau `menunggu-verifikasi` dengan jatuh tempo terdekat; null bila tidak ada. */
export function tagihanBerjalan(db: Pick<DbDemo, 'tagihan'>, desaId: string): Tagihan | null {
  const daftar = db.tagihan.filter((t) => t.desaId === desaId && AKTIF_BERTAGIH.has(t.status))
  return daftar.sort((a, b) => a.jatuhTempo.localeCompare(b.jatuhTempo) || a.id.localeCompare(b.id))[0] ?? null
}

/** Masukkan tagihan baru ke `db.tagihan` dan perpanjang masa aktif langganan sampai akhir periode terbaru. */
export function terapkanTagihanBaru(db: Pick<DbDemo, 'langganan' | 'tagihan'>, baru: readonly Tagihan[]): void {
  db.tagihan.push(...baru)
  for (const t of baru) {
    const l = db.langganan.find((x) => x.desaId === t.desaId)
    if (l && (l.sampai === null || t.periode.sampai > l.sampai)) l.sampai = t.periode.sampai
  }
}

/** Nomor kwitansi `KW/{tahun}/{urut 4 digit}`: melanjutkan nomor terbesar tahun itu (keputusan 7D-2 butir 3). */
export function nomorKwitansiBerikut(db: Pick<DbDemo, 'tagihan'>, tahun: string): string {
  const awalan = `KW/${tahun}/`
  const terbesar = Math.max(0, ...db.tagihan.flatMap((t) => (t.kwitansi?.nomor.startsWith(awalan) ? [Number(t.kwitansi.nomor.slice(awalan.length))] : [])))
  return `${awalan}${String(terbesar + 1).padStart(4, '0')}`
}

/** Data kwitansi untuk tagihan yang sudah lunas; null bila belum lunas (atau desanya tidak ada). */
export function kwitansiTagihan(db: Pick<DbDemo, 'desa'>, t: Tagihan): Kwitansi | null {
  const desa = db.desa.find((d) => d.id === t.desaId)
  if (t.status !== 'lunas' || !t.lunas || !t.kwitansi || !desa) return null
  return {
    nomor: t.kwitansi.nomor,
    diterimaPada: t.lunas.diterimaPada,
    nominal: t.lunas.nominalDiterima,
    paket: t.paket,
    periode: t.periode.label,
    nomorTagihan: t.nomor,
    desa: { nama: desa.nama, kecamatan: desa.kecamatan.nama, kabupaten: desa.kabupaten.nama },
  }
}

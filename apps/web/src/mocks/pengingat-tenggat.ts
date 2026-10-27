import { formatTanggal, tanggalIsoWib } from '@/domain/format/tanggal'
import type { KabupatenMitra } from '@/domain/kabupaten/schema'
import { ambangTercapai, kalimatSisa, sisaHari, type ButirTenggatDesa, type PengingatTenggat } from '@/domain/kabupaten/tenggat'
import type { Notifikasi } from '@/domain/notifikasi/schema'
import { boleh } from '@/domain/pengguna/hak-akses'
import type { PenggunaSesi } from '@/domain/pengguna/schema'
import type { Desa } from '@/domain/wilayah/schema'
import type { DbDemo, TenggatLaporan } from './tipe-db'

/** Batas pengingat di Beranda (SPEC-V0.2 §8.3 butir 4): mulai H-14, sampai desa menandai terkirim. */
const MULAI_PENGINGAT_HARI = 14

/**
 * Tenggat kabupaten yang berlaku untuk satu desa. Hanya desa Aktif dan Uji coba di kabupaten mitra yang menjadi sasaran
 * (keputusan rencana 7B-2); desa lain mendapat null.
 */
export function tenggatUntukDesa(db: DbDemo, desa: Desa | undefined): { kabupaten: KabupatenMitra; tenggat: TenggatLaporan[] } | null {
  if (!desa || (desa.status !== 'Aktif' && desa.status !== 'Uji coba')) return null
  const kabupaten = db.kabupatenMitra.find((k) => k.kode === desa.kabupaten.kode)
  if (!kabupaten) return null
  return { kabupaten, tenggat: db.tenggatLaporan.filter((t) => t.kabupatenKode === kabupaten.kode) }
}

/** Satu tenggat dilihat dari desa: tanda kirimnya sendiri saja. */
export function butirTenggatDesa(db: DbDemo, t: TenggatLaporan, desaId: string): ButirTenggatDesa {
  const k = db.kirimLaporan.find((x) => x.tenggatId === t.id && x.desaId === desaId)
  return { id: t.id, nama: t.nama, tanggal: t.tanggal, dikirim: k ? { tanggal: k.tanggal, olehNama: k.oleh.nama } : null }
}

const sudahDikirim = (db: DbDemo, t: TenggatLaporan, desaId: string) => db.kirimLaporan.some((k) => k.tenggatId === t.id && k.desaId === desaId)

/** Pengingat Beranda: tenggat yang belum dikirim dan tinggal 14 hari atau kurang (termasuk yang sudah lewat), terdekat dulu. */
export function pengingatTenggatDesa(db: DbDemo, desa: Desa | undefined, hariIni: string): PengingatTenggat[] {
  const berlaku = tenggatUntukDesa(db, desa)
  if (!berlaku || !desa) return []
  return berlaku.tenggat
    .filter((t) => !sudahDikirim(db, t, desa.id) && sisaHari(t.tanggal, hariIni) <= MULAI_PENGINGAT_HARI)
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal))
    .map((t) => ({ id: t.id, nama: t.nama, tanggal: t.tanggal, sisaHari: sisaHari(t.tanggal, hariIni), kabupaten: berlaku.kabupaten.nama }))
}

/**
 * Notifikasi H-14, H-7, dan H-1 (SPEC-V0.2 §8.3 butir 4) untuk pemegang `keuangan.lapor`. Tiruan penjadwal produksi: dibuat
 * saat kotak notifikasi dibuka, dengan ID tetap per tenggat, tanggal, ambang, dan pengguna, jadi pemanggilan ulang tidak
 * menggandakannya. Tenggat yang sudah ditandai terkirim tidak membuat notifikasi baru.
 */
export function notifikasiTenggatBaru(db: DbDemo, pengguna: PenggunaSesi, sekarang: Date): Notifikasi[] {
  if (!boleh(pengguna.peran, 'keuangan.lapor')) return []
  const berlaku = tenggatUntukDesa(db, db.desa.find((d) => d.id === pengguna.desaId))
  if (!berlaku) return []
  const ada = new Set(db.notifikasi.map((n) => n.id))
  const hariIni = tanggalIsoWib(sekarang)
  return berlaku.tenggat.flatMap((t) =>
    sudahDikirim(db, t, pengguna.desaId)
      ? []
      : ambangTercapai(t, hariIni).flatMap(({ ambang, tanggal }): Notifikasi[] => {
          const id = `ntf_tgt_${t.id}_${t.tanggal}_${ambang}_${pengguna.id}`
          if (ada.has(id)) return []
          const isi = `Laporan ke Kabupaten ${berlaku.kabupaten.nama} jatuh tempo ${kalimatSisa(sisaHari(t.tanggal, tanggal))}, ${formatTanggal(t.tanggal)}.`
          return [
            {
              id, desaId: pengguna.desaId, penggunaId: pengguna.id, jenis: 'tenggat-laporan', judul: `Tenggat ${t.nama}`, isi,
              waktu: `${tanggal}T07:00:00+07:00`, dibaca: false, rujukan: { jenis: 'tenggat-laporan', id: t.id },
            },
          ]
        }),
  )
}

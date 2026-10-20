import { tanggalIsoWib } from '@/domain/format/tanggal'
import { sisaHari } from '@/domain/kabupaten/tenggat'
import {
  AMBANG_NOTIFIKASI_TAGIHAN,
  kalimatPengingatTagihan,
  MULAI_PENGINGAT_TAGIHAN_HARI,
  type PengingatTagihan,
} from '@/domain/langganan/pengingat'
import type { Notifikasi } from '@/domain/notifikasi/schema'
import { boleh } from '@/domain/pengguna/hak-akses'
import type { PenggunaSesi } from '@/domain/pengguna/schema'
import type { Tagihan } from '@/domain/langganan/tagihan'
import type { DbDemo } from './tipe-db'

const HARI_MS = 86_400_000
const geser = (iso: string, hari: number): string => new Date(Date.parse(`${iso}T00:00:00Z`) + hari * HARI_MS).toISOString().slice(0, 10)

/**
 * Pita Beranda (keputusan 7D-1 butir 12). Tagihan yang butuh tindakan didahulukan: `terbit` dengan jatuh tempo terdekat, mulai
 * H-14 sampai lewat. Bila tidak ada, bukti yang sedang diperiksa Tim Sinfodes. Selain itu null.
 */
export function pengingatTagihanDesa(db: Pick<DbDemo, 'tagihan'>, desaId: string, hariIni: string): PengingatTagihan | null {
  const milik = db.tagihan.filter((t) => t.desaId === desaId).sort((a, b) => a.jatuhTempo.localeCompare(b.jatuhTempo) || a.id.localeCompare(b.id))
  const dasar = (t: (typeof milik)[number]) => ({ tagihanId: t.id, periode: t.periode.label, nominal: t.nominal, jatuhTempo: t.jatuhTempo, sisaHari: sisaHari(t.jatuhTempo, hariIni) })
  const terbit = milik.find((t) => t.status === 'terbit')
  if (terbit) {
    const p = dasar(terbit)
    if (p.sisaHari <= MULAI_PENGINGAT_TAGIHAN_HARI) return { ...p, keadaan: p.sisaHari < 0 ? 'lewat' : p.sisaHari === 0 ? 'hari-ini' : 'mendekati' }
  }
  const diperiksa = milik.find((t) => t.status === 'menunggu-verifikasi')
  return diperiksa ? { ...dasar(diperiksa), keadaan: 'diperiksa' } : null
}

/**
 * Notifikasi H-14, H-7, H-1, dan hari jatuh tempo untuk pemegang `langganan.lihat`. Tiruan penjadwal produksi: dibuat saat kotak
 * notifikasi dibuka, dengan ID tetap per tagihan, ambang, dan pengguna, jadi pemanggilan ulang tidak menggandakannya. Hanya
 * ambang terakhir yang sudah tercapai yang dibuat (tidak empat sekaligus untuk tagihan yang baru terlihat setelah jatuh tempo).
 * Tagihan yang sudah menunggu verifikasi, lunas, atau dibatalkan tidak membuat notifikasi baru.
 */
export function notifikasiTagihanBaru(db: Pick<DbDemo, 'tagihan' | 'notifikasi'>, pengguna: PenggunaSesi, sekarang: Date): Notifikasi[] {
  if (!boleh(pengguna.peran, 'langganan.lihat')) return []
  const ada = new Set(db.notifikasi.map((n) => n.id))
  const hariIni = tanggalIsoWib(sekarang)
  return db.tagihan.flatMap((t): Notifikasi[] => {
    if (t.desaId !== pengguna.desaId || t.status !== 'terbit') return []
    const tercapai = AMBANG_NOTIFIKASI_TAGIHAN.filter((a) => hariIni >= geser(t.jatuhTempo, -a))
    if (tercapai.length === 0) return []
    const ambang = Math.min(...tercapai)
    const id = `ntf_tgh_${t.id}_${ambang}_${pengguna.id}`
    if (ada.has(id)) return []
    const tanggal = [geser(t.jatuhTempo, -ambang), t.terbit].sort().at(-1)!
    const isi = kalimatPengingatTagihan(ambang === 0 ? 'hari-ini' : 'mendekati', { periode: t.periode.label, nominal: t.nominal, jatuhTempo: t.jatuhTempo, sisaHari: ambang })
    return [
      {
        id, desaId: pengguna.desaId, penggunaId: pengguna.id, jenis: 'tagihan', judul: `Tagihan ${t.periode.label}`, isi,
        waktu: `${tanggal}T07:00:00+07:00`, dibaca: false, rujukan: { jenis: 'tagihan', id: t.id },
      },
    ]
  })
}

export type AksiTagihanKonsol = 'ditolak' | 'lunas' | 'dibatalkan'
const JUDUL_AKSI: Readonly<Record<AksiTagihanKonsol, string>> = {
  ditolak: 'Bukti pembayaran ditolak',
  lunas: 'Pembayaran diterima',
  dibatalkan: 'Tagihan dibatalkan',
}

/**
 * Notifikasi keputusan Tim Sinfodes atas satu tagihan, untuk setiap pengguna aktif pemegang `langganan.lihat` di desanya
 * (rencana 7D-2 keputusan 6). ID memuat jumlah riwayat tagihan, jadi penolakan berulang tidak bertabrakan.
 */
export function notifikasiAksiTagihan(db: Pick<DbDemo, 'pengguna'>, t: Tagihan, aksi: AksiTagihanKonsol, isi: string, waktu: string): Notifikasi[] {
  return db.pengguna
    .filter((p) => p.desaId === t.desaId && p.aktif && boleh(p.peran, 'langganan.lihat'))
    .map((p): Notifikasi => ({
      id: `ntf_tgh_${aksi}_${t.id}_${t.riwayat.length}_${p.id}`, desaId: p.desaId, penggunaId: p.id, jenis: 'tagihan', judul: JUDUL_AKSI[aksi], isi,
      waktu, dibaca: false, rujukan: { jenis: 'tagihan', id: t.id },
    }))
}

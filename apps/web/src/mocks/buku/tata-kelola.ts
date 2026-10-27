import { formatAngka } from '@/domain/format/angka'
import { formatTanggal } from '@/domain/format/tanggal'
import { jumlahKelompok, pembiayaanNetto, type Apbdes } from '@/domain/keuangan/schema'
import { JENIS_LEMBAGA, LABEL_LEMBAGA, teksMasaBakti, type JenisLembaga } from '@/domain/lembaga/schema'
import { LABEL_STATUS_KEGIATAN, LABEL_SUMBER_DANA, type BarisKegiatan } from '@/domain/pembangunan/schema'
import { namaDusun } from '@/domain/wilayah/alamat'
import { barisKegiatan } from '../handlers/pembangunan'
import type { DbDemo } from '@sinfodes/demo/tipe-db'
import { konteksWilayah, selisih, waktuTerakhir, type PenyusunBuku } from './tipe'

/** APBDes tahun terbaru dari basis data yang diberikan (penyusun tidak membaca basis data global). */
function apbdesDesa(db: DbDemo, desaId: string): Apbdes | undefined {
  return db.apbdes.filter((a) => a.desaId === desaId).sort((a, b) => b.tahun - a.tahun)[0]
}

/** Kegiatan desa beserta anggaran dan realisasinya dari rincian APBDes (SPEC §8), urut kode rekening. */
function kegiatanDesa(db: DbDemo, desaId: string): BarisKegiatan[] {
  const apbdes = apbdesDesa(db, desaId)
  return db.kegiatan
    .filter((k) => k.desaId === desaId)
    .sort((a, b) => a.kodeApbdes.localeCompare(b.kodeApbdes))
    .map((k) => barisKegiatan(k, apbdes))
}

/** Tanggal dokumentasi progres terakhir: tanda terakhir data pembangunan berubah. */
const dokumentasiTerakhir = (daftar: readonly BarisKegiatan[]) => waktuTerakhir(daftar.flatMap((k) => k.dokumentasi.map((d) => d.tanggal)))

const urutKode = (a: { kode: string }, b: { kode: string }) => a.kode.localeCompare(b.kode, 'id', { numeric: true })

/** Buku APB Desa, dari Keuangan: semua pos dan rinciannya, jumlah per kelompok, dan pembiayaan netto. */
export const bukuApbDesa: PenyusunBuku = (db, desaId) => {
  const kolom = ['Kode rekening', 'Uraian', 'Anggaran (Rp)', 'Realisasi (Rp)', 'Lebih/(kurang) (Rp)']
  const a = apbdesDesa(db, desaId)
  if (!a) return { kolom, baris: [], diperbarui: null }
  const baris: string[][] = []
  const tambah = (kode: string, uraian: string, anggaran: number, realisasi: number) =>
    baris.push([kode, uraian, formatAngka(anggaran), formatAngka(realisasi), selisih(realisasi - anggaran)])
  for (const [kelompok, label] of [['pendapatan', 'Jumlah pendapatan'], ['belanja', 'Jumlah belanja']] as const) {
    for (const p of a.pos.filter((x) => x.kelompok === kelompok).sort(urutKode)) tambah(p.kode, p.nama, p.anggaran, p.realisasi)
    const j = jumlahKelompok(a, kelompok)
    tambah('', label, j.anggaran, j.realisasi)
  }
  for (const p of a.pos.filter((x) => x.kelompok.startsWith('pembiayaan')).sort(urutKode)) tambah(p.kode, p.nama, p.anggaran, p.realisasi)
  const netto = pembiayaanNetto(a)
  tambah('', 'Pembiayaan netto', netto.anggaran, netto.realisasi)
  return { kolom, baris, diperbarui: a.sinkronPada }
}

/** Buku Rencana Anggaran Biaya, dari Pembangunan: anggaran tiap kegiatan menurut rincian APBDes. */
export const bukuRab: PenyusunBuku = (db, desaId) => {
  const kegiatan = kegiatanDesa(db, desaId)
  const total = kegiatan.reduce((n, k) => n + k.anggaran, 0)
  return {
    kolom: ['Kode rekening', 'Kegiatan', 'Volume', 'Lokasi', 'Sumber dana', 'Anggaran (Rp)'],
    baris: [
      ...kegiatan.map((k) => [k.kodeApbdes, k.nama, k.volume ?? '', k.lokasi, LABEL_SUMBER_DANA[k.sumberDana], formatAngka(k.anggaran)]),
      ['', 'Jumlah', '', '', '', formatAngka(total)],
    ],
    diperbarui: apbdesDesa(db, desaId)?.sinkronPada ?? null,
  }
}

/** Buku Rencana Kerja Pembangunan: semua kegiatan tahun berjalan. */
export const bukuRencanaKerja: PenyusunBuku = (db, desaId) => {
  const kegiatan = kegiatanDesa(db, desaId)
  return {
    kolom: ['No', 'Nama proyek/kegiatan', 'Lokasi', 'Sumber dana', 'Jumlah biaya (Rp)', 'Pelaksana', 'Target selesai', 'Keterangan'],
    baris: kegiatan.map((k, i) => [
      String(i + 1), k.nama, k.lokasi, LABEL_SUMBER_DANA[k.sumberDana], formatAngka(k.anggaran), k.pelaksana, formatTanggal(k.targetSelesai),
      LABEL_STATUS_KEGIATAN[k.status],
    ]),
    diperbarui: dokumentasiTerakhir(kegiatan),
  }
}

/** Buku Kegiatan Pembangunan: kegiatan yang sudah dimulai, dengan realisasi biaya dan progres fisik. */
export const bukuKegiatan: PenyusunBuku = (db, desaId) => {
  const kegiatan = kegiatanDesa(db, desaId).filter((k) => k.mulai !== null)
  return {
    kolom: ['No', 'Nama kegiatan', 'Volume', 'Sumber dana', 'Realisasi biaya (Rp)', 'Mulai', 'Target selesai', 'Pelaksana', 'Progres fisik'],
    baris: kegiatan.map((k, i) => [
      String(i + 1), k.nama, k.volume ?? '', LABEL_SUMBER_DANA[k.sumberDana], formatAngka(k.realisasi), k.mulai ? formatTanggal(k.mulai) : '',
      formatTanggal(k.targetSelesai), k.pelaksana, `${k.progresFisik}%`,
    ]),
    diperbarui: dokumentasiTerakhir(kegiatan),
  }
}

/** Buku Inventaris Hasil-hasil Pembangunan: kegiatan yang sudah selesai. */
export const bukuInventarisHasil: PenyusunBuku = (db, desaId) => {
  const { dusun, istilah } = konteksWilayah(db, desaId)
  const selesai = kegiatanDesa(db, desaId).filter((k) => k.status === 'selesai')
  return {
    kolom: ['No', 'Hasil pembangunan', 'Volume', 'Biaya (Rp)', 'Lokasi', 'Tanggal selesai', 'Sumber dana'],
    baris: selesai.map((k, i) => {
      const d = dusun.find((x) => x.id === k.dusunId)
      const tanggal = k.dokumentasi.find((x) => x.persen === 100)?.tanggal ?? k.targetSelesai
      return [
        String(i + 1), k.nama, k.volume ?? '', formatAngka(k.realisasi), d ? `${k.lokasi}, ${namaDusun(d, istilah)}` : k.lokasi,
        formatTanggal(tanggal), LABEL_SUMBER_DANA[k.sumberDana],
      ]
    }),
    diperbarui: dokumentasiTerakhir(selesai),
  }
}

const LEMBAGA_KADER: readonly JenisLembaga[] = ['lpm', 'pkk', 'kader-posyandu']

/** Buku Kader Pemberdayaan Masyarakat, dari Lembaga Desa: pengurus LPM, PKK, dan kader posyandu. */
export const bukuKader: PenyusunBuku = (db, desaId) => {
  const { dusun, istilah } = konteksWilayah(db, desaId)
  const kader = db.pengurusLembaga
    .filter((p) => p.desaId === desaId && LEMBAGA_KADER.includes(p.lembaga))
    .sort((a, b) => JENIS_LEMBAGA.indexOf(a.lembaga) - JENIS_LEMBAGA.indexOf(b.lembaga) || a.urutan - b.urutan)
  return {
    kolom: ['No', 'Nama', 'Lembaga', 'Jabatan', 'Wilayah', 'Masa bakti'],
    baris: kader.map((p, i) => {
      const d = dusun.find((x) => x.id === p.dusunId)
      return [String(i + 1), p.nama, LABEL_LEMBAGA[p.lembaga], p.jabatan, d ? namaDusun(d, istilah) : 'Desa', teksMasaBakti(p.masaBakti)]
    }),
    diperbarui: db.tanggalAcuan,
  }
}

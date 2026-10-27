import { formatTanggal, waktuIsoWib } from '@sinfodes/kontrak/format/tanggal'
import type { LaporanData } from '@sinfodes/kontrak/laporan/schema'
import type { Notifikasi } from '@sinfodes/kontrak/notifikasi/schema'
import type { Pengaduan } from '@sinfodes/kontrak/pengaduan/schema'
import { LABEL_FIELD } from '@sinfodes/kontrak/penduduk/riwayat'
import type { Penduduk } from '@sinfodes/kontrak/penduduk/schema'
import { boleh } from '@sinfodes/kontrak/pengguna/hak-akses'
import type { Peran, Pengguna } from '@sinfodes/kontrak/pengguna/schema'
import { labelPenandatangan } from '@sinfodes/kontrak/surat/arsip'
import type { JenisSurat } from '@sinfodes/kontrak/surat/jenis'
import type { Permohonan } from '@sinfodes/kontrak/surat/permohonan'
import type { Acak } from '../prng'

type Opsi = {
  desaId: string
  pengguna: readonly Pengguna[]
  penduduk: readonly Penduduk[]
  jenisSurat: readonly JenisSurat[]
  permohonan: readonly Permohonan[]
  laporanData: readonly LaporanData[]
  pengaduan: readonly Pengaduan[]
  acuan: Date
}

/** Banyaknya notifikasi terbaru yang belum dibaca per peran. Operator 3, seperti "Notifikasi 3" di SPEC §5.2. */
export const BELUM_DIBACA_AWAL: Readonly<Record<Peran, number>> = { operator: 3, sekdes: 2, kades: 1, 'kaur-keuangan': 1, kadus: 1 }

const HARI_MS = 86_400_000
type Bahan = Pick<Notifikasi, 'jenis' | 'judul' | 'isi' | 'waktu' | 'rujukan'> & {
  untuk: (p: Pengguna) => boolean
  /** Pelaku kejadian tidak menerima notifikasinya sendiri. */
  kecuali: string | null
}

/** Notifikasi sepekan terakhir dari data surat dan laporan warga, ditambah satu pengumuman Sinfodes (SPEC §5.5). */
export function bangkitkanNotifikasi(acak: Acak, o: Opsi): Notifikasi[] {
  const nama = new Map(o.penduduk.map((p) => [p.id, p.nama]))
  const kode = new Map(o.jenisSurat.map((j) => [j.id, j.kode]))
  const ringkas = (p: Permohonan) => `${kode.get(p.jenisId) ?? 'Surat'} · ${nama.get(p.pemohonId) ?? 'pemohon'}`
  const sepekan = o.acuan.getTime() - 7 * HARI_MS
  const baru = (waktu: string) => new Date(waktu).getTime() >= sepekan
  const pemroses = (p: Pengguna) => boleh(p.peran, 'surat.proses')
  const pengubahData = (p: Pengguna) => boleh(p.peran, 'penduduk.ubah')

  const bahan: Bahan[] = []
  for (const p of o.permohonan) {
    if (p.desaId !== o.desaId) continue
    const rujukan = { jenis: 'permohonan' as const, id: p.id }
    if (p.status === 'menunggu' && p.kanal === 'online' && baru(p.masukPada)) {
      bahan.push({
        jenis: 'permohonan-baru', judul: `Permohonan baru: ${ringkas(p)}`, isi: 'Diajukan lewat layanan warga. Periksa kelengkapan berkasnya.',
        waktu: p.masukPada, rujukan, untuk: pemroses, kecuali: null,
      })
    }
    if (p.terbit && baru(p.terbit.pada)) {
      bahan.push({
        jenis: 'surat-ditandatangani', judul: `${ringkas(p)} ditandatangani`,
        isi: `Nomor ${p.terbit.nomor} · ${labelPenandatangan(p.terbit.penandatangan)}`,
        waktu: p.terbit.pada, rujukan, untuk: pemroses, kecuali: p.terbit.penandatangan.id,
      })
    }
    if (p.dikembalikan) {
      bahan.push({
        jenis: 'surat-dikembalikan', judul: `${ringkas(p)} dikembalikan untuk diperbaiki`, isi: p.dikembalikan.catatan,
        waktu: p.dikembalikan.pada, rujukan, untuk: pemroses, kecuali: p.dikembalikan.oleh.id,
      })
    }
  }
  for (const l of o.laporanData) {
    if (l.desaId !== o.desaId || l.status !== 'baru') continue
    bahan.push(
      l.isi.jenis === 'kelahiran'
        ? {
            jenis: 'laporan-data', judul: `Laporan kelahiran dari ${l.pelapor.nama}`,
            isi: `${l.isi.nama}, lahir ${formatTanggal(l.isi.tanggalLahir)}. Belum dicatat.`,
            waktu: l.dibuatPada, rujukan: { jenis: 'laporan-kelahiran', id: l.id }, untuk: pengubahData, kecuali: null,
          }
        : {
            jenis: 'laporan-data', judul: `Laporan perbaikan data dari ${l.pelapor.nama}`,
            isi: `${LABEL_FIELD[l.isi.field]} seharusnya ${l.isi.nilaiBaru}.`,
            waktu: l.dibuatPada, rujukan: { jenis: 'penduduk', id: l.isi.pendudukId }, untuk: pengubahData, kecuali: null,
          },
    )
  }
  // Pengaduan yang belum dibalas: petugas yang menanggapi; Kepala Dusun hanya untuk dusunnya.
  for (const a of o.pengaduan) {
    if (a.desaId !== o.desaId || a.status !== 'baru' || !baru(a.masukPada)) continue
    bahan.push({
      jenis: 'pengaduan-baru', judul: `Pengaduan baru: ${a.judul}`, isi: `${a.kategori} · dari ${a.pelapor.nama}`,
      waktu: a.masukPada, rujukan: { jenis: 'pengaduan', id: a.id },
      untuk: (p) => boleh(p.peran, 'pengaduan.tanggapi') && (p.peran !== 'kadus' || p.dusunId === a.dusunId), kecuali: null,
    })
  }
  bahan.push({
    jenis: 'pengumuman', judul: 'Baru di Sinfodes: surat dari loket dan tumpukan tanda tangan',
    isi: 'Operator bisa membuat surat langsung di kantor desa, dan Kepala Desa menandatangani beberapa surat sekaligus dari satu tumpukan.',
    waktu: waktuIsoWib(new Date(o.acuan.getTime() - 3 * HARI_MS)), rujukan: null, untuk: () => true, kecuali: null,
  })

  const hasil: Notifikasi[] = []
  for (const p of o.pengguna) {
    if (p.desaId !== o.desaId || !p.aktif) continue
    const milik = bahan.filter((b) => b.untuk(p) && b.kecuali !== p.id).sort((a, b) => b.waktu.localeCompare(a.waktu))
    milik.forEach((b, i) => {
      hasil.push({
        id: acak.id('ntf'), desaId: o.desaId, penggunaId: p.id, jenis: b.jenis, judul: b.judul, isi: b.isi, waktu: b.waktu,
        rujukan: b.rujukan, dibaca: i >= BELUM_DIBACA_AWAL[p.peran],
      })
    })
  }
  return hasil
}

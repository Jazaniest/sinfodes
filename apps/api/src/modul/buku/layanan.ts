import { bukuBoleh, cariBuku, DAFTAR_BUKU, filterIsiBukuSchema, type IsiBuku, type KodeBuku, type RingkasBuku } from '@sinfodes/kontrak/buku/schema'
import type { IsiSusunan } from '@sinfodes/kontrak/buku/penduduk'
import type { Db } from '../../basisdata/klien'
import { GalatApp } from '../../galat'
import { galatIsian } from '../../galat-isian'
import type { Penyandi } from '../../kripto/penyandi'
import type { PelakuPanel } from '../../lapisan/konteks'
import { bacaBahanBukuPenduduk } from './bahan'
import { BUKU_MENUNGGU, SUSUNAN_BUKU } from './susunan'

export type KonteksBuku = { db: Db; penyandi: Penyandi; pelaku: PelakuPanel; hariIni: Date; desaId: string }
type DefinisiBuku = Pick<RingkasBuku, 'kode' | 'nama' | 'kelompok' | 'sumber'>

const ringkas = (b: DefinisiBuku, isi: IsiSusunan | null): RingkasBuku => ({
  kode: b.kode,
  nama: b.nama,
  kelompok: b.kelompok,
  sumber: b.sumber,
  jumlah: isi?.baris.length ?? null,
  diperbarui: isi?.diperbarui ?? null,
})

const adaSusunan = (kode: string): kode is KodeBuku => kode in SUSUNAN_BUKU

/** Daftar buku yang boleh dibuka peran ini; buku yang sumbernya sudah ada di server membawa jumlah dan waktu pembaruan. */
export async function daftarBuku(k: KonteksBuku): Promise<RingkasBuku[]> {
  const boleh = DAFTAR_BUKU.filter((b) => bukuBoleh(k.pelaku.peran, b.kelompok))
  const perlu = boleh.some((b) => adaSusunan(b.kode))
  const bahan = perlu ? await bacaBahanBukuPenduduk(k) : null
  return boleh.map((b) => {
    const susun = SUSUNAN_BUKU[b.kode]
    return ringkas(b, susun && bahan ? susun(bahan) : null)
  })
}

/**
 * Isi satu halaman buku. Urutan pemeriksaan sama dengan API tiruan: buku ada, peran berhak atas kelompoknya, sumber datanya
 * ada (buku manual dan buku yang menunggu tahap lain dijawab 404 dengan pesan berbeda), baru isinya disusun.
 */
export async function isiBuku(k: KonteksBuku, kode: string, mentahFilter: unknown): Promise<IsiBuku> {
  const buku = cariBuku(kode)
  if (!buku) throw new GalatApp('NOT_FOUND', 'Buku tidak ditemukan.', 404)
  if (!bukuBoleh(k.pelaku.peran, buku.kelompok)) throw new GalatApp('FORBIDDEN', 'Peran Anda tidak berhak membuka buku ini.', 403)
  const susun = adaSusunan(buku.kode) ? SUSUNAN_BUKU[buku.kode] : undefined
  if (!susun) {
    if (buku.kode in BUKU_MENUNGGU) throw new GalatApp('NOT_FOUND', 'Sumber data buku ini belum tersedia di Sinfodes.', 404)
    throw new GalatApp('NOT_FOUND', 'Buku ini diisi manual dan belum tersedia di Sinfodes.', 404)
  }
  const filter = filterIsiBukuSchema.safeParse(mentahFilter)
  if (!filter.success) throw galatIsian(filter.error)
  const isi = susun(await bacaBahanBukuPenduduk(k))
  const { page, pageSize } = filter.data
  return {
    buku: ringkas(buku, isi),
    kolom: [...isi.kolom],
    baris: isi.baris.slice((page - 1) * pageSize, page * pageSize),
    meta: { page, pageSize, total: isi.baris.length },
  }
}

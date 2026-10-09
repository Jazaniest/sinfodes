import { boleh } from '../pengguna/hak-akses'
import type { Peran } from '../pengguna/schema'
import type { JenisSurat } from './jenis'
import { AKSI_SURAT, type AksiSurat, type KejadianSurat, type Permohonan, type TahapTtd } from './permohonan'

type Keadaan = Pick<Permohonan, 'status' | 'tahap' | 'diambil'>

/** Aksi yang sah untuk status saat ini (SPEC §7.1). */
export function statusMengizinkan(aksi: AksiSurat, p: Keadaan): boolean {
  switch (aksi) {
    case 'proses':
      return p.status === 'menunggu'
    case 'tolak':
      return p.status === 'menunggu' || p.status === 'diproses'
    case 'ajukan-ttd':
      return p.status === 'diproses'
    case 'paraf':
      return p.status === 'perlu-ttd' && p.tahap === 'paraf'
    case 'kembalikan':
      return p.status === 'perlu-ttd'
    case 'tandatangani':
      return p.status === 'perlu-ttd' && p.tahap === 'tanda-tangan'
    case 'batalkan':
    case 'kirim-wa':
      return p.status === 'selesai'
    case 'tandai-diambil':
      return p.status === 'selesai' && p.diambil === null
  }
}

/** Peran yang berhak (SPEC §5.1, §7.4). Sekdes menandatangani a.n. Kepala Desa hanya bila jenis suratnya mengizinkan. */
export function peranMengizinkan(aksi: AksiSurat, peran: Peran, jenis: Pick<JenisSurat, 'bolehAtasNama'>): boolean {
  switch (aksi) {
    case 'proses':
    case 'tolak':
    case 'ajukan-ttd':
      return boleh(peran, 'surat.proses')
    case 'paraf':
      return boleh(peran, 'surat.paraf')
    case 'kembalikan':
      return boleh(peran, 'surat.paraf') || boleh(peran, 'surat.tandatangani')
    case 'tandatangani':
      return peran === 'kades' || (boleh(peran, 'surat.tandatangani') && jenis.bolehAtasNama)
    case 'batalkan':
      return boleh(peran, 'surat.tandatangani')
    case 'tandai-diambil':
    case 'kirim-wa':
      return boleh(peran, 'surat.proses') || boleh(peran, 'surat.tandatangani')
  }
}

export function aksiTersedia(p: Keadaan, jenis: Pick<JenisSurat, 'bolehAtasNama'>, peran: Peran): AksiSurat[] {
  return AKSI_SURAT.filter((a) => peranMengizinkan(a, peran, jenis) && statusMengizinkan(a, p))
}

export function tahapAwalTtd(jenis: Pick<JenisSurat, 'wajibParaf'>): TahapTtd {
  return jenis.wajibParaf ? 'paraf' : 'tanda-tangan'
}

/** Angka di samping menu Layanan Surat: yang perlu ditindaklanjuti peran aktif (SPEC §5.2, §5.3). */
export function perluTindakan(peran: Peran, daftar: readonly Pick<Permohonan, 'status' | 'tahap' | 'dikembalikan'>[]): number {
  let jumlah = 0
  for (const p of daftar) {
    const pengolah = p.status === 'menunggu' || (p.status === 'diproses' && p.dikembalikan !== null)
    if (pengolah && boleh(peran, 'surat.proses')) jumlah++
    if (p.status === 'perlu-ttd' && p.tahap === 'paraf' && boleh(peran, 'surat.paraf')) jumlah++
    if (p.status === 'perlu-ttd' && p.tahap === 'tanda-tangan' && peran === 'kades') jumlah++
  }
  return jumlah
}

export const LABEL_AKSI: Readonly<Record<AksiSurat, string>> = {
  proses: 'Proses',
  tolak: 'Tolak',
  'ajukan-ttd': 'Ajukan tanda tangan',
  paraf: 'Paraf',
  kembalikan: 'Kembalikan',
  tandatangani: 'Tanda tangani',
  batalkan: 'Batalkan surat',
  'tandai-diambil': 'Tandai sudah diambil',
  'kirim-wa': 'Kirim ke WhatsApp',
}

export const JUDUL_KEJADIAN: Readonly<Record<KejadianSurat, string>> = {
  diajukan: 'Diajukan lewat layanan warga',
  dibuat: 'Dibuat di loket',
  disimpan: 'Isian diubah',
  proses: 'Mulai diproses',
  tolak: 'Ditolak',
  'ajukan-ttd': 'Diajukan untuk tanda tangan',
  paraf: 'Diparaf',
  kembalikan: 'Dikembalikan untuk diperbaiki',
  tandatangani: 'Ditandatangani, nomor diberikan',
  batalkan: 'Dibatalkan',
  'tandai-diambil': 'Ditandai sudah diambil',
  'kirim-wa': 'Dikirim ke WhatsApp',
}

import { JENIS_SURAT_BAWAAN } from '@/domain/surat/bawaan'
import type { JenisSurat } from '@/domain/surat/jenis'
import type { Permohonan } from '@/domain/surat/permohonan'

/** Jenis surat bawaan Desa Sungai Sialang, sama seperti di data demo. Khusus uji. */
export function contohJenis(kode: string): JenisSurat {
  const j = JENIS_SURAT_BAWAAN.find((x) => x.kode === kode)
  if (!j) throw new Error(`Jenis surat ${kode} tidak ada`)
  return { ...structuredClone(j), id: `js_ss_${kode.toLowerCase()}`, desaId: 'desa_sungai_sialang', asal: 'bawaan', diarsipkan: null, tataLetak: null }
}

/** Permohonan Domisili Siti Rahmah yang sedang diproses; ubah field lewat `ubah`. Khusus uji. */
export function contohPermohonan(ubah: Partial<Permohonan> = {}): Permohonan {
  return {
    id: 'srt_contoh',
    desaId: 'desa_sungai_sialang',
    dusunId: 'dsn_ss_1',
    noUrut: 87,
    jenisId: 'js_ss_skd',
    kanal: 'online',
    pemohonId: 'pdk_siti_rahmah',
    subjekId: null,
    mutasiId: null,
    isian: { keperluan: 'pendaftaran sekolah anak' },
    status: 'diproses',
    tahap: null,
    dikembalikan: null,
    penolakan: null,
    pembatalan: null,
    diambil: null,
    masukPada: '2026-09-23T10:12:00+07:00',
    ditutupPada: null,
    lampiran: [{ id: 'lmp_1', syarat: 'KTP', berkas: 'ktp-siti-rahmah.jpg', ukuranKb: 412 }],
    catatanInternal: null,
    riwayat: [
      { id: 'rws_1', kejadian: 'diajukan', waktu: '2026-09-23T10:12:00+07:00', oleh: { id: 'pdk_siti_rahmah', nama: 'Siti Rahmah' }, catatan: null },
    ],
    terbit: null,
    ...ubah,
  }
}

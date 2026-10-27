import { useMutation, useQueryClient } from '@tanstack/react-query'
import { GalatApi, pesanGalat } from '@/api/galat'
import { segarkanSurat } from '@/api/segarkan'
import { jalankanAksi, kunciSurat } from '@/api/surat'
import { samarkanTelepon } from '@/domain/format/telepon'
import type { AksiSurat, DetailPermohonan } from '@/domain/surat/permohonan'
import { tampilkanToast } from '@/ui/toast/antrean'

export function pesanBerhasil(baru: DetailPermohonan, aksi: AksiSurat): string {
  const p = baru.permohonan
  switch (aksi) {
    case 'proses':
      return 'Permohonan mulai diproses.'
    case 'tolak':
      return 'Permohonan ditolak.'
    case 'ajukan-ttd':
      return p.tahap === 'paraf' ? 'Diajukan ke Sekretaris Desa untuk paraf.' : 'Diajukan ke Kepala Desa untuk tanda tangan.'
    case 'paraf':
      return 'Surat diparaf. Kini menunggu tanda tangan Kepala Desa.'
    case 'kembalikan':
      return 'Surat dikembalikan ke operator untuk diperbaiki.'
    case 'tandatangani':
      return `Surat ditandatangani. Nomor ${p.terbit?.nomor ?? ''}.`
    case 'batalkan':
      return 'Surat dibatalkan. Nomornya tetap tercatat.'
    case 'tandai-diambil':
      return 'Ditandai sudah diambil.'
    case 'kirim-wa':
      return `Pesan terkirim ke ${samarkanTelepon(baru.pemohon.telepon ?? '')}`
  }
}

export type AksiAlasan = 'tolak' | 'kembalikan' | 'batalkan'

/** Isi dialog aksi yang wajib beralasan (SPEC §7.1); dipakai ruang kerja dan tumpukan tanda tangan. */
export const DIALOG_ALASAN: Readonly<
  Record<AksiAlasan, { judul: string; label: string; keterangan: string; labelSetuju: string; bahaya: boolean; kunci: 'alasan' | 'catatan' }>
> = {
  tolak: {
    judul: 'Tolak permohonan?', label: 'Alasan penolakan', labelSetuju: 'Tolak permohonan', bahaya: true, kunci: 'alasan',
    keterangan: 'Alasan ini dibaca pemohon. Tulis apa yang perlu diperbaiki atau dilengkapi.',
  },
  kembalikan: {
    judul: 'Kembalikan ke operator?', label: 'Catatan perbaikan', labelSetuju: 'Kembalikan', bahaya: false, kunci: 'catatan',
    keterangan: 'Tulis apa yang perlu diperbaiki sebelum surat diajukan lagi.',
  },
  batalkan: {
    judul: 'Batalkan surat ini?', label: 'Alasan pembatalan', labelSetuju: 'Batalkan surat', bahaya: true, kunci: 'alasan',
    keterangan: 'Surat yang sudah terbit tidak dihapus. Nomornya tetap tercatat dan tidak dipakai ulang.',
  },
}

type Opsi = {
  onBerhasil?: (baru: DetailPermohonan, aksi: AksiSurat) => void
  /** Galat per isian dari "Ajukan tanda tangan" (fields `isian.<kunci>`). */
  onGalatIsian?: (galat: Record<string, string>) => void
  /** Galat satu kolom dialog (alasan, catatan, passphrase). Kembalikan true bila sudah ditampilkan di dialog. */
  onGalatKolom?: (pesan: string) => boolean
  /** Status sudah diubah orang lain (`CONFLICT`); data sudah dimuat ulang. */
  onKonflik?: () => void
}

/**
 * Aksi status satu permohonan (SPEC §7.1), dipakai ruang kerja dan tumpukan tanda tangan: cache detail diganti hasil
 * aksi, data terkait dimuat ulang, dan hasilnya diumumkan lewat toast.
 */
export function useAksiSurat(id: string, opsi: Opsi = {}) {
  const queryClient = useQueryClient()
  const mutasi = useMutation({
    mutationFn: ({ aksi, body }: { aksi: AksiSurat; body?: object }) => jalankanAksi(id, aksi, body),
    onSuccess: (baru, { aksi }) => {
      queryClient.setQueryData(kunciSurat.detail(id), baru)
      void segarkanSurat(queryClient)
      opsi.onBerhasil?.(baru, aksi)
      tampilkanToast({ pesan: pesanBerhasil(baru, aksi), nada: 'berhasil' })
    },
    onError: (galat) => {
      if (galat instanceof GalatApi && galat.kode === 'VALIDATION') {
        const isianSalah = Object.fromEntries(
          Object.entries(galat.fields).flatMap(([kunci, pesan]) => (kunci.startsWith('isian.') ? [[kunci.slice(6), pesan]] : [])),
        )
        if (Object.keys(isianSalah).length > 0 && opsi.onGalatIsian) {
          opsi.onGalatIsian(isianSalah)
          tampilkanToast({ pesan: 'Isian surat belum lengkap. Periksa isian yang ditandai.', nada: 'galat' })
          return
        }
        const pesanKolom = Object.values(galat.fields)[0]
        if (pesanKolom && opsi.onGalatKolom?.(pesanKolom)) return
      }
      if (galat instanceof GalatApi && galat.kode === 'CONFLICT') {
        void queryClient.invalidateQueries({ queryKey: kunciSurat.detail(id) })
        void queryClient.invalidateQueries({ queryKey: kunciSurat.antrian })
        opsi.onKonflik?.()
      }
      tampilkanToast({ pesan: pesanGalat(galat), nada: 'galat' })
    },
  })
  return {
    jalan: (aksi: AksiSurat, body?: object) => mutasi.mutate({ aksi, body }),
    sedang: mutasi.isPending,
    /** Aksi yang sedang dikirim, untuk tombol yang menampilkan "memuat". */
    berjalan: mutasi.isPending ? (mutasi.variables?.aksi ?? null) : null,
  }
}

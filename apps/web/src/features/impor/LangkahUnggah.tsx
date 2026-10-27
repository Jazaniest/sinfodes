import { DownloadSimple } from '@phosphor-icons/react'
import { useMutation } from '@tanstack/react-query'
import { pesanGalat } from '@/api/galat'
import { unggahImpor } from '@/api/impor'
import { keCsv } from '@/domain/format/csv'
import { barisTemplate } from '@/domain/impor/kolom'
import type { LaporanImpor } from '@/domain/impor/schema'
import { FileDrop } from '@/ui/isian/FileDrop'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'
import { unduhBerkas } from '@/ui/unduh'

/** Langkah 1 impor (SPEC §6.8): unggah berkas, unduh template, atau coba dengan berkas contoh. */
export function LangkahUnggah({ onTerbaca }: { onTerbaca: (laporan: LaporanImpor) => void }) {
  const unggah = useMutation({
    mutationFn: (berkas: File | null) => unggahImpor(berkas),
    onSuccess: onTerbaca,
    onError: (galat) => tampilkanToast({ pesan: pesanGalat(galat), nada: 'galat' }),
  })
  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <p className="text-tinta-2">
        Unggah data penduduk dalam berkas Excel (.xlsx) atau CSV, satu baris per penduduk. Kolom dicocokkan otomatis dari
        nama kepala kolom, dan bisa diubah di langkah berikutnya. Belum ada data yang disimpan sampai langkah terakhir.
      </p>
      <FileDrop
        label="Berkas data penduduk"
        terima={['.xlsx', '.csv']}
        maksMb={10}
        keterangan="Maksimal 10 MB."
        isDisabled={unggah.isPending}
        onPilih={(berkas) => unggah.mutate(berkas)}
      />
      {unggah.isPending && (
        <p role="status" className="text-teks-kecil text-tinta-2">
          Membaca dan memeriksa berkas…
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Tombol
          ikon={<DownloadSimple aria-hidden size={16} />}
          onPress={() => unduhBerkas('template-impor-penduduk.csv', keCsv(barisTemplate()))}
        >
          Unduh template
        </Tombol>
        <Tombol varian="teks" isDisabled={unggah.isPending} onPress={() => unggah.mutate(null)}>
          Coba dengan file contoh
        </Tombol>
      </div>
    </div>
  )
}

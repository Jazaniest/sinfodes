import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { pesanGalat } from '@/api/galat'
import { tolakLaporan } from '@/api/laporan'
import { segarkanKependudukan } from '@/api/segarkan'
import type { LaporanData } from '@/domain/laporan/schema'
import { TextArea } from '@/ui/isian/TextArea'
import { Dialog } from '@/ui/lapisan/Dialog'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'

/** Tolak laporan warga dengan alasan yang tidak wajib (SPEC §6.3). */
export function DialogTolakLaporan({ laporan, onTutup }: { laporan: LaporanData; onTutup: () => void }) {
  const [alasan, setAlasan] = useState('')
  const queryClient = useQueryClient()
  const tolak = useMutation({
    mutationFn: () => tolakLaporan(laporan.id, alasan.trim() || null),
    onSuccess: () => {
      void segarkanKependudukan(queryClient)
      tampilkanToast({ pesan: 'Laporan warga ditolak.', nada: 'berhasil' })
      onTutup()
    },
    onError: (galat) => tampilkanToast({ pesan: pesanGalat(galat), nada: 'galat' }),
  })
  return (
    <Dialog
      isOpen
      onOpenChange={(buka) => {
        if (!buka) onTutup()
      }}
      judul="Tolak laporan warga?"
      subjudul={`Dari ${laporan.pelapor.nama}`}
      aksi={
        <>
          <Tombol onPress={onTutup}>Batal</Tombol>
          <Tombol varian="bahaya" memuat={tolak.isPending} onPress={() => tolak.mutate()}>
            Tolak laporan
          </Tombol>
        </>
      }
    >
      <TextArea
        label="Alasan (tidak wajib)"
        value={alasan}
        onChange={setAlasan}
        maxLength={300}
        keterangan="Membantu warga memahami mengapa datanya tidak diubah."
      />
    </Dialog>
  )
}

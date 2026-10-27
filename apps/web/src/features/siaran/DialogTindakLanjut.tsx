import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { GalatApi, pesanGalat } from '@/api/galat'
import { kunciDetailSiaranDesa, kunciSiaranDesa, tandaiTindakLanjut } from '@/api/siaran'
import { formatTanggal } from '@/domain/format/tanggal'
import { MAKS_CATATAN_TINDAK_LANJUT, type DetailSiaranDesa } from '@/domain/kabupaten/siaran'
import { TextArea } from '@/ui/isian/TextArea'
import { Dialog } from '@/ui/lapisan/Dialog'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'

type Props = { siaran: DetailSiaranDesa; onTutup: () => void }

/**
 * Tandai siaran sudah ditindaklanjuti (SPEC-V0.2 §8.4), dengan catatan opsional yang dilihat kabupaten. Bila kabupaten sudah
 * menariknya atau desa lain sudah menandai (409), dialog ditutup dan detailnya dimuat ulang.
 */
export function DialogTindakLanjut({ siaran, onTutup }: Props) {
  const queryClient = useQueryClient()
  const [catatan, setCatatan] = useState('')
  const [galat, setGalat] = useState<string | undefined>()
  const mengirim = useRef(false)
  const muatUlang = () => queryClient.invalidateQueries({ queryKey: kunciSiaranDesa })
  const tandai = useMutation({
    mutationFn: () => tandaiTindakLanjut(siaran.id, catatan),
    onSuccess: (hasil) => {
      queryClient.setQueryData(kunciDetailSiaranDesa(siaran.id), hasil)
      void muatUlang()
      tampilkanToast({ pesan: 'Siaran ditandai sudah ditindaklanjuti.', nada: 'berhasil' })
      onTutup()
    },
    onError: (e) => {
      if (e instanceof GalatApi && e.fields.catatan) {
        setGalat(e.fields.catatan)
        return
      }
      tampilkanToast({ pesan: pesanGalat(e), nada: 'galat' })
      if (e instanceof GalatApi && e.status === 409) {
        void muatUlang()
        onTutup()
      }
    },
    onSettled: () => {
      mengirim.current = false
    },
  })
  const tekan = () => {
    if (mengirim.current) return
    if (catatan.trim().length > MAKS_CATATAN_TINDAK_LANJUT) {
      setGalat('Paling banyak 500 karakter.')
      return
    }
    mengirim.current = true
    tandai.mutate()
  }
  return (
    <Dialog
      isOpen
      onOpenChange={(buka) => {
        if (!buka) onTutup()
      }}
      judul="Tandai sudah ditindaklanjuti"
      subjudul={siaran.tindakLanjut ? `${siaran.judul} · tenggat ${formatTanggal(siaran.tindakLanjut.tenggat)}` : siaran.judul}
      aksi={
        <>
          <Tombol onPress={onTutup}>Batal</Tombol>
          <Tombol varian="utama" memuat={tandai.isPending} onPress={tekan}>
            Tandai
          </Tombol>
        </>
      }
    >
      <TextArea
        label="Catatan (opsional)"
        value={catatan}
        onChange={(v) => {
          setCatatan(v)
          setGalat(undefined)
        }}
        keterangan="Terlihat oleh kabupaten. Paling banyak 500 karakter."
        galat={galat}
      />
    </Dialog>
  )
}

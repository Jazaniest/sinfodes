import type { TemaGaleri } from '@/features/website/galeri-tema'
import { PASANGAN_HURUF } from '@/domain/website/tema'
import { Dialog } from '@/ui/lapisan/Dialog'
import { Tombol } from '@/ui/tombol/Tombol'
import { FOTO, KEPALA } from './pilihan'

type Props = {
  tema: TemaGaleri | null
  onTutup: () => void
  onPakai: (tema: TemaGaleri) => void
}

/** Gambar pratinjau tema dalam ukuran besar, dengan ringkasan pengaturannya. */
export function DialogPratinjauTema({ tema, onTutup, onPakai }: Props) {
  return (
    <Dialog
      isOpen={tema !== null}
      onOpenChange={(buka) => {
        if (!buka) onTutup()
      }}
      judul={tema ? `Tema ${tema.nama}` : ''}
      subjudul={tema?.keterangan}
      lebar="lebar"
      aksi={
        tema && (
          <>
            <Tombol onPress={onTutup}>Tutup</Tombol>
            <Tombol varian="utama" onPress={() => onPakai(tema)}>
              Pakai tema ini
            </Tombol>
          </>
        )
      }
    >
      {tema && (
        <div className="flex flex-col gap-3">
          <img
            src={tema.pratinjau}
            alt={`Pratinjau tema ${tema.nama}, ukuran besar`}
            width={1280}
            height={800}
            className="w-full rounded-1 border border-garis"
          />
          <p className="text-teks-kecil text-tinta-2">
            Huruf {PASANGAN_HURUF[tema.dasar.huruf].label} · kepala {KEPALA[tema.dasar.kepala].label.toLowerCase()} · foto{' '}
            {FOTO[tema.dasar.foto].label.toLowerCase()} · kepadatan {tema.dasar.kepadatan}
          </p>
        </div>
      )}
    </Dialog>
  )
}

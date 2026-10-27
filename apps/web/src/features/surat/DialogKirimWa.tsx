import { WhatsappLogo } from '@phosphor-icons/react'
import { Dialog } from '@/ui/lapisan/Dialog'
import { Tombol } from '@/ui/tombol/Tombol'

type Props = { pesan: string; tujuan: string; memuat: boolean; onKirim: () => void; onTutup: () => void }

/** Pratinjau pesan sebelum dikirim ke WhatsApp pemohon (SPEC §7.4). Pengirimannya masih tiruan. */
export function DialogKirimWa({ pesan, tujuan, memuat, onKirim, onTutup }: Props) {
  return (
    <Dialog
      isOpen
      onOpenChange={(buka) => {
        if (!buka) onTutup()
      }}
      judul="Kirim ke WhatsApp?"
      subjudul={`Ke ${tujuan}`}
      aksi={
        <>
          <Tombol onPress={onTutup}>Batal</Tombol>
          <Tombol varian="utama" ikon={<WhatsappLogo aria-hidden size={16} />} memuat={memuat} onPress={onKirim}>
            Kirim
          </Tombol>
        </>
      }
    >
      <p className="text-label font-medium text-tinta-2 uppercase">Pratinjau pesan</p>
      <p className="mt-2 rounded-2 border border-garis bg-kertas px-4 py-3 whitespace-pre-line">{pesan}</p>
    </Dialog>
  )
}

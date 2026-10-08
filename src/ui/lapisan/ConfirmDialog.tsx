import type { ReactNode } from 'react'
import { Tombol } from '../tombol/Tombol'
import { Dialog } from './Dialog'

type Props = {
  isOpen: boolean
  onOpenChange: (buka: boolean) => void
  judul: string
  children: ReactNode
  labelSetuju: string
  labelBatal?: string
  /** Tombol setuju berwarna merah, untuk tindakan yang membuang sesuatu. */
  bahaya?: boolean
  memuat?: boolean
  onSetuju: () => void
}

/** Konfirmasi sebelum tindakan penting (SPEC §4.4). Batal dan Esc sama-sama menutup tanpa melakukan apa pun. */
export function ConfirmDialog({
  isOpen, onOpenChange, judul, children, labelSetuju, labelBatal = 'Batal', bahaya = false, memuat = false, onSetuju,
}: Props) {
  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      judul={judul}
      peran="alertdialog"
      aksi={
        <>
          <Tombol onPress={() => onOpenChange(false)} isDisabled={memuat}>
            {labelBatal}
          </Tombol>
          <Tombol varian={bahaya ? 'bahaya' : 'utama'} memuat={memuat} onPress={onSetuju}>
            {labelSetuju}
          </Tombol>
        </>
      }
    >
      <div className="text-tinta">{children}</div>
    </Dialog>
  )
}

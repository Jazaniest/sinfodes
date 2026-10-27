import type { ReactNode } from 'react'
import { Dialog as RacDialog, Heading, Modal, ModalOverlay } from 'react-aria-components'
import { cn } from '../cn'

type Props = {
  isOpen: boolean
  onOpenChange: (buka: boolean) => void
  judul: string
  /** Baris kecil di bawah judul, mis. "Langkah 2 dari 3 · Kepala dan alamat". */
  subjudul?: string
  children: ReactNode
  aksi?: ReactNode
  lebar?: 'sedang' | 'lebar'
  /** alertdialog untuk konfirmasi: klik di luar tidak menutupnya. */
  peran?: 'dialog' | 'alertdialog'
}

/** Dialog di tengah layar (SPEC §4.4). Esc menutupnya; fokus terkunci di dalam selama terbuka. */
export function Dialog({ isOpen, onOpenChange, judul, subjudul, children, aksi, lebar = 'sedang', peran = 'dialog' }: Props) {
  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable={peran === 'dialog'}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-tirai px-4 py-[8vh]"
    >
      <Modal
        className={cn(
          'w-full rounded-2 border border-garis bg-lembar shadow-melayang outline-none',
          lebar === 'lebar' ? 'max-w-3xl' : 'max-w-lg',
        )}
      >
        <RacDialog role={peran} className="outline-none">
          <header className="border-b border-garis px-5 py-4">
            <Heading slot="title" className="font-serif text-judul-bagian font-medium">
              {judul}
            </Heading>
            {subjudul && <p className="mt-0.5 text-teks-kecil text-tinta-2">{subjudul}</p>}
          </header>
          <div className="px-5 py-4">{children}</div>
          {aksi && <footer className="flex flex-wrap justify-end gap-2 border-t border-garis px-5 py-3">{aksi}</footer>}
        </RacDialog>
      </Modal>
    </ModalOverlay>
  )
}

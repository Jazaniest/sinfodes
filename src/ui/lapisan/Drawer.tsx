import { X } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { Button, Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components'
import { cn } from '../cn'

type Props = {
  isOpen: boolean
  onOpenChange: (buka: boolean) => void
  judul: string
  children: ReactNode
  aksi?: ReactNode
  sisi?: 'kanan' | 'kiri'
}

/** Laci samping (SPEC §4.4): ringkasan baris tabel, atau menu navigasi di layar < 1024px. */
export function Drawer({ isOpen, onOpenChange, judul, children, aksi, sisi = 'kanan' }: Props) {
  return (
    <ModalOverlay isOpen={isOpen} onOpenChange={onOpenChange} isDismissable className="fixed inset-0 z-40 bg-tirai">
      <Modal
        className={cn(
          'fixed inset-y-0 flex w-[min(440px,100vw)] flex-col bg-lembar shadow-melayang outline-none',
          sisi === 'kanan' ? 'right-0 border-l border-garis' : 'left-0 border-r border-garis',
        )}
      >
        <Dialog className="flex h-full min-h-0 flex-col outline-none">
          {({ close }) => (
            <>
              <header className="flex items-start justify-between gap-3 border-b border-garis px-5 py-4">
                <Heading slot="title" className="min-w-0 font-serif text-judul-bagian font-medium">
                  {judul}
                </Heading>
                <Button
                  aria-label="Tutup"
                  onPress={close}
                  className="shrink-0 rounded-1 p-1 text-tinta-2 outline-none hover:text-tinta data-[focus-visible]:outline-2 data-[focus-visible]:outline-solid data-[focus-visible]:outline-biru"
                >
                  <X aria-hidden size={16} />
                </Button>
              </header>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
              {aksi && <footer className="flex flex-wrap gap-2 border-t border-garis px-5 py-3">{aksi}</footer>}
            </>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}

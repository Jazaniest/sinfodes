import { Check } from '@phosphor-icons/react'
import type { ReactElement } from 'react'
import { Header, Menu, MenuItem, MenuSection, MenuTrigger, Popover, type PopoverProps } from 'react-aria-components'
import { cn } from '../cn'

export type ItemMenuAksi = {
  id: string
  label: string
  onAction?: () => void
  href?: string
  bahaya?: boolean
  /** Tetap tampil tetapi tidak bisa dipilih, mis. "Unduh CSV" saat daftar kosong. */
  nonaktif?: boolean
}

/** Kelompok pilihan tunggal di bawah aksi, mis. "Tampilan: Terang, Gelap, Ikuti perangkat". */
export type KelompokPilihanMenu = {
  judul: string
  nilai: string
  opsi: readonly { id: string; label: string }[]
  onUbah: (id: string) => void
}

type Props = { pemicu: ReactElement; items: readonly ItemMenuAksi[]; pilihan?: KelompokPilihanMenu; placement?: PopoverProps['placement'] }

const kelasItem = 'cursor-default px-3 py-2 text-teks outline-none data-[focused]:bg-biru-muda'

/** Menu aksi kecil, mis. akun di sidebar. `pemicu` harus Button React Aria. */
export function MenuAksi({ pemicu, items, pilihan, placement = 'bottom start' }: Props) {
  return (
    <MenuTrigger>
      {pemicu}
      <Popover
        placement={placement}
        offset={4}
        className="min-w-44 rounded-2 border border-garis bg-lembar py-1 shadow-melayang outline-none data-[entering]:animate-muncul"
      >
        <Menu className="outline-none" onAction={(id) => items.find((i) => i.id === id)?.onAction?.()}>
          {items.map((i) => (
            <MenuItem
              key={i.id}
              id={i.id}
              href={i.href}
              isDisabled={i.nonaktif}
              className={cn(kelasItem, i.bahaya ? 'text-merah' : 'text-tinta', 'data-[disabled]:text-tinta-3')}
            >
              {i.label}
            </MenuItem>
          ))}
          {pilihan && (
            <MenuSection
              selectionMode="single"
              disallowEmptySelection
              selectedKeys={[pilihan.nilai]}
              onSelectionChange={(k) => {
                const id = [...k][0]
                if (typeof id === 'string') pilihan.onUbah(id)
              }}
              className="mt-1 border-t border-garis pt-1"
            >
              <Header className="px-3 pt-1.5 pb-1 text-label font-medium text-tinta-2 uppercase">{pilihan.judul}</Header>
              {pilihan.opsi.map((o) => (
                <MenuItem key={o.id} id={o.id} textValue={o.label} className={cn(kelasItem, 'flex items-center justify-between gap-4 text-tinta')}>
                  {({ isSelected }) => (
                    <>
                      {o.label}
                      {isSelected && <Check aria-hidden size={14} weight="bold" />}
                    </>
                  )}
                </MenuItem>
              ))}
            </MenuSection>
          )}
        </Menu>
      </Popover>
    </MenuTrigger>
  )
}

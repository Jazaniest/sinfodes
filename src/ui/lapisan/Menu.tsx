import type { ReactElement } from 'react'
import { Menu, MenuItem, MenuTrigger, Popover, type PopoverProps } from 'react-aria-components'
import { cn } from '../cn'

export type ItemMenuAksi = { id: string; label: string; onAction?: () => void; href?: string; bahaya?: boolean }

type Props = { pemicu: ReactElement; items: readonly ItemMenuAksi[]; placement?: PopoverProps['placement'] }

/** Menu aksi kecil, mis. akun di sidebar. `pemicu` harus Button React Aria. */
export function MenuAksi({ pemicu, items, placement = 'bottom start' }: Props) {
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
              className={cn(
                'cursor-default px-3 py-2 text-teks outline-none data-[focused]:bg-biru-muda',
                i.bahaya ? 'text-merah' : 'text-tinta',
              )}
            >
              {i.label}
            </MenuItem>
          ))}
        </Menu>
      </Popover>
    </MenuTrigger>
  )
}

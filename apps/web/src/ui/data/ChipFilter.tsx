import { Check } from '@phosphor-icons/react'
import { ToggleButton, ToggleButtonGroup } from 'react-aria-components'

export type OpsiChip = { id: string; label: string }

type Props = { label: string; pilihan: readonly OpsiChip[]; nilai: string; onUbah: (id: string) => void }

/** Chip filter satu pilihan (grup radio). Pilihan aktif ditandai centang dan tebal, tidak hanya warna. */
export function ChipFilter({ label, pilihan, nilai, onUbah }: Props) {
  return (
    <ToggleButtonGroup
      aria-label={label}
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[nilai]}
      onSelectionChange={(keys) => {
        const [pertama] = [...keys]
        if (pertama !== undefined) onUbah(String(pertama))
      }}
      className="flex flex-wrap gap-2"
    >
      {pilihan.map((c) => (
        <ToggleButton
          key={c.id}
          id={c.id}
          className="inline-flex items-center gap-1 rounded-penuh border border-garis-input bg-lembar px-3 py-1 text-teks-kecil text-tinta outline-none data-[hovered]:bg-kertas-2 data-[selected]:border-biru data-[selected]:bg-biru-muda data-[selected]:font-medium data-[focus-visible]:outline-2 data-[focus-visible]:outline-solid data-[focus-visible]:outline-offset-2 data-[focus-visible]:outline-biru"
        >
          {({ isSelected }) => (
            <>
              {isSelected && <Check aria-hidden size={12} weight="bold" />}
              {c.label}
            </>
          )}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  )
}

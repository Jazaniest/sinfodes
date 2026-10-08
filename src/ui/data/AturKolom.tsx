import { Columns } from '@phosphor-icons/react'
import { Checkbox } from '../isian/Checkbox'
import { PopoverTombol } from '../lapisan/Popover'

export type OpsiKolom = { id: string; judul: string; wajib?: boolean }

type Props = { kolom: readonly OpsiKolom[]; tampil: ReadonlySet<string>; onUbah: (id: string, tampil: boolean) => void }

export function AturKolom({ kolom, tampil, onUbah }: Props) {
  return (
    <PopoverTombol label="Atur kolom" judul="Atur kolom" ikon={<Columns aria-hidden size={16} />} lebar="w-64">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-label font-medium text-tinta-2 uppercase">Kolom yang ditampilkan</legend>
        {kolom.map((k) => (
          <Checkbox
            key={k.id}
            isSelected={Boolean(k.wajib) || tampil.has(k.id)}
            isDisabled={k.wajib}
            onChange={(nilai) => onUbah(k.id, nilai)}
          >
            {k.judul}
          </Checkbox>
        ))}
      </fieldset>
    </PopoverTombol>
  )
}

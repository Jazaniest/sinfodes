import { CaretDown } from '@phosphor-icons/react'
import {
  Button, FieldError, Label, ListBox, ListBoxItem, Popover, Select as RacSelect, SelectValue, Text,
} from 'react-aria-components'
import { cn } from '../cn'
import { gayaGalat, gayaInput, gayaKeterangan, gayaLabel } from './gaya'

export type OpsiPilihan = { id: string; label: string }

type Props = {
  label: string
  pilihan: readonly OpsiPilihan[]
  nilai: string | null
  onUbah: (id: string | null) => void
  placeholder?: string
  keterangan?: string
  galat?: string
  isDisabled?: boolean
  className?: string
}

export function Select({ label, pilihan, nilai, onUbah, placeholder = 'Pilih…', keterangan, galat, isDisabled, className }: Props) {
  return (
    <RacSelect
      value={nilai}
      onChange={(kunci) => onUbah(kunci === null ? null : String(kunci))}
      placeholder={placeholder}
      isInvalid={Boolean(galat)}
      isDisabled={isDisabled}
      className={cn('flex flex-col gap-1.5', className)}
    >
      <Label className={gayaLabel}>{label}</Label>
      <Button className={cn(gayaInput, 'flex items-center justify-between gap-2 text-left')}>
        <SelectValue className="truncate data-[placeholder]:text-tinta-3" />
        <CaretDown aria-hidden size={14} className="shrink-0 text-tinta-2" />
      </Button>
      {keterangan && !galat && (
        <Text slot="description" className={gayaKeterangan}>
          {keterangan}
        </Text>
      )}
      <FieldError className={gayaGalat}>{galat}</FieldError>
      <Popover className="min-w-(--trigger-width) rounded-2 border border-garis bg-lembar py-1 shadow-melayang">
        <ListBox className="max-h-72 overflow-auto outline-none">
          {pilihan.map((o) => (
            <ListBoxItem
              key={o.id}
              id={o.id}
              textValue={o.label}
              className="cursor-default px-3 py-2 text-teks outline-none data-[focused]:bg-biru-muda data-[selected]:font-medium"
            >
              {o.label}
            </ListBoxItem>
          ))}
        </ListBox>
      </Popover>
    </RacSelect>
  )
}

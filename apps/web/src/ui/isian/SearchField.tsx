import { MagnifyingGlass, X } from '@phosphor-icons/react'
import { Button, Input, Label, SearchField as RacSearchField, type SearchFieldProps } from 'react-aria-components'
import { cn } from '../cn'
import { gayaInput, gayaLabel } from './gaya'

type Props = Omit<SearchFieldProps, 'className' | 'children'> & {
  label: string
  labelTersembunyi?: boolean
  placeholder?: string
  className?: string
}

export function SearchField({ label, labelTersembunyi = true, placeholder, className, ...rest }: Props) {
  return (
    <RacSearchField {...rest} className={cn('group flex flex-col gap-1.5', className)}>
      <Label className={cn(gayaLabel, labelTersembunyi && 'sr-only')}>{label}</Label>
      <div className="relative">
        <MagnifyingGlass
          aria-hidden
          size={16}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-tinta-2"
        />
        <Input placeholder={placeholder} className={cn(gayaInput, 'pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden')} />
        <Button
          aria-label="Hapus pencarian"
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-1 p-1 text-tinta-2 hover:text-tinta group-data-[empty]:hidden"
        >
          <X size={14} />
        </Button>
      </div>
    </RacSearchField>
  )
}

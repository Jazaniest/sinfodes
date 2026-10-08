import { Check, Minus } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { Checkbox as RacCheckbox, type CheckboxProps } from 'react-aria-components'
import { cn } from '../cn'

type Props = Omit<CheckboxProps, 'children' | 'className'> & { children: ReactNode; className?: string }

export function Checkbox({ children, className, ...rest }: Props) {
  return (
    <RacCheckbox {...rest} className={cn('group inline-flex cursor-default items-center gap-2 text-teks', className)}>
      {({ isSelected, isIndeterminate }) => (
        <>
          <span
            aria-hidden
            className="flex size-4 items-center justify-center rounded-1 border border-garis-input bg-lembar text-putih group-data-[focus-visible]:outline-2 group-data-[focus-visible]:outline-offset-2 group-data-[focus-visible]:outline-biru group-data-[indeterminate]:border-biru group-data-[indeterminate]:bg-biru group-data-[selected]:border-biru group-data-[selected]:bg-biru"
          >
            {isIndeterminate ? <Minus size={12} weight="bold" /> : isSelected ? <Check size={12} weight="bold" /> : null}
          </span>
          {children}
        </>
      )}
    </RacCheckbox>
  )
}

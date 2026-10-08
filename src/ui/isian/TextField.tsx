import { FieldError, Input, Label, Text, TextField as RacTextField, type TextFieldProps } from 'react-aria-components'
import { cn } from '../cn'
import { gayaGalat, gayaInput, gayaKeterangan, gayaLabel } from './gaya'

type Props = Omit<TextFieldProps, 'className' | 'children' | 'isInvalid'> & {
  label: string
  keterangan?: string
  galat?: string
  placeholder?: string
  className?: string
  inputClassName?: string
}

/** Label selalu tampil; placeholder bukan pengganti label (SPEC §4.6). */
export function TextField({ label, keterangan, galat, placeholder, className, inputClassName, ...rest }: Props) {
  return (
    <RacTextField {...rest} isInvalid={Boolean(galat)} className={cn('flex flex-col gap-1.5', className)}>
      <Label className={gayaLabel}>{label}</Label>
      <Input placeholder={placeholder} className={cn(gayaInput, inputClassName)} />
      {keterangan && !galat && (
        <Text slot="description" className={gayaKeterangan}>
          {keterangan}
        </Text>
      )}
      <FieldError className={gayaGalat}>{galat}</FieldError>
    </RacTextField>
  )
}

import { FieldError, Label, Text, TextArea as RacTextArea, TextField, type TextFieldProps } from 'react-aria-components'
import { cn } from '../cn'
import { gayaGalat, gayaKeterangan, gayaKotakBebas, gayaLabel } from './gaya'

type Props = Omit<TextFieldProps, 'className' | 'children' | 'isInvalid'> & {
  label: string
  keterangan?: string
  galat?: string
  baris?: number
  className?: string
}

/** Isian teks panjang, mis. catatan atau alamat. Label selalu tampil (SPEC §4.6). */
export function TextArea({ label, keterangan, galat, baris = 3, className, ...rest }: Props) {
  return (
    <TextField {...rest} isInvalid={Boolean(galat)} className={cn('flex flex-col gap-1.5', className)}>
      <Label className={gayaLabel}>{label}</Label>
      <RacTextArea rows={baris} className={gayaKotakBebas} />
      {keterangan && !galat && (
        <Text slot="description" className={gayaKeterangan}>
          {keterangan}
        </Text>
      )}
      <FieldError className={gayaGalat}>{galat}</FieldError>
    </TextField>
  )
}

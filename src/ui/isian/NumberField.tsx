import { FieldError, Group, I18nProvider, Input, Label, NumberField as RacNumberField, Text } from 'react-aria-components'
import { cn } from '../cn'
import { gayaGalat, gayaGrup, gayaKeterangan, gayaLabel } from './gaya'

type Props = {
  label: string
  nilai: number | null
  onUbah: (n: number | null) => void
  min?: number
  maks?: number
  /** Ditampilkan di kanan isian, mis. "gram" atau "cm". */
  satuan?: string
  galat?: string
  keterangan?: string
  isRequired?: boolean
  className?: string
}

/** Isian bilangan bulat dengan titik ribuan ("3.100", SPEC §4.5). */
export function NumberField({ label, nilai, onUbah, min, maks, satuan, galat, keterangan, isRequired, className }: Props) {
  return (
    <I18nProvider locale="id-ID">
      <RacNumberField
        value={nilai ?? Number.NaN}
        onChange={(n) => onUbah(Number.isNaN(n) ? null : n)}
        minValue={min}
        maxValue={maks}
        formatOptions={{ maximumFractionDigits: 0 }}
        isInvalid={Boolean(galat)}
        isRequired={isRequired}
        className={cn('flex flex-col gap-1.5', className)}
      >
        <Label className={gayaLabel}>{label}</Label>
        <Group className={gayaGrup}>
          <Input className="min-w-0 flex-1 bg-transparent tabular-nums outline-none" />
          {satuan && <span className="shrink-0 text-tinta-2">{satuan}</span>}
        </Group>
        {keterangan && !galat && (
          <Text slot="description" className={gayaKeterangan}>
            {keterangan}
          </Text>
        )}
        <FieldError className={gayaGalat}>{galat}</FieldError>
      </RacNumberField>
    </I18nProvider>
  )
}

import { parseTime, type Time } from '@internationalized/date'
import { DateInput, DateSegment, FieldError, I18nProvider, Label, Text, TimeField as RacTimeField } from 'react-aria-components'
import { pad2 } from '@/domain/format/kalender'
import { cn } from '../cn'
import { gayaGalat, gayaGrup, gayaKeterangan, gayaLabel, gayaSegmen } from './gaya'

type Props = {
  label: string
  /** "HH:mm" (24 jam) atau null. */
  nilai: string | null
  onUbah: (jam: string | null) => void
  galat?: string
  keterangan?: string
  isRequired?: boolean
  className?: string
}

function keJam(nilai: string | null): Time | null {
  if (!nilai) return null
  try {
    return parseTime(nilai)
  } catch {
    return null
  }
}

/** Jam 24 jam, mis. jam lahir atau jam meninggal (SPEC §6.6). */
export function TimeField({ label, nilai, onUbah, galat, keterangan, isRequired, className }: Props) {
  return (
    <I18nProvider locale="id-ID">
      <RacTimeField
        value={keJam(nilai)}
        onChange={(t) => onUbah(t ? `${pad2(t.hour)}:${pad2(t.minute)}` : null)}
        hourCycle={24}
        granularity="minute"
        shouldForceLeadingZeros
        isInvalid={Boolean(galat)}
        isRequired={isRequired}
        className={cn('flex flex-col gap-1.5', className)}
      >
        <Label className={gayaLabel}>{label}</Label>
        <DateInput className={gayaGrup}>{(segmen) => <DateSegment segment={segmen} className={gayaSegmen} />}</DateInput>
        {keterangan && !galat && (
          <Text slot="description" className={gayaKeterangan}>
            {keterangan}
          </Text>
        )}
        <FieldError className={gayaGalat}>{galat}</FieldError>
      </RacTimeField>
    </I18nProvider>
  )
}

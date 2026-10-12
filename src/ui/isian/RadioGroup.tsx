import { FieldError, Label, Radio, RadioGroup as RacRadioGroup, Text } from 'react-aria-components'
import { cn } from '../cn'
import { gayaGalat, gayaKeterangan, gayaLabel } from './gaya'
import type { OpsiPilihan } from './Select'

type Props = {
  label: string
  pilihan: readonly OpsiPilihan[]
  nilai: string | null
  onUbah: (id: string) => void
  galat?: string
  keterangan?: string
  arah?: 'mendatar' | 'menurun'
  isDisabled?: boolean
  isRequired?: boolean
  className?: string
}

/** Pilihan tunggal dengan semua opsi terlihat (SPEC §4.4), untuk 2–5 pilihan. */
export function RadioGroup({
  label, pilihan, nilai, onUbah, galat, keterangan, arah = 'mendatar', isDisabled, isRequired, className,
}: Props) {
  return (
    <RacRadioGroup
      value={nilai}
      onChange={onUbah}
      orientation={arah === 'mendatar' ? 'horizontal' : 'vertical'}
      isInvalid={Boolean(galat)}
      isDisabled={isDisabled}
      isRequired={isRequired}
      className={cn('flex flex-col gap-1.5', className)}
    >
      <Label className={gayaLabel}>{label}</Label>
      <div className={cn('flex gap-x-5 gap-y-2', arah === 'mendatar' ? 'min-h-kontrol flex-wrap items-center' : 'flex-col')}>
        {pilihan.map((o) => (
          <Radio
            key={o.id}
            value={o.id}
            className="group inline-flex min-h-pilihan cursor-default items-center gap-2 text-teks outline-none data-[disabled]:opacity-50"
          >
            <span
              aria-hidden
              className="flex size-4 shrink-0 items-center justify-center rounded-penuh border border-garis-input bg-lembar group-data-[selected]:border-biru group-data-[invalid]:border-merah group-data-[focus-visible]:outline-2 group-data-[focus-visible]:outline-solid group-data-[focus-visible]:outline-offset-2 group-data-[focus-visible]:outline-biru"
            >
              <span className="size-2 rounded-penuh bg-biru opacity-0 group-data-[selected]:opacity-100" />
            </span>
            {o.label}
          </Radio>
        ))}
      </div>
      {keterangan && !galat && (
        <Text slot="description" className={gayaKeterangan}>
          {keterangan}
        </Text>
      )}
      <FieldError className={gayaGalat}>{galat}</FieldError>
    </RacRadioGroup>
  )
}

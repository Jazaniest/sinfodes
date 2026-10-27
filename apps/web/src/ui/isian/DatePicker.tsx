import { parseDate, type CalendarDate } from '@internationalized/date'
import { CalendarBlank, CaretLeft, CaretRight } from '@phosphor-icons/react'
import {
  Button, Calendar, CalendarCell, CalendarGrid, DateInput, DatePicker as RacDatePicker, DateSegment, Dialog, FieldError,
  Group, Heading, I18nProvider, Label, Popover, Text,
} from 'react-aria-components'
import { cn } from '../cn'
import { gayaGalat, gayaGrup, gayaKeterangan, gayaLabel, gayaSegmen } from './gaya'

type Props = {
  label: string
  /** ISO "YYYY-MM-DD" atau null. */
  nilai: string | null
  onUbah: (iso: string | null) => void
  galat?: string
  keterangan?: string
  min?: string
  maks?: string
  isRequired?: boolean
  className?: string
}

/** ISO → CalendarDate; nilai yang tidak bisa dibaca dianggap kosong. */
function keTanggal(iso: string | null | undefined): CalendarDate | null {
  if (!iso) return null
  try {
    return parseDate(iso)
  } catch {
    return null
  }
}

const gayaTombolKecil =
  'rounded-1 p-1 text-tinta-2 outline-none hover:text-tinta data-[focus-visible]:outline-2 data-[focus-visible]:outline-solid data-[focus-visible]:outline-biru'

/** Tanggal: ketik DD/MM/YYYY atau pilih dari kalender (SPEC §4.4). */
export function DatePicker({ label, nilai, onUbah, galat, keterangan, min, maks, isRequired, className }: Props) {
  return (
    <I18nProvider locale="id-ID">
      <RacDatePicker
        value={keTanggal(nilai)}
        onChange={(t) => onUbah(t ? t.toString() : null)}
        minValue={keTanggal(min)}
        maxValue={keTanggal(maks)}
        granularity="day"
        shouldForceLeadingZeros
        isInvalid={Boolean(galat)}
        isRequired={isRequired}
        className={cn('flex flex-col gap-1.5', className)}
      >
        <Label className={gayaLabel}>{label}</Label>
        <Group className={cn(gayaGrup, 'pr-1')}>
          <DateInput className="flex flex-1">{(segmen) => <DateSegment segment={segmen} className={gayaSegmen} />}</DateInput>
          <Button aria-label="Buka kalender" className={gayaTombolKecil}>
            <CalendarBlank aria-hidden size={16} />
          </Button>
        </Group>
        {keterangan && !galat && (
          <Text slot="description" className={gayaKeterangan}>
            {keterangan}
          </Text>
        )}
        <FieldError className={gayaGalat}>{galat}</FieldError>
        <Popover className="rounded-2 border border-garis bg-lembar p-3 shadow-melayang">
          <Dialog className="outline-none">
            <Calendar>
              <header className="mb-2 flex items-center justify-between gap-2">
                <Button slot="previous" aria-label="Bulan sebelumnya" className={gayaTombolKecil}>
                  <CaretLeft aria-hidden size={16} />
                </Button>
                <Heading className="font-medium" />
                <Button slot="next" aria-label="Bulan berikutnya" className={gayaTombolKecil}>
                  <CaretRight aria-hidden size={16} />
                </Button>
              </header>
              <CalendarGrid className="border-separate border-spacing-0.5">
                {(tanggal) => (
                  <CalendarCell
                    date={tanggal}
                    className="flex size-8 items-center justify-center rounded-1 text-teks tabular-nums outline-none data-[disabled]:text-tinta-3 data-[focus-visible]:outline-2 data-[focus-visible]:outline-solid data-[focus-visible]:outline-biru data-[hovered]:bg-kertas-2 data-[outside-month]:hidden data-[selected]:bg-biru data-[selected]:text-putih"
                  />
                )}
              </CalendarGrid>
            </Calendar>
          </Dialog>
        </Popover>
      </RacDatePicker>
    </I18nProvider>
  )
}

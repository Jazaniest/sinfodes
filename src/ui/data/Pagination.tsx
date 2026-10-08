import { CaretDown, CaretLeft, CaretRight } from '@phosphor-icons/react'
import { Button, Label, ListBox, ListBoxItem, Popover, Select, SelectValue } from 'react-aria-components'
import { formatAngka } from '@/domain/format/angka'
import { Tombol } from '../tombol/Tombol'
import { UKURAN_HALAMAN, type UkuranHalaman } from './ukuran-halaman'

type Props = {
  page: number
  pageSize: number
  total: number
  onPage: (page: number) => void
  onPageSize?: (ukuran: UkuranHalaman) => void
}

/** "1–25 dari 2.812" + halaman sebelumnya/berikutnya + ukuran halaman (SPEC §4.4, §6.2). */
export function Pagination({ page, pageSize, total, onPage, onPageSize }: Props) {
  const halamanAkhir = Math.max(1, Math.ceil(total / pageSize))
  const awal = total === 0 ? 0 : (page - 1) * pageSize + 1
  const akhir = Math.min(page * pageSize, total)
  return (
    <nav aria-label="Halaman" className="flex flex-wrap items-center justify-between gap-3 py-3 text-teks-kecil text-tinta-2">
      <p aria-live="polite">
        {formatAngka(awal)}–{formatAngka(akhir)} dari {formatAngka(total)}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        {onPageSize && (
          <Select
            value={String(pageSize)}
            onChange={(kunci) => {
              const n = Number(kunci)
              if (UKURAN_HALAMAN.some((u) => u === n)) onPageSize(n as UkuranHalaman)
            }}
            className="flex items-center gap-2"
          >
            <Label>Baris per halaman</Label>
            <Button className="flex h-8 items-center gap-1 rounded-1 border border-garis-input bg-lembar px-2 text-tinta outline-none data-[focus-visible]:outline-2 data-[focus-visible]:outline-solid data-[focus-visible]:outline-biru">
              <SelectValue />
              <CaretDown aria-hidden size={12} />
            </Button>
            <Popover className="rounded-2 border border-garis bg-lembar py-1 shadow-melayang">
              <ListBox className="outline-none">
                {UKURAN_HALAMAN.map((n) => (
                  <ListBoxItem
                    key={n}
                    id={String(n)}
                    className="cursor-default px-3 py-1.5 text-teks outline-none data-[focused]:bg-biru-muda data-[selected]:font-medium"
                  >
                    {String(n)}
                  </ListBoxItem>
                ))}
              </ListBox>
            </Popover>
          </Select>
        )}
        <Tombol ukuran="kecil" isDisabled={page <= 1} onPress={() => onPage(page - 1)} ikon={<CaretLeft aria-hidden size={14} />}>
          Sebelumnya
        </Tombol>
        <span>
          Halaman {formatAngka(page)} dari {formatAngka(halamanAkhir)}
        </span>
        <Tombol ukuran="kecil" isDisabled={page >= halamanAkhir} onPress={() => onPage(page + 1)}>
          Berikutnya
          <CaretRight aria-hidden size={14} />
        </Tombol>
      </div>
    </nav>
  )
}

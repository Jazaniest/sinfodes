import {
  ComboBox, FieldError, Input, Label, ListBox, ListBoxItem, Popover, Text,
} from 'react-aria-components'
import { cn } from '../cn'
import { gayaGalat, gayaInput, gayaKeterangan, gayaLabel } from './gaya'

export type OpsiCari = { id: string; label: string; keterangan?: string }

type Props = {
  label: string
  kata: string
  onKata: (kata: string) => void
  /** Hasil pencarian dari API. Tidak disaring ulang di layar, karena kata bisa berupa NIK yang tidak ada di label. */
  opsi: readonly OpsiCari[]
  terpilih: string | null
  onPilih: (id: string | null) => void
  teksKosong: string
  memuat?: boolean
  galat?: string
  keterangan?: string
  placeholder?: string
  isDisabled?: boolean
  className?: string
}

/** Kotak cari dengan daftar pilihan dari API (SPEC §4.4 ComboBox), mis. memilih ibu atau KK. */
export function ComboBoxCari({
  label, kata, onKata, opsi, terpilih, onPilih, teksKosong, memuat = false, galat, keterangan, placeholder, isDisabled, className,
}: Props) {
  return (
    <ComboBox
      inputValue={kata}
      onInputChange={onKata}
      selectedKey={terpilih}
      onSelectionChange={(kunci) => {
        const id = kunci === null ? null : String(kunci)
        // Teks kotak dikendalikan dari luar, jadi React Aria tidak mengisinya sendiri saat opsi dipilih.
        const terpilihBaru = opsi.find((o) => o.id === id)
        if (terpilihBaru) onKata(terpilihBaru.label)
        onPilih(id)
      }}
      items={opsi}
      defaultFilter={() => true}
      menuTrigger="input"
      allowsEmptyCollection
      isInvalid={Boolean(galat)}
      isDisabled={isDisabled}
      className={cn('flex flex-col gap-1.5', className)}
    >
      <Label className={gayaLabel}>{label}</Label>
      <div className="relative">
        <Input placeholder={placeholder} className={cn(gayaInput, 'pr-9')} />
        {memuat && (
          <span
            aria-hidden
            className="absolute top-1/2 right-3 size-3.5 -translate-y-1/2 animate-spin rounded-penuh border-2 border-tinta-3 border-r-transparent"
          />
        )}
      </div>
      {keterangan && !galat && (
        <Text slot="description" className={gayaKeterangan}>
          {keterangan}
        </Text>
      )}
      <FieldError className={gayaGalat}>{galat}</FieldError>
      <Popover className="w-(--trigger-width) rounded-2 border border-garis bg-lembar py-1 shadow-melayang">
        <ListBox<OpsiCari>
          className="max-h-72 overflow-auto outline-none"
          renderEmptyState={() => <p className="px-3 py-2 text-tinta-2">{memuat ? 'Mencari…' : teksKosong}</p>}
        >
          {(o) => (
            <ListBoxItem
              id={o.id}
              textValue={o.label}
              className="flex cursor-default flex-col px-3 py-2 outline-none data-[focused]:bg-biru-muda data-[selected]:font-medium"
            >
              <Text slot="label">{o.label}</Text>
              {o.keterangan && (
                <Text slot="description" className="text-teks-kecil text-tinta-2">
                  {o.keterangan}
                </Text>
              )}
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </ComboBox>
  )
}

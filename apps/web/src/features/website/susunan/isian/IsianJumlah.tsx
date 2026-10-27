import { NumberField } from '@/ui/isian/NumberField'

type Props = {
  label: string
  isi: { jumlah: number }
  onUbah: (isi: { jumlah: number }) => void
  min: number
  maks: number
  keterangan: string
  galat?: Record<string, string>
}

/** Isian jumlah untuk blok Kabar, Galeri, dan Potensi (7F-2). */
export function IsianJumlah({ label, isi, onUbah, min, maks, keterangan, galat }: Props) {
  return (
    <NumberField
      label={label}
      nilai={isi.jumlah}
      onUbah={(n) => onUbah({ jumlah: n ?? min })}
      min={min}
      maks={maks}
      keterangan={keterangan}
      galat={galat?.jumlah}
    />
  )
}

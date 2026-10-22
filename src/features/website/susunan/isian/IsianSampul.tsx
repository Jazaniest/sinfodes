import { TextField } from '@/ui/isian/TextField'

type Props = {
  isi: { kalimat: string }
  onUbah: (isi: { kalimat: string }) => void
  galat?: Record<string, string>
}

/** Isian blok Sampul (7F-2): kalimat pengantar di atas foto. */
export function IsianSampul({ isi, onUbah, galat }: Props) {
  return (
    <TextField
      label="Kalimat pengantar"
      value={isi.kalimat}
      onChange={(v) => onUbah({ kalimat: v })}
      galat={galat?.kalimat}
      keterangan="Paling banyak 160 karakter."
    />
  )
}

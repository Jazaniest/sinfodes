import { Select, type OpsiPilihan } from '@/ui/isian/Select'
import { TextField } from '@/ui/isian/TextField'

export type IsiAjakan = { judul: string; tombol: string; tujuan: string }

type Props = {
  isi: IsiAjakan
  onUbah: (isi: IsiAjakan) => void
  /** Halaman sistem dan halaman tambahan yang boleh jadi tujuan tombol. */
  pilihanTujuan: readonly OpsiPilihan[]
  galat?: Record<string, string>
}

/** Isian blok Ajakan (7F-2): judul, teks tombol, dan tujuan berupa halaman sistem atau halaman tambahan. */
export function IsianAjakan({ isi, onUbah, pilihanTujuan, galat }: Props) {
  return (
    <>
      <TextField label="Judul" value={isi.judul} onChange={(v) => onUbah({ ...isi, judul: v })} galat={galat?.judul} />
      <TextField label="Teks tombol" value={isi.tombol} onChange={(v) => onUbah({ ...isi, tombol: v })} galat={galat?.tombol} />
      <Select
        label="Tujuan tombol"
        pilihan={pilihanTujuan}
        nilai={isi.tujuan}
        onUbah={(id) => onUbah({ ...isi, tujuan: id ?? 'layanan' })}
        galat={galat?.tujuan}
      />
    </>
  )
}

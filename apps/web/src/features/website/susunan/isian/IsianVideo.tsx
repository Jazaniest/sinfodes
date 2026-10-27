import { TextField } from '@/ui/isian/TextField'

type Props = {
  isi: { url: string; judul: string }
  onUbah: (isi: { url: string; judul: string }) => void
  galat?: Record<string, string>
}

/** Isian blok Video (7F-2): alamat YouTube dan judulnya. */
export function IsianVideo({ isi, onUbah, galat }: Props) {
  return (
    <>
      <TextField
        label="Alamat video YouTube"
        value={isi.url}
        onChange={(v) => onUbah({ ...isi, url: v })}
        galat={galat?.url}
        keterangan="Misalnya https://www.youtube.com/watch?v=...; video baru dimuat setelah diklik."
      />
      <TextField label="Judul video" value={isi.judul} onChange={(v) => onUbah({ ...isi, judul: v })} galat={galat?.judul} />
    </>
  )
}

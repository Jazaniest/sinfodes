import { MAKS_GAMBAR_KB } from '@/domain/format/gambar'
import { TextArea } from '@/ui/isian/TextArea'
import { TextField } from '@/ui/isian/TextField'
import { UnggahGambar } from '../../../pengaturan/UnggahGambar'

export type IsiSambutan = { nama: string; jabatan: string; foto: string | null; teks: string }

type Props = {
  isi: IsiSambutan
  onUbah: (isi: IsiSambutan) => void
  galat?: Record<string, string>
}

/** Isian blok Sambutan Kades (7F-2); foto memakai unggahan gambar dengan batas ukuran logo. */
export function IsianSambutan({ isi, onUbah, galat }: Props) {
  return (
    <>
      <TextField label="Nama" value={isi.nama} onChange={(v) => onUbah({ ...isi, nama: v })} galat={galat?.nama} />
      <TextField label="Jabatan" value={isi.jabatan} onChange={(v) => onUbah({ ...isi, jabatan: v })} galat={galat?.jabatan} />
      <TextArea
        label="Teks sambutan"
        value={isi.teks}
        onChange={(v) => onUbah({ ...isi, teks: v })}
        baris={5}
        galat={galat?.teks}
        keterangan="Paling banyak 1200 karakter."
      />
      <UnggahGambar
        label="Foto"
        nilai={isi.foto}
        maksKb={MAKS_GAMBAR_KB.logo}
        onUbah={(v) => onUbah({ ...isi, foto: v })}
        galat={galat?.foto}
        keterangan={`Potret Kepala Desa. Paling besar ${MAKS_GAMBAR_KB.logo} KB.`}
      />
    </>
  )
}

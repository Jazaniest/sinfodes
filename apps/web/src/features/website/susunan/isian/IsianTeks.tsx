import { Plus, Trash } from '@phosphor-icons/react'
import { TextArea } from '@/ui/isian/TextArea'
import { TextField } from '@/ui/isian/TextField'
import { Tombol } from '@/ui/tombol/Tombol'

export type IsiTeks = {
  judul: string
  paragraf: string[]
  tautan: { label: string; url: string } | null
}

type Props = {
  isi: IsiTeks
  onUbah: (isi: IsiTeks) => void
  galat?: Record<string, string>
}

/** Isian blok Teks (7F-2): judul, 1-5 paragraf, dan satu tautan; tanpa HTML. */
export function IsianTeks({ isi, onUbah, galat }: Props) {
  return (
    <>
      <TextField label="Judul" value={isi.judul} onChange={(v) => onUbah({ ...isi, judul: v })} galat={galat?.judul} />
      {isi.paragraf.map((p, i) => (
        <div key={i} className="flex items-start gap-2">
          <TextArea
            label={`Paragraf ${i + 1}`}
            value={p}
            onChange={(v) => onUbah({ ...isi, paragraf: isi.paragraf.map((x, j) => (j === i ? v : x)) })}
            baris={3}
            galat={galat?.[`paragraf.${i}`] ?? galat?.paragraf}
          />
          {isi.paragraf.length > 1 && (
            <Tombol
              ukuran="kecil"
              aria-label={`Hapus paragraf ${i + 1}`}
              onPress={() => onUbah({ ...isi, paragraf: isi.paragraf.filter((_, j) => j !== i) })}
            >
              <Trash aria-hidden size={12} />
            </Tombol>
          )}
        </div>
      ))}
      {isi.paragraf.length < 5 && (
        <Tombol ukuran="kecil" onPress={() => onUbah({ ...isi, paragraf: [...isi.paragraf, ''] })}>
          <Plus aria-hidden size={12} />
          Tambah paragraf
        </Tombol>
      )}
      {isi.tautan ? (
        <>
          <TextField
            label="Label tautan"
            value={isi.tautan.label}
            onChange={(v) => onUbah({ ...isi, tautan: { label: v, url: isi.tautan?.url ?? '' } })}
            galat={galat?.['tautan.label']}
          />
          <TextField
            label="Alamat tautan"
            value={isi.tautan.url}
            onChange={(v) => onUbah({ ...isi, tautan: { label: isi.tautan?.label ?? '', url: v } })}
            galat={galat?.['tautan.url']}
            keterangan="Alamat halaman (diawali /) atau alamat web http(s)."
          />
          <Tombol ukuran="kecil" onPress={() => onUbah({ ...isi, tautan: null })}>
            Hapus tautan
          </Tombol>
        </>
      ) : (
        <Tombol ukuran="kecil" onPress={() => onUbah({ ...isi, tautan: { label: '', url: '/' } })}>
          <Plus aria-hidden size={12} />
          Tambah tautan
        </Tombol>
      )}
    </>
  )
}

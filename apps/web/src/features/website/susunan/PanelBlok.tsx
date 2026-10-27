import { galatDariZod } from '@/domain/format/galat-isian'
import {
  ID_LEBAR, LABEL_JENIS_BLOK, LABEL_LEBAR, LABEL_VARIAN, VARIAN_BLOK, blokSchema, type Blok, type JenisBlok,
} from '@/domain/website/blok'
import { KUNCI_HALAMAN_SISTEM, LABEL_HALAMAN_SISTEM } from '@/domain/website/susunan'
import { RadioGroup } from '@/ui/isian/RadioGroup'
import { useDrafSitus } from '../tampilan/useDrafSitus'
import { IsianAjakan } from './isian/IsianAjakan'
import { IsianJumlah } from './isian/IsianJumlah'
import { IsianSambutan } from './isian/IsianSambutan'
import { IsianSampul } from './isian/IsianSampul'
import { IsianTeks } from './isian/IsianTeks'
import { IsianVideo } from './isian/IsianVideo'

type Props = {
  blok: Blok
  onUbah: (blok: Blok) => void
}

/** Panel pengaturan blok terpilih (SPEC-V0.2 11.4): varian, lebar, isian per jenis, dan galat skema per isian. */
export function PanelBlok({ blok, onUbah }: Props) {
  const { isi } = useDrafSitus()
  const hasil = blokSchema.safeParse(blok)
  const semuaGalat = hasil.success ? {} : galatDariZod(hasil.error)
  const galatIsi: Record<string, string> = {}
  for (const [k, v] of Object.entries(semuaGalat)) if (k.startsWith('isi.')) galatIsi[k.slice(4)] = v

  const label = (LABEL_VARIAN as Record<JenisBlok, Record<string, string>>)[blok.jenis]
  const opsiVarian = (VARIAN_BLOK as Record<JenisBlok, readonly string[]>)[blok.jenis].map((v) => ({ id: v, label: label[v] }))

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-serif text-judul-bagian font-medium">{LABEL_JENIS_BLOK[blok.jenis]}</h2>
      <RadioGroup
        label="Varian"
        pilihan={opsiVarian}
        nilai={blok.varian}
        onUbah={(v) => onUbah({ ...blok, varian: v } as Blok)}
        galat={semuaGalat.varian}
      />
      <RadioGroup
        label="Lebar"
        pilihan={ID_LEBAR.map((l) => ({ id: l, label: LABEL_LEBAR[l] }))}
        nilai={blok.lebar}
        onUbah={(l) => onUbah({ ...blok, lebar: l } as Blok)}
        galat={semuaGalat.lebar}
        keterangan="Lebar dan Sempit berdampingan di layar besar."
      />
      <Isian blok={blok} onUbah={onUbah} galat={galatIsi} halaman={isi?.susunan.halaman ?? []} />
    </div>
  )
}

function Isian({ blok, onUbah, galat, halaman }: {
  blok: Blok
  onUbah: (blok: Blok) => void
  galat: Record<string, string>
  halaman: readonly { id: string; judul: string }[]
}) {
  switch (blok.jenis) {
    case 'sampul':
      return <IsianSampul isi={blok.isi} onUbah={(isi) => onUbah({ ...blok, isi })} galat={galat} />
    case 'kabar':
      return (
        <IsianJumlah
          label="Jumlah artikel"
          isi={blok.isi}
          onUbah={(isi) => onUbah({ ...blok, isi })}
          min={1}
          maks={6}
          keterangan="Artikel terbaru yang ditampilkan, 1-6."
          galat={galat}
        />
      )
    case 'galeri':
      return (
        <IsianJumlah
          label="Jumlah foto"
          isi={blok.isi}
          onUbah={(isi) => onUbah({ ...blok, isi })}
          min={4}
          maks={12}
          keterangan="Foto galeri yang ditampilkan, 4-12."
          galat={galat}
        />
      )
    case 'potensi':
      return (
        <IsianJumlah
          label="Jumlah potensi"
          isi={blok.isi}
          onUbah={(isi) => onUbah({ ...blok, isi })}
          min={3}
          maks={6}
          keterangan="Potensi yang ditampilkan, 3-6."
          galat={galat}
        />
      )
    case 'video':
      return <IsianVideo isi={blok.isi} onUbah={(isi) => onUbah({ ...blok, isi })} galat={galat} />
    case 'sambutan':
      return <IsianSambutan isi={blok.isi} onUbah={(isi) => onUbah({ ...blok, isi })} galat={galat} />
    case 'teks':
      return <IsianTeks isi={blok.isi} onUbah={(isi) => onUbah({ ...blok, isi })} galat={galat} />
    case 'ajakan':
      return (
        <IsianAjakan
          isi={blok.isi}
          onUbah={(isi) => onUbah({ ...blok, isi })}
          galat={galat}
          pilihanTujuan={[
            ...KUNCI_HALAMAN_SISTEM.map((k) => ({ id: k, label: LABEL_HALAMAN_SISTEM[k] })),
            ...halaman.map((h) => ({ id: h.id, label: h.judul })),
          ]}
        />
      )
    default:
      return <p className="text-teks-kecil text-tinta-2">Blok ini mengikuti data desa; tidak ada isian sendiri.</p>
  }
}

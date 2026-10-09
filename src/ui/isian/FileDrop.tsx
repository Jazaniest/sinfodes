import { FileArrowUp } from '@phosphor-icons/react'
import { useState } from 'react'
import { DropZone, FileTrigger, Text } from 'react-aria-components'
import { cn } from '../cn'
import { Tombol } from '../tombol/Tombol'
import { gayaGalat, gayaKeterangan } from './gaya'

type Props = {
  label: string
  /** Ekstensi yang diterima, mis. ['.xlsx', '.csv']. */
  terima: readonly string[]
  maksMb: number
  onPilih: (berkas: File) => void
  keterangan?: string
  isDisabled?: boolean
}

/** Unggah satu berkas lewat seret-lepas atau tombol pilih (SPEC §4.4). Jenis dan ukurannya diperiksa di sini. */
export function FileDrop({ label, terima, maksMb, onPilih, keterangan, isDisabled }: Props) {
  const [galat, setGalat] = useState<string | null>(null)
  const periksa = (berkas: File) => {
    const ekstensi = berkas.name.slice(berkas.name.lastIndexOf('.')).toLowerCase()
    if (!terima.includes(ekstensi)) setGalat(`Pilih berkas ${terima.join(' atau ')}`)
    else if (berkas.size > maksMb * 1024 * 1024) setGalat(`Ukuran berkas maksimal ${maksMb} MB`)
    else {
      setGalat(null)
      onPilih(berkas)
    }
  }
  return (
    <div className="flex flex-col gap-2">
      <DropZone
        isDisabled={isDisabled}
        onDrop={async (e) => {
          const item = e.items.find((i) => i.kind === 'file')
          if (item?.kind === 'file') periksa(await item.getFile())
        }}
        className={({ isDropTarget }) =>
          cn(
            'flex flex-col items-center gap-3 rounded-2 border border-dashed border-garis-input bg-lembar px-6 py-10 text-center',
            'outline-none data-[focus-visible]:outline-2 data-[focus-visible]:outline-solid data-[focus-visible]:outline-biru',
            isDropTarget && 'border-biru bg-biru-muda',
          )
        }
      >
        <FileArrowUp aria-hidden size={28} className="text-tinta-2" />
        <Text slot="label" className="font-medium">
          {label}
        </Text>
        <p className="text-teks-kecil text-tinta-2">Seret berkas ke sini, atau</p>
        <FileTrigger
          acceptedFileTypes={[...terima]}
          onSelect={(daftar) => {
            const berkas = daftar?.[0]
            if (berkas) periksa(berkas)
          }}
        >
          <Tombol isDisabled={isDisabled}>Pilih berkas</Tombol>
        </FileTrigger>
        {keterangan && <p className={gayaKeterangan}>{keterangan}</p>}
      </DropZone>
      {galat && (
        <p role="alert" className={gayaGalat}>
          {galat}
        </p>
      )}
    </div>
  )
}

import { Camera, ImageSquare } from '@phosphor-icons/react'
import { useId, useState } from 'react'
import { FileTrigger } from 'react-aria-components'
import { formatAngka } from '@/domain/format/angka'
import { ukuranKb } from '@/domain/warga/foto'
import { gayaGalat } from '@/ui/isian/gaya'
import { Tombol } from '@/ui/tombol/Tombol'
import { kecilkanFoto, periksaFotoAsli, type FotoTerpilih } from './foto'

type Props = {
  label: string
  foto: FotoTerpilih | null
  onUbah: (foto: FotoTerpilih | null) => void
  wajib?: boolean
  galat?: string
  /** Bawaannya kanvas peramban; uji memberi pengganti. */
  kecilkan?: (berkas: File) => Promise<File>
}

/**
 * Satu foto dari kamera atau galeri HP (SPEC §10). Di HP, `accept="image/*"` memunculkan pilihan kamera atau galeri.
 * Foto langsung dikecilkan; yang disimpan hanya hasilnya.
 */
export function PilihFoto({ label, foto, onUbah, wajib = false, galat, kecilkan = kecilkanFoto }: Props) {
  const id = useId()
  const [memproses, setMemproses] = useState(false)
  const [galatPilih, setGalatPilih] = useState<string | null>(null)

  const pilih = async (berkas: File) => {
    const g = periksaFotoAsli(berkas)
    if (g) {
      setGalatPilih(g)
      return
    }
    setGalatPilih(null)
    setMemproses(true)
    try {
      onUbah({ berkas: await kecilkan(berkas), asliKb: ukuranKb(berkas.size) })
    } catch {
      setGalatPilih('Foto ini tidak bisa diproses. Coba foto lain, atau ambil ulang dengan kamera.')
    } finally {
      setMemproses(false)
    }
  }
  const pesan = galatPilih ?? galat

  return (
    <div role="group" aria-labelledby={id} className="flex flex-col gap-2 rounded-1 border border-garis bg-lembar p-3">
      <p id={id} className="font-medium">
        {label}
        {!wajib && <span className="font-normal text-tinta-2"> (tidak wajib)</span>}
      </p>
      {foto ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <ImageSquare aria-hidden size={20} className="shrink-0 text-tinta-2" />
          <span className="min-w-0 flex-1 break-all">{foto.berkas.name}</span>
          <span className="text-teks-kecil text-tinta-2">
            {formatAngka(ukuranKb(foto.berkas.size))} KB (asli {formatAngka(foto.asliKb)} KB)
          </span>
          <Tombol varian="teks" className="min-h-tombol" aria-label={`Hapus foto ${label}`} onPress={() => onUbah(null)}>
            Hapus
          </Tombol>
        </div>
      ) : (
        <FileTrigger
          acceptedFileTypes={['image/*']}
          onSelect={(daftar) => {
            const berkas = daftar?.[0]
            if (berkas) void pilih(berkas)
          }}
        >
          <Tombol ikon={<Camera aria-hidden size={18} />} memuat={memproses} className="self-start">
            {memproses ? 'Mengecilkan foto…' : 'Ambil atau pilih foto'}
          </Tombol>
        </FileTrigger>
      )}
      {pesan && (
        <p role="alert" className={gayaGalat}>
          {pesan}
        </p>
      )}
    </div>
  )
}

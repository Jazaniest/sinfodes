import { Trash } from '@phosphor-icons/react'
import { useState } from 'react'
import { EKSTENSI_GAMBAR, periksaBerkasGambar } from '@/domain/format/gambar'
import { FileDrop } from '@/ui/isian/FileDrop'
import { gayaGalat } from '@/ui/isian/gaya'
import { Tombol } from '@/ui/tombol/Tombol'
import { bacaDataUrl } from './berkas'

type Props = {
  /** Mis. "Lambang", "Logo", "Foto sampul". */
  label: string
  nilai: string | null
  maksKb: number
  onUbah: (dataUrl: string | null) => void
  galat?: string
  keterangan?: string
  bentuk?: 'lambang' | 'sampul'
}

/** Unggah satu gambar: jenis dan ukurannya diperiksa dalam KB, lalu disimpan sebagai data URL (SPEC §8, §9). */
export function UnggahGambar({ label, nilai, maksKb, onUbah, galat, keterangan, bentuk = 'lambang' }: Props) {
  const [pesan, setPesan] = useState<string | null>(null)
  const kecil = label.toLocaleLowerCase('id-ID')
  const pilih = async (berkas: File) => {
    const salah = periksaBerkasGambar(berkas, maksKb)
    if (salah) {
      setPesan(salah)
      return
    }
    setPesan(null)
    onUbah(await bacaDataUrl(berkas))
  }
  const galatTampil = pesan ?? galat
  return (
    <div className="flex flex-col gap-3">
      {nilai && (
        <div className="flex flex-wrap items-center gap-4">
          <img
            src={nilai}
            alt={`${label} yang dipilih`}
            className={bentuk === 'sampul' ? 'aspect-[16/9] w-56 rounded-1 border border-garis object-cover' : 'size-20 object-contain'}
          />
          <Tombol
            varian="teks"
            ikon={<Trash aria-hidden size={16} />}
            onPress={() => {
              setPesan(null)
              onUbah(null)
            }}
          >
            Hapus {kecil}
          </Tombol>
        </div>
      )}
      {/* Batas MB di FileDrop sengaja longgar: ukuran sesungguhnya diperiksa dalam KB di atas, dengan pesan yang lebih jelas. */}
      <FileDrop
        label={nilai ? `Ganti ${kecil}` : `Unggah ${kecil}`}
        terima={EKSTENSI_GAMBAR}
        maksMb={10}
        onPilih={(b) => void pilih(b)}
        keterangan={keterangan}
      />
      {galatTampil && (
        <p role="alert" className={gayaGalat}>
          {galatTampil}
        </p>
      )}
    </div>
  )
}

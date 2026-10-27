import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { formatWaktuRelatif } from '@/domain/format/tanggal'
import { opsiRiwayat, opsiSitus } from '@/api/website'
import type { VersiRiwayat, VersiSitus } from '@/domain/website/situs'
import { ConfirmDialog } from '@/ui/lapisan/ConfirmDialog'
import { Drawer } from '@/ui/lapisan/Drawer'
import { Tombol } from '@/ui/tombol/Tombol'
import { useDrafSitus } from './useDrafSitus'

type Props = {
  isOpen: boolean
  onOpenChange: (buka: boolean) => void
  onPulihkan: () => void
}

const TANPA_CATATAN = 'Tanpa catatan'

function Baris({ versi, sekarang, tayang, onPulihkan }: { versi: VersiSitus | VersiRiwayat; sekarang: Date; tayang: boolean; onPulihkan?: () => void }) {
  return (
    <li className="flex flex-col gap-1 border-b border-garis py-3 last:border-b-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-teks-kecil text-tinta-2">{formatWaktuRelatif(versi.diperbarui, sekarang)}</span>
        {tayang && (
          <span className="rounded-penuh bg-biru-muda px-2 py-0.5 text-label font-semibold text-biru-tua">Sedang tayang</span>
        )}
      </div>
      <p className="text-teks">{versi.catatan ?? TANPA_CATATAN}</p>
      <div className="flex items-center justify-between gap-2">
        <span className="text-teks-kecil text-tinta-2">{versi.oleh.nama}</span>
        {onPulihkan && (
          <Tombol ukuran="kecil" onPress={onPulihkan}>
            Pulihkan<span className="sr-only"> {formatWaktuRelatif(versi.diperbarui, sekarang)} oleh {versi.oleh.nama}</span>
          </Tombol>
        )}
      </div>
    </li>
  )
}

/** Laci Riwayat terbitan (keputusan 7): versi tayang bertanda, 20 riwayat, dan Pulihkan menjadi draf. */
export function LaciRiwayat({ isOpen, onOpenChange, onPulihkan }: Props) {
  const { adaDraf, pulihkan } = useDrafSitus()
  const situs = useQuery(opsiSitus())
  const riwayat = useQuery({ ...opsiRiwayat(), enabled: isOpen })
  const [konfirmasi, setKonfirmasi] = useState<VersiRiwayat | null>(null)
  const sekarang = new Date()

  return (
    <>
      <Drawer isOpen={isOpen} onOpenChange={onOpenChange} judul="Riwayat terbitan">
        {riwayat.isPending ? (
          <p className="text-teks-kecil text-tinta-2">Memuat riwayat…</p>
        ) : (
          <ul>
            {situs.data && <Baris versi={situs.data.terbit} sekarang={sekarang} tayang />}
            {(riwayat.data?.data ?? []).map((v) => (
              <Baris key={v.id} versi={v} sekarang={sekarang} tayang={false} onPulihkan={() => setKonfirmasi(v)} />
            ))}
          </ul>
        )}
      </Drawer>
      <ConfirmDialog
        isOpen={konfirmasi !== null}
        onOpenChange={(buka) => {
          if (!buka) setKonfirmasi(null)
        }}
        judul="Pulihkan versi ini?"
        labelSetuju="Pulihkan"
        onSetuju={() => {
          const versi = konfirmasi
          setKonfirmasi(null)
          if (!versi) return
          void pulihkan(versi.id).then(onPulihkan)
        }}
      >
        <div className="flex flex-col gap-2">
          <p>Versi ini disalin menjadi draf. Website belum berubah sampai diterbitkan.</p>
          {adaDraf && <p>Draf yang ada sekarang akan diganti.</p>}
        </div>
      </ConfirmDialog>
    </>
  )
}

import type { ModeTandaTangan } from '@/domain/surat/pengaturan'
import { QrVerifikasi } from './QrVerifikasi'

export type DataTandaTangan = {
  tempatTanggal: string
  /** "Kepala Desa Sungai Sialang". */
  jabatan: string
  /** "Sekretaris Desa" bila ditandatangani atas nama Kepala Desa. */
  atasNama: string | null
  nama: string
  mode: ModeTandaTangan
  /** QR tanda tangan elektronik; null untuk draf dan mode basah. */
  qr: { isi: string; kode: string } | null
}

/** Blok tanda tangan di kanan, lebar 7 cm (SPEC §7.5). */
export function BlokTandaTangan({ data }: { data: DataTandaTangan }) {
  return (
    <div className="mt-[0.8cm] ml-auto w-[7cm] break-inside-avoid">
      <p>{data.tempatTanggal}</p>
      {data.atasNama ? (
        <p>
          a.n. {data.jabatan}
          <br />
          {data.atasNama}
        </p>
      ) : (
        <p>{data.jabatan}</p>
      )}
      {data.mode === 'tte' && data.qr ? (
        <div className="my-[0.2cm] flex items-center gap-[0.3cm]">
          <QrVerifikasi isi={data.qr.isi} label={`Kode QR verifikasi ${data.qr.kode}`} className="size-[2.5cm] shrink-0" />
          <p className="text-[9pt] leading-snug">Ditandatangani secara elektronik</p>
        </div>
      ) : (
        <div aria-hidden className="h-[3cm]" />
      )}
      <p className="font-bold underline">{data.nama}</p>
    </div>
  )
}

import { Fragment, type ReactNode } from 'react'
import type { ModeTandaTangan } from '@/domain/surat/pengaturan'
import type { TataLetakSurat, UnsurTandaTangan } from '@/domain/surat/tata-letak'
import { cn } from '../cn'
import { QrVerifikasi } from './QrVerifikasi'

export type DataTandaTangan = {
  tempatTanggal: string
  /** "Kepala Desa Sungai Sialang". */
  jabatan: string
  /** "Sekretaris Desa" bila ditandatangani atas nama Kepala Desa. */
  atasNama: string | null
  nama: string
  /** NIP penanda tangan; tampil bila tata letak mengaktifkannya dan NIP-nya ada. */
  nip: string | null
  mode: ModeTandaTangan
  /** QR tanda tangan elektronik; null untuk draf dan mode basah. */
  qr: { isi: string; kode: string } | null
}

type Props = {
  data: DataTandaTangan
  tata: TataLetakSurat['tandaTangan']
  /** Diletakkan di bawah blok, mis. kode verifikasi bila QR dipasang di bawah tanda tangan. */
  bawah?: ReactNode
}

/** Kotak garis putus 3 × 3 cm: di kiri blok (posisi kanan) atau di belakang tanda tangan (posisi tengah). Tidak tercetak di mode TTE. */
function TempatCap({ tengah, tte }: { tengah: boolean; tte: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute top-[0.9cm] flex size-[3cm] items-start justify-start border border-dashed border-tinta p-[0.1cm] text-[7pt] leading-none text-tinta/60',
        tengah ? 'left-1/2 -translate-x-1/2' : 'right-full mr-[0.3cm]',
        tte && 'print:hidden',
      )}
    >
      <span>Tempat cap</span>
    </div>
  )
}

/** Blok tanda tangan lebar 7 cm di kanan atau tengah (SPEC §7.5); urutan unsurnya mengikuti tata letak (SPEC-V0.2 12.2). */
export function BlokTandaTangan({ data, tata, bawah }: Props) {
  const tengah = tata.posisi === 'tengah'
  // NIP yang diaktifkan tetapi tidak ada di urutan tampil sesudah nama.
  const urutan: UnsurTandaTangan[] = tata.urutan.includes('nip') ? tata.urutan : [...tata.urutan, 'nip']
  const unsur: Record<UnsurTandaTangan, ReactNode> = {
    'tempat-tanggal': <p>{data.tempatTanggal}</p>,
    jabatan: data.atasNama ? (
      <p>
        a.n. {data.jabatan}
        <br />
        {data.atasNama}
      </p>
    ) : (
      <p>{data.jabatan}</p>
    ),
    nama: (
      <>
        {data.mode === 'tte' && data.qr ? (
          <div className="my-[0.2cm] flex items-center gap-[0.3cm]">
            <QrVerifikasi isi={data.qr.isi} label={`Kode QR verifikasi ${data.qr.kode}`} className="size-[2.5cm] shrink-0" />
            <p className="text-[9pt] leading-snug">Ditandatangani secara elektronik</p>
          </div>
        ) : (
          <div aria-hidden className="h-[3cm]" />
        )}
        <p className="font-bold underline">{data.nama}</p>
      </>
    ),
    nip: tata.nip && data.nip ? <p>NIP {data.nip}</p> : null,
  }
  return (
    <div className={cn('relative mt-[0.6cm] w-[7cm] break-inside-avoid', tengah ? 'mx-auto' : 'ml-auto')}>
      {tata.tempatCap && <TempatCap tengah={tengah} tte={data.mode === 'tte'} />}
      {urutan.map((k) => (
        <Fragment key={k}>{unsur[k]}</Fragment>
      ))}
      {bawah}
    </div>
  )
}

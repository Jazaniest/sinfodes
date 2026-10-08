import { useState } from 'react'
import { bersihkanNik, kelompokkanNik, periksaNik, ringkasanNik, type HasilNik } from '@/domain/penduduk/nik'
import { cn } from '../cn'
import { TextField } from '../isian/TextField'

type Props = {
  label?: string
  /** Hanya digit, tanpa spasi. */
  nilai: string
  onUbah: (digit: string, hasil: HasilNik) => void
  /** Galat dari luar, mis. "NIK sudah terdaftar". */
  galat?: string
  isRequired?: boolean
  /** Dipanggil saat kolom ditinggalkan, mis. untuk cek NIK ganda (SPEC §6.4). */
  onBlur?: () => void
  hariIni?: Date
  className?: string
}

/** Isian NIK yang langsung membaca maknanya (SPEC §4.5). Galat bentuk muncul setelah kolom ditinggalkan. */
export function NikField({ label = 'NIK', nilai, onUbah, onBlur, galat, isRequired, hariIni, className }: Props) {
  const [disentuh, setDisentuh] = useState(false)
  const hasil = periksaNik(nilai, hariIni)
  const galatBentuk =
    disentuh && (hasil.status === 'tidak-lengkap' || hasil.status === 'tidak-valid') ? hasil.pesan : undefined

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <TextField
        label={label}
        isRequired={isRequired}
        inputMode="numeric"
        autoComplete="off"
        value={kelompokkanNik(bersihkanNik(nilai))}
        onChange={(teks) => {
          const digit = bersihkanNik(teks)
          onUbah(digit, periksaNik(digit, hariIni))
        }}
        onBlur={() => {
          setDisentuh(true)
          onBlur?.()
        }}
        galat={galat ?? galatBentuk}
        keterangan={hasil.status === 'valid' ? ringkasanNik(hasil) : 'Isi 16 angka sesuai KTP atau KK.'}
        inputClassName="font-mono tracking-wide tabular-nums"
      />
      {hasil.status === 'valid' &&
        hasil.peringatan.map((p) => (
          <p key={p} className="text-teks-kecil text-oker">
            {p}
          </p>
        ))}
    </div>
  )
}

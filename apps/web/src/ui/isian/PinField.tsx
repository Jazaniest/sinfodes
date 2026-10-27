import { useState } from 'react'
import { FieldError, Input, Label, Text, TextField } from 'react-aria-components'
import { cn } from '../cn'
import { gayaGalat, gayaKeterangan, gayaLabel } from './gaya'

const PANJANG_PIN = 6

type Props = {
  label?: string
  /** Hanya angka, paling banyak 6. */
  nilai: string
  onUbah: (digit: string) => void
  galat?: string
  keterangan?: string
  autoFocus?: boolean
  /** `current-password` untuk masuk, `new-password` untuk PIN baru. */
  autoComplete?: string
}

/**
 * PIN 6 angka dalam 6 kotak (SPEC §4.4, §10). Di belakang kotak ada satu input asli, sehingga tempel, isi otomatis,
 * dan pembaca layar tetap bekerja. Angkanya tidak pernah tampil; kotak hanya berisi titik.
 */
export function PinField({ label = 'PIN', nilai, onUbah, galat, keterangan, autoFocus, autoComplete = 'current-password' }: Props) {
  const [fokus, setFokus] = useState(false)
  const posisi = Math.min(nilai.length, PANJANG_PIN - 1)
  return (
    <TextField
      value={nilai}
      onChange={(teks) => onUbah(teks.replace(/\D/g, '').slice(0, PANJANG_PIN))}
      isInvalid={Boolean(galat)}
      autoFocus={autoFocus}
      className="flex flex-col gap-1.5"
    >
      <Label className={gayaLabel}>{label}</Label>
      <div className="relative w-fit">
        <div aria-hidden className="flex gap-2">
          {Array.from({ length: PANJANG_PIN }, (_, i) => (
            <span
              key={i}
              className={cn(
                'flex size-kontrol items-center justify-center rounded-1 border bg-lembar text-judul-bagian text-tinta',
                // cn tidak menyelesaikan bentrokan kelas: hanya satu warna tepi yang boleh dipasang.
                fokus && i === posisi ? 'border-biru ring-2 ring-biru/25' : galat ? 'border-merah' : 'border-garis-input',
              )}
            >
              {i < nilai.length ? '•' : ''}
            </span>
          ))}
        </div>
        <Input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={autoComplete}
          onFocus={() => setFokus(true)}
          onBlur={() => setFokus(false)}
          className="absolute inset-0 size-full cursor-text opacity-0"
        />
      </div>
      {keterangan && !galat && (
        <Text slot="description" className={gayaKeterangan}>
          {keterangan}
        </Text>
      )}
      <FieldError className={gayaGalat}>{galat}</FieldError>
    </TextField>
  )
}

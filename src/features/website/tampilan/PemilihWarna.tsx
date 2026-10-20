import { Check } from '@phosphor-icons/react'
import { useState } from 'react'
import { Radio, RadioGroup } from 'react-aria-components'
import { PRESET_WARNA } from '@/domain/website/tema'
import { cn } from '@/ui/cn'
import { TextField } from '@/ui/isian/TextField'
import { PESAN_HEX, POLA_HEX } from './warna'

type Props = {
  /** Mis. "Warna utama" atau "Warna aksen". */
  judul: string
  /** Nilai mentah: bisa belum berbentuk #RRGGBB selama diketik. */
  nilai: string
  onUbah: (nilai: string) => void
  galat?: string
  keterangan?: string
}

/** Pemilih satu warna (SPEC-V0.2 §11.1): delapan preset, pemilih warna bawaan peramban, dan kode hex #RRGGBB. */
export function PemilihWarna({ judul, nilai, onUbah, galat, keterangan }: Props) {
  const kecil = judul.toLocaleLowerCase('id-ID')
  const [teks, setTeks] = useState(nilai)
  const [sentuh, setSentuh] = useState(false)
  // Preset, pemilih warna, atau tombol "versi lebih gelap" mengubah nilai dari luar isian teks: ikuti saat nilai berubah.
  const [nilaiTerakhir, setNilaiTerakhir] = useState(nilai)
  if (nilai !== nilaiTerakhir) {
    setNilaiTerakhir(nilai)
    if (teks.trim().toUpperCase() !== nilai.toUpperCase()) setTeks(nilai)
  }
  const sah = POLA_HEX.test(nilai)
  const preset = PRESET_WARNA.find((p) => p.hex === nilai.toUpperCase())

  return (
    <div role="group" aria-label={judul} className="flex flex-col gap-2">
      <RadioGroup
        aria-label={`Preset ${kecil}`}
        value={preset?.id ?? ''}
        onChange={(id) => {
          const p = PRESET_WARNA.find((x) => x.id === id)
          if (p) onUbah(p.hex)
        }}
        className="flex flex-wrap gap-2"
      >
        {PRESET_WARNA.map((p) => (
          <Radio
            key={p.id}
            value={p.id}
            aria-label={p.label}
            className={({ isSelected }) =>
              cn(
                'relative flex size-9 cursor-default items-center justify-center rounded-penuh border outline-none',
                'data-[focus-visible]:outline-2 data-[focus-visible]:outline-offset-2 data-[focus-visible]:outline-solid data-[focus-visible]:outline-biru',
                isSelected ? 'border-tinta ring-2 ring-tinta/30' : 'border-garis-input',
              )
            }
          >
            {({ isSelected }) => (
              <span aria-hidden className="flex size-7 items-center justify-center rounded-penuh text-putih" style={{ backgroundColor: p.hex }}>
                {isSelected && <Check size={14} weight="bold" />}
              </span>
            )}
          </Radio>
        ))}
      </RadioGroup>
      <div className="flex items-end gap-3">
        <input
          type="color"
          aria-label={`Pilih ${kecil} dari palet`}
          value={sah ? nilai.toLowerCase() : '#000000'}
          onChange={(e) => onUbah(e.target.value.toUpperCase())}
          className="h-kontrol w-14 shrink-0 cursor-pointer rounded-1 border border-garis-input bg-lembar p-1"
        />
        <TextField
          label={`Kode ${kecil}`}
          value={teks}
          onChange={(v) => {
            setTeks(v)
            onUbah(v.trim())
          }}
          onBlur={() => setSentuh(true)}
          galat={galat ?? (sentuh && !sah ? PESAN_HEX : undefined)}
          keterangan={keterangan ?? 'Berbentuk #RRGGBB, mis. #1F4E79.'}
          className="w-44"
          inputClassName="font-mono uppercase"
          autoComplete="off"
        />
      </div>
    </div>
  )
}

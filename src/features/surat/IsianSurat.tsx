import { formatRupiah } from '@/domain/format/angka'
import { formatTanggal } from '@/domain/format/tanggal'
import type { IsianTambahan, JenisSurat } from '@/domain/surat/jenis'
import { DescriptionList } from '@/ui/data/DescriptionList'
import { DatePicker } from '@/ui/isian/DatePicker'
import { Select } from '@/ui/isian/Select'
import { TextField } from '@/ui/isian/TextField'

type Props = {
  jenis: Pick<JenisSurat, 'isian'>
  nilai: Readonly<Record<string, string>>
  /** Pesan galat per kunci isian, mis. dari "Ajukan tanda tangan". */
  galat: Readonly<Record<string, string>>
  bisaUbah: boolean
  onUbah: (kunci: string, nilai: string) => void
}

function tampilan(d: IsianTambahan, nilai: string | undefined): string | null {
  const v = (nilai ?? '').trim()
  if (v === '') return null
  if (d.jenis === 'tanggal' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return formatTanggal(v)
  if (d.jenis === 'angka' && d.rupiah && /^\d+$/.test(v)) return formatRupiah(Number(v))
  return v
}

/** Isian tambahan jenis surat (SPEC §7.3, §7.4): bisa diubah saat Diproses; selain itu tampil sebagai daftar. */
export function IsianSurat({ jenis, nilai, galat, bisaUbah, onUbah }: Props) {
  if (jenis.isian.length === 0) return <p className="text-tinta-2">Jenis surat ini tidak punya isian tambahan.</p>
  if (!bisaUbah) return <DescriptionList items={jenis.isian.map((d) => ({ label: d.label, nilai: tampilan(d, nilai[d.kunci]) }))} />
  return (
    <div className="flex flex-col gap-4">
      {jenis.isian.map((d) => {
        const umum = {
          label: d.wajib ? d.label : `${d.label} (tidak wajib)`,
          galat: galat[d.kunci],
          keterangan: d.keterangan ?? undefined,
        }
        const v = nilai[d.kunci] ?? ''
        if (d.jenis === 'pilihan') {
          return (
            <Select
              key={d.kunci}
              {...umum}
              pilihan={(d.pilihan ?? []).map((x) => ({ id: x, label: x }))}
              nilai={v || null}
              onUbah={(x) => onUbah(d.kunci, x ?? '')}
            />
          )
        }
        if (d.jenis === 'tanggal') {
          return <DatePicker key={d.kunci} {...umum} nilai={v || null} onUbah={(x) => onUbah(d.kunci, x ?? '')} />
        }
        return (
          <TextField
            key={d.kunci}
            {...umum}
            value={v}
            onChange={(x) => onUbah(d.kunci, x)}
            inputMode={d.jenis === 'angka' ? 'numeric' : undefined}
          />
        )
      })}
    </div>
  )
}

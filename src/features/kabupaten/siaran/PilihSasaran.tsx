import { formatAngka } from '@/domain/format/angka'
import {
  JENIS_SASARAN, jumlahDesaSasaran, LABEL_JENIS_SASARAN, type JenisSasaran, type SasaranSiaran, type SasaranTersedia,
} from '@/domain/kabupaten/siaran'
import { cn } from '@/ui/cn'
import { Checkbox } from '@/ui/isian/Checkbox'
import { gayaGalat } from '@/ui/isian/gaya'
import { RadioGroup } from '@/ui/isian/RadioGroup'

const kosong = (jenis: JenisSasaran): SasaranSiaran =>
  jenis === 'semua' ? { jenis } : jenis === 'kecamatan' ? { jenis, kode: [] } : { jenis, id: [] }

const ganti = (daftar: readonly string[], x: string, pilih: boolean) => (pilih ? [...daftar, x] : daftar.filter((y) => y !== x))

type Props = { tersedia: SasaranTersedia; nilai: SasaranSiaran; onUbah: (s: SasaranSiaran) => void; galat?: string }

/**
 * Sasaran siaran (SPEC-V0.2 §8.4): semua desa, kecamatan tertentu, atau desa tertentu. Yang bisa dipilih hanya desa Aktif dan
 * Uji coba. Kalimat di bawahnya menyebut banyaknya desa penerima, atau galat sasaran dari peramban dan server.
 */
export function PilihSasaran({ tersedia, nilai, onUbah, galat }: Props) {
  const n = jumlahDesaSasaran(tersedia, nilai)
  const petunjuk = nilai.jenis === 'kecamatan' ? 'Pilih paling sedikit satu kecamatan.' : 'Pilih paling sedikit satu desa.'
  const kalimat = galat || (n === 0 ? petunjuk : `Siaran dikirim ke ${formatAngka(n)} desa.`)
  return (
    <div className="flex flex-col gap-3">
      <RadioGroup
        label="Sasaran"
        pilihan={JENIS_SASARAN.map((j) => ({ id: j, label: LABEL_JENIS_SASARAN[j] }))}
        nilai={nilai.jenis}
        onUbah={(j) => onUbah(kosong(j as JenisSasaran))}
      />
      {nilai.jenis === 'kecamatan' && (
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">Kecamatan</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {tersedia.kecamatan.map((k) => (
              <Checkbox
                key={k.kode}
                isSelected={nilai.kode.includes(k.kode)}
                onChange={(pilih) => onUbah({ jenis: 'kecamatan', kode: ganti(nilai.kode, k.kode, pilih) })}
              >
                {`${k.nama} (${formatAngka(k.desa.length)} desa)`}
              </Checkbox>
            ))}
          </div>
        </fieldset>
      )}
      {nilai.jenis === 'desa' && (
        <div className="grid gap-4 sm:grid-cols-2">
          {tersedia.kecamatan.map((k) => (
            <fieldset key={k.kode} className="flex flex-col gap-1.5">
              <legend className="mb-1 text-teks-kecil font-medium text-tinta-2">{k.nama}</legend>
              {k.desa.map((d) => (
                <Checkbox key={d.id} isSelected={nilai.id.includes(d.id)} onChange={(pilih) => onUbah({ jenis: 'desa', id: ganti(nilai.id, d.id, pilih) })}>
                  {d.nama}
                </Checkbox>
              ))}
            </fieldset>
          ))}
        </div>
      )}
      <p aria-live="polite" className={cn(galat ? gayaGalat : 'text-teks-kecil text-tinta-2')}>
        {kalimat}
      </p>
    </div>
  )
}

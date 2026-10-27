import { formatAngka } from '@/domain/format/angka'
import { FIELD_IMPOR, FIELD_IMPOR_WAJIB, LABEL_FIELD_IMPOR, periksaPemetaan, type Pemetaan } from '@/domain/impor/kolom'
import type { LaporanImpor } from '@/domain/impor/schema'
import { Select } from '@/ui/isian/Select'
import { Tombol } from '@/ui/tombol/Tombol'
import { Banner } from '@/ui/umpan-balik/Banner'

const ABAIKAN = 'abaikan'
const PILIHAN = [
  { id: ABAIKAN, label: 'Abaikan kolom ini' },
  ...FIELD_IMPOR.map((f) => ({ id: f, label: `${LABEL_FIELD_IMPOR[f]}${FIELD_IMPOR_WAJIB.includes(f) ? ' (wajib)' : ''}` })),
]

type Props = {
  laporan: LaporanImpor
  pemetaan: Pemetaan
  onUbah: (pemetaan: Pemetaan) => void
  onKembali: () => void
  onLanjut: () => void
}

/** Langkah 2 impor (SPEC §6.8): tiap kolom berkas dipakai sebagai field apa. Kolom yang tidak dikenali ditandai. */
export function LangkahCocokkan({ laporan, pemetaan, onUbah, onKembali, onLanjut }: Props) {
  const { kurang, ganda } = periksaPemetaan(pemetaan)
  const dikenali = laporan.kolom.filter((k) => k.field !== null).length
  const contoh = (i: number) => laporan.baris.map((b) => b.sel[i]?.trim() ?? '').find((s) => s !== '') ?? '—'
  return (
    <div className="flex flex-col gap-5">
      <p>
        <span className="font-medium">{laporan.namaBerkas}</span> · {formatAngka(laporan.baris.length)} baris ·{' '}
        {formatAngka(laporan.kolom.length)} kolom. {formatAngka(dikenali)} kolom dikenali otomatis
        {dikenali < laporan.kolom.length ? `; ${formatAngka(laporan.kolom.length - dikenali)} belum dikenali` : ''}.
      </p>
      <ul aria-label="Pemetaan kolom" className="divide-y divide-garis border-y border-garis bg-lembar">
        {laporan.kolom.map((k, i) => (
          <li key={`${i}-${k.judul}`} className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_18rem] sm:items-center">
            <div className="min-w-0">
              <p className="font-medium">
                {k.judul}
                {k.field === null && <span className="ml-2 text-teks-kecil font-normal text-oker">Belum dikenali</span>}
              </p>
              <p className="truncate text-teks-kecil text-tinta-2">Contoh: {contoh(i)}</p>
            </div>
            <Select
              label={`Kolom “${k.judul}” dipakai sebagai`}
              labelTersembunyi
              pilihan={PILIHAN}
              nilai={pemetaan[i] ?? ABAIKAN}
              onUbah={(id) => onUbah(pemetaan.map((f, j) => (j === i ? (FIELD_IMPOR.find((x) => x === id) ?? null) : f)))}
            />
          </li>
        ))}
      </ul>
      {kurang.length > 0 && <Banner nada="galat">Kolom wajib belum ada: {kurang.map((f) => LABEL_FIELD_IMPOR[f]).join(', ')}.</Banner>}
      {ganda.length > 0 && <Banner nada="galat">Dipakai lebih dari satu kolom: {ganda.map((f) => LABEL_FIELD_IMPOR[f]).join(', ')}.</Banner>}
      <div className="flex flex-wrap justify-end gap-2 border-t border-garis pt-4">
        <Tombol onPress={onKembali}>Pilih berkas lain</Tombol>
        <Tombol varian="utama" isDisabled={kurang.length > 0 || ganda.length > 0} onPress={onLanjut}>
          Lanjut ke pemeriksaan
        </Tombol>
      </div>
    </div>
  )
}

import { CheckCircle, WarningCircle } from '@phosphor-icons/react'
import { formatRasio, type Pemeriksaan } from '@/domain/website/kontras'
import { Tombol } from '@/ui/tombol/Tombol'

const NAMA: Readonly<Record<Pemeriksaan['kunci'], string>> = {
  'utama-latar': 'Warna utama di atas latar',
  'putih-utama': 'Teks putih di atas warna utama',
  'aksen-latar': 'Warna aksen di atas latar',
}
const MINIMUM = (m: number) => (m === 4.5 ? '4,5' : '3')

type Props = {
  pemeriksaan: readonly Pemeriksaan[]
  /** Dipanggil dengan kunci pemeriksaan yang gagal; yang tampil hanya satu tombol untuk tiap warna. */
  onGelapkan: (kunci: Pemeriksaan['kunci']) => void
}

/** Tombol "versi lebih gelap" hanya di pemeriksaan gagal pertama tiap warna: dua pemeriksaan warna utama dibereskan sekaligus. */
function pemilikTombol(pemeriksaan: readonly Pemeriksaan[]): Set<Pemeriksaan['kunci']> {
  const gagal = pemeriksaan.filter((p) => !p.lolos)
  const utama = gagal.find((p) => p.kunci !== 'aksen-latar')
  const aksen = gagal.find((p) => p.kunci === 'aksen-latar')
  return new Set([utama?.kunci, aksen?.kunci].filter((k): k is Pemeriksaan['kunci'] => k !== undefined))
}

/** Hasil pemeriksa kontras (SPEC-V0.2 §11.1): satu baris per pemeriksaan dengan rasio, pesan, dan jalan keluarnya. */
export function PanelKontras({ pemeriksaan, onGelapkan }: Props) {
  const gagal = pemeriksaan.filter((p) => !p.lolos).length
  const tombol = pemilikTombol(pemeriksaan)
  return (
    <section aria-label="Pemeriksaan kontras" className="flex flex-col gap-2 rounded-2 border border-garis bg-lembar p-3">
      <p role="status" aria-live="polite" className="text-teks-kecil font-medium">
        {gagal === 0 ? 'Semua pemeriksaan kontras lolos.' : `${gagal} pemeriksaan kontras belum lolos.`}
      </p>
      <ul className="flex flex-col gap-2">
        {pemeriksaan.map((p) => (
          <li key={p.kunci} className="flex flex-wrap items-start gap-x-3 gap-y-1">
            {p.lolos ? (
              <CheckCircle aria-hidden size={18} weight="fill" className="mt-0.5 shrink-0 text-hijau" />
            ) : (
              <WarningCircle aria-hidden size={18} weight="fill" className="mt-0.5 shrink-0 text-merah" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-teks-kecil">
                <span className="font-medium">{NAMA[p.kunci]}</span>
                <span className="text-tinta-2">
                  {' '}
                  · {formatRasio(p.rasio)} : 1 (perlu {MINIMUM(p.minimum)} : 1)
                </span>
              </p>
              {p.pesan && <p className="text-teks-kecil text-merah">{p.pesan}</p>}
            </div>
            {tombol.has(p.kunci) && (
              <Tombol ukuran="kecil" onPress={() => onGelapkan(p.kunci)}>
                Pakai versi lebih gelap
              </Tombol>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

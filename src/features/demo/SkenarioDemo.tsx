import { Tombol } from '@/ui/tombol/Tombol'
import { SKENARIO_DEMO, type TombolSkenario } from './skenario'

type Props = { onJalankan: (tombol: TombolSkenario, kunci: string) => void; sedang: string | null }

/** Tiga skenario terpandu (SPEC §3.6): langkah bernomor; tiap tombol masuk dengan akun yang tepat lalu membuka halamannya. */
export function SkenarioDemo({ onJalankan, sedang }: Props) {
  return (
    <section className="mt-10" aria-labelledby="judul-skenario">
      <h2 id="judul-skenario" className="text-label font-medium text-tinta-2 uppercase">
        Skenario demo
      </h2>
      <p className="mt-1 text-tinta-2">
        Tiga alur yang menunjukkan Sinfodes bekerja dari ujung ke ujung. Ikuti langkahnya berurutan; setiap tombol masuk dengan akun yang
        tepat, lalu membuka halamannya.
      </p>
      <ol className="mt-4 flex flex-col gap-8">
        {SKENARIO_DEMO.map((s, i) => (
          <li key={s.id} className="border-t-[1.5px] border-tinta pt-4">
            <h3 className="font-serif text-judul-bagian font-medium">
              {i + 1}. {s.judul}
            </h3>
            <p className="mt-1 text-tinta-2">{s.ringkas}</p>
            <ol aria-label={`Langkah ${s.judul}`} className="mt-3 divide-y divide-garis border-y border-garis bg-lembar">
              {s.langkah.map((l, j) => (
                <li key={l.teks} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                  <p className="flex gap-3">
                    <span aria-hidden className="w-4 shrink-0 font-mono text-tinta-2">
                      {j + 1}
                    </span>
                    <span>{l.teks}</span>
                  </p>
                  <div className="flex shrink-0 flex-wrap gap-2 pl-7 sm:justify-end sm:pl-0">
                    {l.tombol.map((t) => {
                      const kunci = `${s.id}-${j}-${t.label}`
                      return (
                        <Tombol key={t.label} ukuran="kecil" memuat={sedang === kunci} onPress={() => onJalankan(t, kunci)}>
                          {t.label}
                        </Tombol>
                      )
                    })}
                  </div>
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ol>
    </section>
  )
}

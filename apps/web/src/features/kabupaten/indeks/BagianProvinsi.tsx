import { LABEL_KATEGORI_KABUPATEN, formatUkuran } from '@/domain/indeks/kategori'
import type { PapanIndeks } from '@/domain/indeks/schema'
import { cn } from '@/ui/cn'
import { labelJuara } from './juara'

const kepala = 'border-b border-garis px-3 py-2 text-label font-medium whitespace-nowrap text-tinta-2 uppercase'
const sel = 'px-3 py-2'

const KETERANGAN: Readonly<Record<'umum' | 'merata', string>> = {
  umum: 'Nilai kabupaten adalah median Indeks desa yang ber-Indeks. Syaratnya paling sedikit 3 desa.',
  merata: 'Persen desa di kabupaten itu yang sudah bergabung dengan Sinfodes.',
}

/** Peringkat antarkabupaten se-provinsi: podium dan posisi kabupaten sendiri. Kabupaten lain di luar podium tidak dikirim server. */
export function BagianProvinsi({ papan }: { papan: PapanIndeks }) {
  const { provinsi } = papan
  return (
    <section aria-labelledby="judul-provinsi" className="flex flex-col gap-5">
      <h2 id="judul-provinsi" className="font-serif text-judul-bagian font-medium">
        {`Se-provinsi ${provinsi.provinsi.nama}`}
      </h2>
      <div className="grid gap-6 lg:grid-cols-2">
        {provinsi.kategori.map((k) => (
          <div key={k.kategori} className="flex flex-col gap-2">
            <h3 className="font-medium">{LABEL_KATEGORI_KABUPATEN[k.kategori]}</h3>
            <p className="text-teks-kecil text-tinta-2">{KETERANGAN[k.kategori]}</p>
            {k.podium.length === 0 ? (
              <p className="text-tinta-2">Belum ada kabupaten yang memenuhi syarat.</p>
            ) : (
              <div className="overflow-x-auto border-y border-garis bg-lembar">
                <table className="w-full border-collapse">
                  <caption className="sr-only">{`Podium kabupaten ${LABEL_KATEGORI_KABUPATEN[k.kategori]}`}</caption>
                  <thead>
                    <tr>
                      <th scope="col" className={cn(kepala, 'text-left')}>
                        Peringkat
                      </th>
                      <th scope="col" className={cn(kepala, 'text-left')}>
                        Kabupaten
                      </th>
                      <th scope="col" className={cn(kepala, 'text-right')}>
                        Nilai
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {k.podium.map((p) => (
                      <tr key={p.kabupaten.kode} className="border-t border-garis">
                        <td className={cn(sel, 'whitespace-nowrap')}>{labelJuara(p.peringkat, p.bersama)}</td>
                        <th scope="row" className={cn(sel, 'text-left font-medium')}>
                          {p.kabupaten.nama}
                        </th>
                        <td className={cn(sel, 'text-right tabular-nums')}>{formatUkuran(k.kategori === 'umum' ? 'umum' : 'merata', p.nilai)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="font-medium">
              {k.posisi
                ? `Kabupaten ${papan.kabupaten.nama} peringkat ${k.posisi.peringkat}${k.posisi.bersama ? ' bersama' : ''} dari ${k.posisi.dari}.`
                : `Kabupaten ${papan.kabupaten.nama} belum masuk peringkat. ${k.alasan ?? ''}`.trim()}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

import { formatAngka } from '@/domain/format/angka'
import { LABEL_TINGKATAN, formatUkuran, type KategoriDesa } from '@/domain/indeks/kategori'
import type { PapanIndeks } from '@/domain/indeks/schema'
import { cn } from '@/ui/cn'
import { Cap } from '@/ui/cap/Cap'
import { labelJuara } from './juara'

const kepala = 'border-b border-garis px-3 py-2 text-label font-medium whitespace-nowrap text-tinta-2 uppercase'
const sel = 'px-3 py-2'

const JUDUL_UKURAN: Readonly<Partial<Record<KategoriDesa, string>>> = {
  layanan: 'Median jam',
  responsif: 'Poin',
  meningkat: 'Kenaikan',
  umum: 'Indeks',
}

/** Tabel peringkat satu kategori. Podium hanya diberi cap bila boleh (kecamatan dengan paling sedikit 3 desa memenuhi syarat). */
export function TabelPeringkat({ papan, tampilPodium, namaKategori }: { papan: PapanIndeks; tampilPodium: boolean; namaKategori: string }) {
  const denganKecamatan = papan.kecamatan === null
  const denganSkor = papan.peringkat.some((b) => b.skor !== null)
  const denganTingkatan = papan.kategori === 'umum'
  return (
    <div className="overflow-x-auto border-y border-garis bg-lembar">
      <table className="w-full min-w-[34rem] border-collapse">
        <caption className="sr-only">{`Peringkat ${namaKategori}, ${papan.periode.label}`}</caption>
        <thead>
          <tr>
            <th scope="col" className={cn(kepala, 'text-left')}>
              Peringkat
            </th>
            <th scope="col" className={cn(kepala, 'text-left')}>
              Desa
            </th>
            {denganKecamatan && (
              <th scope="col" className={cn(kepala, 'text-left')}>
                Kecamatan
              </th>
            )}
            <th scope="col" className={cn(kepala, 'text-right')}>
              {JUDUL_UKURAN[papan.kategori] ?? 'Persen'}
            </th>
            {denganSkor && (
              <th scope="col" className={cn(kepala, 'text-right')}>
                Skor
              </th>
            )}
            {denganTingkatan && (
              <th scope="col" className={cn(kepala, 'text-left')}>
                Tingkatan
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {papan.peringkat.map((b) => {
            const juara = tampilPodium ? labelJuara(b.peringkat, b.bersama) : null
            return (
              <tr key={b.desa.id} className="border-t border-garis">
                <td className={cn(sel, 'whitespace-nowrap tabular-nums')}>
                  <span className="inline-block w-6 text-right">{b.peringkat}</span>
                  {juara && <Cap varian="baik" label={juara} className="ml-2" />}
                </td>
                <th scope="row" className={cn(sel, 'text-left font-medium')}>
                  {b.desa.nama}
                </th>
                {denganKecamatan && <td className={cn(sel, 'whitespace-nowrap')}>{b.desa.kecamatan}</td>}
                <td className={cn(sel, 'text-right whitespace-nowrap tabular-nums')}>{formatUkuran(papan.kategori, b.ukuran)}</td>
                {denganSkor && <td className={cn(sel, 'text-right tabular-nums')}>{b.skor === null ? '' : formatAngka(b.skor, 1)}</td>}
                {denganTingkatan && <td className={sel}>{b.tingkatan ? LABEL_TINGKATAN[b.tingkatan] : ''}</td>}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

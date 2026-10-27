import { formatAngka } from '@/domain/format/angka'
import { formatTanggal } from '@/domain/format/tanggal'
import type { BarisBalita, RingkasPosyandu } from '@/domain/kesehatan/schema'
import { useBoleh } from '@/features/admin/useBoleh'
import { Cap } from '@/ui/cap/Cap'
import { DescriptionList } from '@/ui/data/DescriptionList'
import { Drawer } from '@/ui/lapisan/Drawer'
import { Tautan } from '@/ui/navigasi/Tautan'

type Props = { balita: BarisBalita | null; posyandu: readonly RingkasPosyandu[]; onTutup: () => void }

const sel = 'border-b border-garis px-2 py-1.5'

/** Rincian satu balita: data dasar, status, dan seluruh riwayat pengukurannya (terbaru dulu). */
export function LaciBalita({ balita: b, posyandu, onTutup }: Props) {
  const boleh = useBoleh()
  const bolehLihat = boleh('penduduk.lihat')
  return (
    <Drawer
      isOpen={b !== null}
      onOpenChange={(buka) => {
        if (!buka) onTutup()
      }}
      judul={b?.nama ?? 'Balita'}
    >
      {b && (
        <div className="flex flex-col gap-6">
          <DescriptionList
            items={[
              { label: 'Tanggal lahir', nilai: formatTanggal(b.tanggalLahir) },
              { label: 'Umur', nilai: `${formatAngka(b.umurBulan)} bulan` },
              {
                label: 'Ibu',
                nilai: b.ibu.id && bolehLihat ? <Tautan href={`/admin/kependudukan/penduduk/${b.ibu.id}`}>{b.ibu.nama}</Tautan> : b.ibu.nama,
              },
              { label: 'Posyandu', nilai: posyandu.find((p) => p.id === b.posyanduId)?.nama ?? null },
              { label: 'Status', nilai: b.status ? <Cap varian={b.status} /> : <span className="text-tinta-2">Belum diukur</span> },
            ]}
          />
          <table aria-label="Riwayat pengukuran" className="w-full text-left text-teks-kecil tabular-nums">
            <thead className="text-tinta-2">
              <tr>
                <th className={sel}>Tanggal</th>
                <th className={`${sel} text-right`}>Berat</th>
                <th className={`${sel} text-right`}>Tinggi</th>
              </tr>
            </thead>
            <tbody>
              {[...b.pengukuran].reverse().map((u) => (
                <tr key={u.tanggal}>
                  <td className={sel}>{formatTanggal(u.tanggal, 'pendek')}</td>
                  <td className={`${sel} text-right`}>{formatAngka(u.beratKg, 1)} kg</td>
                  <td className={`${sel} text-right`}>{formatAngka(u.tinggiCm, 1)} cm</td>
                </tr>
              ))}
            </tbody>
          </table>
          {b.pengukuran.length === 0 && <p className="text-tinta-2">Belum pernah diukur di posyandu.</p>}
          {bolehLihat && <Tautan href={`/admin/kependudukan/penduduk/${b.id}`}>Buka profil penduduk</Tautan>}
        </div>
      )}
    </Drawer>
  )
}

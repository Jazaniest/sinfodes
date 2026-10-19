import { formatAngka } from '@/domain/format/angka'
import { LABEL_TINGKATAN } from '@/domain/indeks/kategori'
import type { KartuPeringkat as DataKartu } from '@/domain/indeks/peringkat-desa'
import { Cap } from '@/ui/cap/Cap'
import { Tautan } from '@/ui/navigasi/Tautan'

const judulBagian = 'text-label font-medium text-tinta-2 uppercase'

/** Kartu Peringkat di Beranda (rencana 7C-2 butir 10): Indeks bulan terakhir tutup, posisi Juara Umum, dan satu saran. */
export function KartuPeringkat({ kartu }: { kartu: DataKartu }) {
  const posisi = kartu.umumKabupaten
  return (
    <section aria-labelledby="judul-peringkat" className="flex flex-col gap-2">
      <h2 id="judul-peringkat" className={judulBagian}>{`Peringkat · ${kartu.periode.label}`}</h2>
      <div className="flex flex-col gap-2 border-y border-garis bg-lembar px-4 py-3">
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          {kartu.indeks === null ? (
            <span className="font-medium">Belum ada Indeks</span>
          ) : (
            <>
              <span className="font-serif text-judul-bagian font-medium tabular-nums">{`Indeks ${formatAngka(kartu.indeks, 1)}`}</span>
              {kartu.tingkatan && <Cap varian="normal" label={LABEL_TINGKATAN[kartu.tingkatan]} />}
            </>
          )}
        </p>
        <p>
          {posisi
            ? `Juara Umum: peringkat ${formatAngka(posisi.peringkat)}${posisi.bersama ? ' bersama' : ''} dari ${formatAngka(posisi.dari)} di Kabupaten ${kartu.kabupaten}`
            : `Juara Umum: ${kartu.alasanUmum ?? 'belum ada peringkat'}`}
        </p>
        {kartu.saran && (
          <p className="text-tinta-2">
            {'Saran: '}
            <Tautan href={kartu.saran.href}>{kartu.saran.kalimat}</Tautan>
          </p>
        )}
        <p>
          <Tautan href="/admin/peringkat">Buka Peringkat</Tautan>
        </p>
      </div>
    </section>
  )
}

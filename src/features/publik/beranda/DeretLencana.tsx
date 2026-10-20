import { keAlamat } from '@/app/alamat'
import type { LencanaPublik } from '@/domain/indeks/lencana'
import { CapLencana } from '@/ui/website/Lencana'

/** Deret lencana juara di atas beranda website desa; hanya podium dari periode tutup, tanpa Indeks atau tingkatan. */
export function DeretLencana({ lencana }: { lencana: readonly LencanaPublik[] }) {
  return (
    <section data-bagian="lencana" aria-label="Lencana juara">
      <ul className="flex flex-wrap gap-3">
        {lencana.map((l) => (
          <li key={l.kode} className="min-w-0">
            <CapLencana lencana={l} href={keAlamat({ jenis: 'induk' }, `/lencana/${l.kode}`)} varian="website" />
          </li>
        ))}
      </ul>
    </section>
  )
}

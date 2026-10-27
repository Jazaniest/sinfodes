import { useEffect, useRef } from 'react'
import { formatPersen, formatRupiah } from '@/domain/format/angka'
import { formatTanggal, tanggalIsoWib } from '@/domain/format/tanggal'
import { rasio } from '@/domain/keuangan/schema'
import type { IdentitasPublik } from '@/domain/publik/schema'
import { bagianApbdes, type ApbdesPublik } from '@/domain/publik/transparansi'

/** Dokumen APBDes dicetak tegak; aturan ini hanya terpasang selama lembar ada. */
const GAYA_CETAK = '@page { size: A4 portrait; margin: 15mm; }'
const sel = 'border border-tinta px-1.5 py-1 align-top'

type Props = { apbdes: ApbdesPublik; identitas: IdentitasPublik; onSelesai: () => void }

/**
 * Lembar *Unduh dokumen APBDes* (SPEC §9): kop desa, tiga tabel APBDes, dan tanggal data. Tidak tampil di layar. Dialog
 * cetak browser langsung dibuka ("Simpan sebagai PDF" ada di sana), lalu lembar dilepas.
 */
export function LembarApbdes({ apbdes, identitas, onSelesai }: Props) {
  const sudahDicetak = useRef(false)
  useEffect(() => {
    window.addEventListener('afterprint', onSelesai)
    return () => window.removeEventListener('afterprint', onSelesai)
  }, [onSelesai])
  useEffect(() => {
    // Sekali saja, juga di StrictMode (efek dijalankan dua kali saat pengembangan).
    if (sudahDicetak.current) return
    sudahDicetak.current = true
    window.print()
  }, [])
  return (
    <section aria-label={`Lembar cetak APBDes ${apbdes.tahun}`} className="hidden print:block">
      <style>{GAYA_CETAK}</style>
      <header className="mb-4 border-b-2 border-tinta pb-2 text-center">
        <p className="font-serif text-judul-bagian font-medium uppercase">Anggaran Pendapatan dan Belanja Desa Tahun {apbdes.tahun}</p>
        <p>
          Desa {identitas.nama} · Kecamatan {identitas.kecamatan.nama} · Kabupaten {identitas.kabupaten.nama}
        </p>
        <p className="text-teks-kecil">Realisasi menurut data Siskeudes {formatTanggal(apbdes.sinkronPada)}</p>
      </header>
      {bagianApbdes(apbdes).map((b) => (
        <table key={b.kunci} className="mb-5 w-full border-collapse text-[9pt]">
          <caption className="mb-1 text-left font-semibold">{b.judul}</caption>
          <thead>
            <tr>
              <th scope="col" className={`${sel} w-16 text-left`}>
                Kode
              </th>
              <th scope="col" className={`${sel} text-left`}>
                Uraian
              </th>
              <th scope="col" className={`${sel} text-right`}>
                Anggaran
              </th>
              <th scope="col" className={`${sel} text-right`}>
                Realisasi
              </th>
              <th scope="col" className={`${sel} w-14 text-right`}>
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {b.baris.map((r) => (
              <tr key={r.kode}>
                <td className={sel}>{r.kode}</td>
                <td className={sel}>{r.nama}</td>
                <td className={`${sel} text-right`}>{formatRupiah(r.anggaran)}</td>
                <td className={`${sel} text-right`}>{formatRupiah(r.realisasi)}</td>
                <td className={`${sel} text-right`}>{formatPersen(rasio(r))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <th scope="row" colSpan={2} className={`${sel} text-left`}>
                {b.jumlah.label}
              </th>
              <td className={`${sel} text-right`}>{formatRupiah(b.jumlah.nilai.anggaran)}</td>
              <td className={`${sel} text-right`}>{formatRupiah(b.jumlah.nilai.realisasi)}</td>
              <td className={`${sel} text-right`}>{formatPersen(rasio(b.jumlah.nilai))}</td>
            </tr>
          </tfoot>
        </table>
      ))}
      <p className="text-teks-kecil">
        Dicetak dari website Desa {identitas.nama} pada {formatTanggal(tanggalIsoWib(new Date()))}.
      </p>
    </section>
  )
}

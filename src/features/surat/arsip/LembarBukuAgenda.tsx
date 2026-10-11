import { useEffect, useRef } from 'react'
import { formatAngka } from '@/domain/format/angka'
import { formatBulan, formatTanggal, tanggalIsoWib } from '@/domain/format/tanggal'
import { barisCsvBukuAgenda, type BarisSuratKeluar } from '@/domain/surat/arsip'
import { useSesiAdmin } from '../../admin/sesi-konteks'

/** Buku Agenda dicetak mendatar; aturan ini hanya terpasang selama lembar ada. */
const GAYA_CETAK = '@page { size: A4 landscape; margin: 12mm; }'

type Props = { baris: readonly BarisSuratKeluar[]; bulan: string; hariIni: Date; onSelesai: () => void }

/**
 * Lembar cetak Buku Agenda Surat Keluar (SPEC §7.4 layar 5). Tidak tampil di layar. Dialog cetak browser langsung
 * dibuka ("Simpan sebagai PDF" ada di sana), dan lembar dilepas setelah dialog ditutup. Kolomnya sama dengan CSV.
 */
export function LembarBukuAgenda({ baris, bulan, hariIni, onSelesai }: Props) {
  const { desa } = useSesiAdmin()
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
  const [kepala, ...isi] = barisCsvBukuAgenda(baris)
  return (
    <section aria-label="Buku Agenda Surat Keluar" className="hidden print:block">
      <style>{GAYA_CETAK}</style>
      <header className="mb-3 text-center">
        <p className="font-serif text-judul-bagian font-medium uppercase">Buku Agenda Surat Keluar</p>
        <p>
          Desa {desa.nama} · Kecamatan {desa.kecamatan.nama} · {desa.kabupaten.nama}
        </p>
        <p className="text-teks-kecil">
          {formatBulan(bulan)} · {formatAngka(baris.length)} surat · dicetak {formatTanggal(tanggalIsoWib(hariIni))}
        </p>
      </header>
      <table className="w-full border-collapse text-[9pt]">
        <thead>
          <tr>
            {kepala.map((judul) => (
              <th key={String(judul)} scope="col" className="border border-tinta px-1.5 py-1 text-left font-medium">
                {judul}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isi.map((sel, i) => (
            <tr key={baris[i].id}>
              {sel.map((nilai, j) => (
                <td key={j} className={j === 1 ? 'border border-tinta px-1.5 py-1 align-top font-mono' : 'border border-tinta px-1.5 py-1 align-top'}>
                  {nilai}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

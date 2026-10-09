import { useEffect, useRef } from 'react'
import { formatAngka } from '@/domain/format/angka'
import { formatTanggal, tanggalIsoWib } from '@/domain/format/tanggal'
import { barisBukuInduk, KOLOM_BUKU_INDUK } from '@/domain/penduduk/buku-induk'
import type { BarisPenduduk } from '@/domain/penduduk/schema'
import { useSesiAdmin } from '../admin/sesi-konteks'

/** Buku Induk dicetak mendatar; aturan ini hanya terpasang selama lembar ada. */
const GAYA_CETAK = '@page { size: A4 landscape; margin: 10mm; }'

type Props = { baris: readonly BarisPenduduk[]; hariIni: Date; onSelesai: () => void }

/**
 * Lembar cetak Buku Induk Penduduk (SPEC §6.2, Permendagri 47/2016). Tidak tampil di layar. Dialog cetak browser
 * langsung dibuka ("Simpan sebagai PDF" ada di sana), dan lembar dilepas setelah dialog ditutup.
 */
export function LembarBukuInduk({ baris, hariIni, onSelesai }: Props) {
  const { desa, dusun } = useSesiAdmin()
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
  const ctx = { dusun, istilah: desa.istilahWilayah }
  return (
    <section aria-label="Buku Induk Penduduk" className="hidden print:block">
      <style>{GAYA_CETAK}</style>
      <header className="mb-3 text-center">
        <p className="font-serif text-judul-bagian font-medium uppercase">Buku Induk Penduduk</p>
        <p>
          Desa {desa.nama} · Kecamatan {desa.kecamatan.nama} · {desa.kabupaten.nama}
        </p>
        <p className="text-teks-kecil">
          Dicetak {formatTanggal(tanggalIsoWib(hariIni))} · {formatAngka(baris.length)} penduduk
        </p>
      </header>
      <table className="w-full border-collapse text-label leading-tight">
        <thead>
          <tr>
            {KOLOM_BUKU_INDUK.map((k) => (
              <th key={k} scope="col" className="border border-tinta px-1 py-0.5 text-left align-bottom font-medium">
                {k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {baris.map((p, i) => (
            <tr key={p.id} className="break-inside-avoid">
              {barisBukuInduk(p, i + 1, ctx).map((isi, j) => (
                <td key={KOLOM_BUKU_INDUK[j]} className="border border-tinta px-1 py-0.5 align-top">
                  {isi}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

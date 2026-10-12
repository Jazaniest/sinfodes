import { useEffect, useRef } from 'react'
import type { IsiBuku } from '@/domain/buku/schema'
import { formatAngka } from '@/domain/format/angka'
import { formatTanggal } from '@/domain/format/tanggal'
import { useSesiAdmin } from '../admin/sesi-konteks'

/** Buku administrasi dicetak mendatar; aturan ini hanya terpasang selama lembar ada. */
const GAYA_CETAK = '@page { size: A4 landscape; margin: 10mm; }'

type Props = { isi: IsiBuku; hariIni: string; onSelesai: () => void }

/**
 * Lembar cetak buku administrasi (Permendagri 47/2016): kepala buku, semua baris, dan tanggal cetak. Tidak tampil di
 * layar. Dialog cetak browser langsung dibuka ("Simpan sebagai PDF" ada di sana), lalu lembar dilepas.
 */
export function LembarBuku({ isi, hariIni, onSelesai }: Props) {
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
  return (
    <section aria-label={`Lembar cetak ${isi.buku.nama}`} className="hidden print:block">
      <style>{GAYA_CETAK}</style>
      <header className="mb-3 text-center">
        <p className="font-serif text-judul-bagian font-medium uppercase">{isi.buku.nama}</p>
        <p>
          Desa {desa.nama} · Kecamatan {desa.kecamatan.nama} · {desa.kabupaten.nama}
        </p>
        <p className="text-teks-kecil">
          Dicetak {formatTanggal(hariIni)} · {formatAngka(isi.meta.total)} baris
        </p>
      </header>
      <table className="w-full border-collapse text-[8pt]">
        <thead>
          <tr>
            {isi.kolom.map((k) => (
              <th key={k} scope="col" className="border border-tinta px-1 py-0.5 text-left align-top">
                {k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isi.baris.map((b, i) => (
            <tr key={i}>
              {b.map((sel, j) => (
                <td key={j} className="border border-tinta px-1 py-0.5 align-top">
                  {sel}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

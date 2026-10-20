import { formatRupiah, terbilangRupiah } from '@/domain/format/angka'
import { formatTanggal } from '@/domain/format/tanggal'
import type { Kwitansi } from '@/domain/langganan/tagihan'

/** Kwitansi dicetak tegak A4; aturan ini hanya terpasang selama lembar terbuka. */
const GAYA_CETAK = '@page { size: A4 portrait; margin: 15mm; }'

const label = 'text-label font-medium text-tinta-2 uppercase'

/**
 * Kwitansi pembayaran langganan (SPEC-V0.2 §10.4): satu komponen untuk layar dan cetak, dipakai di Konsol dan panel desa.
 * Dari Tim Sinfodes tanpa tanda tangan elektronik; terbit otomatis saat tagihan ditandai lunas.
 */
export function LembarKwitansi({ kwitansi: k }: { kwitansi: Kwitansi }) {
  return (
    <article
      data-terang
      aria-label={`Kwitansi ${k.nomor}`}
      className="mx-auto flex w-full max-w-[210mm] flex-col gap-6 border border-garis bg-lembar p-8 text-tinta print:max-w-none print:border-0 print:p-0"
    >
      <style>{GAYA_CETAK}</style>
      <header className="flex items-end justify-between gap-4 border-b-2 border-tinta pb-3">
        <p className="font-serif text-judul-halaman font-semibold">Sinfodes</p>
        <h1 className="font-serif text-judul-halaman font-medium">Kwitansi</h1>
      </header>

      <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
        <div>
          <dt className={label}>Nomor kwitansi</dt>
          <dd className="font-mono">{k.nomor}</dd>
        </div>
        <div>
          <dt className={label}>Tanggal diterima</dt>
          <dd>{formatTanggal(k.diterimaPada)}</dd>
        </div>
      </dl>

      <section aria-label="Penerimaan" className="flex flex-col gap-4">
        <p>
          Telah diterima dari <span className="font-medium">{`Pemerintah Desa ${k.desa.nama}`}</span>
          {`, Kecamatan ${k.desa.kecamatan}, Kabupaten ${k.desa.kabupaten}`}
        </p>
        <div className="border-y border-tinta py-4">
          <p className={label}>Uang sejumlah</p>
          <p className="font-serif text-judul-warta font-medium tabular-nums">{formatRupiah(k.nominal)}</p>
          <p className="mt-1 text-tinta-2 italic">{`Terbilang: ${terbilangRupiah(k.nominal)}`}</p>
        </div>
        <p>{`untuk pembayaran langganan Sinfodes paket ${k.paket}, ${k.periode}, tagihan ${k.nomorTagihan}`}</p>
      </section>

      <div className="ml-auto flex min-h-24 w-56 flex-col justify-between text-center">
        <p>{formatTanggal(k.diterimaPada)}</p>
        <p className="border-t border-tinta pt-1 font-medium">Tim Sinfodes</p>
      </div>
      <p className="text-teks-kecil text-tinta-2">Kwitansi dibuat otomatis oleh sistem. Dokumen demo.</p>
    </article>
  )
}

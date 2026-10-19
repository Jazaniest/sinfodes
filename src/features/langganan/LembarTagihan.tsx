import { formatRupiah } from '@/domain/format/angka'
import { formatTanggal } from '@/domain/format/tanggal'
import type { TagihanCetak } from '@/domain/langganan/schema'
import { LABEL_PERIODE_TAGIHAN, LABEL_STATUS_TAGIHAN } from '@/domain/langganan/tagihan'

/** Tagihan dicetak tegak A4; aturan ini hanya terpasang selama lembar terbuka. */
const GAYA_CETAK = '@page { size: A4 portrait; margin: 15mm; }'

const label = 'text-label font-medium text-tinta-2 uppercase'

/**
 * Dokumen Tagihan Langganan (SPEC-V0.2 §10): satu komponen untuk layar dan cetak, dipakai di panel desa dan di Konsol (7D-2).
 * Memuat nomor, desa, periode, nominal beserta rinciannya, rekening tujuan, dan cara konfirmasi pembayaran.
 */
export function LembarTagihan({ tagihan: t }: { tagihan: TagihanCetak }) {
  return (
    <article
      aria-label={`Tagihan ${t.nomor}`}
      className="mx-auto flex w-full max-w-[210mm] flex-col gap-6 border border-garis bg-lembar p-8 text-tinta print:max-w-none print:border-0 print:p-0"
    >
      <style>{GAYA_CETAK}</style>
      <header className="flex items-end justify-between gap-4 border-b-2 border-tinta pb-3">
        <p className="font-serif text-judul-halaman font-semibold">Sinfodes</p>
        <h1 className="font-serif text-judul-halaman font-medium">Tagihan Langganan</h1>
      </header>

      <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-3">
        <div>
          <dt className={label}>Nomor tagihan</dt>
          <dd className="font-mono">{t.nomor}</dd>
        </div>
        <div>
          <dt className={label}>Tanggal terbit</dt>
          <dd>{formatTanggal(t.terbit)}</dd>
        </div>
        <div>
          <dt className={label}>Jatuh tempo</dt>
          <dd className="font-medium">{formatTanggal(t.jatuhTempo)}</dd>
        </div>
      </dl>

      <section aria-label="Ditagihkan kepada" className="flex flex-col gap-0.5">
        <p className={label}>Ditagihkan kepada</p>
        <p className="font-medium">{`Pemerintah Desa ${t.desa.nama}`}</p>
        <p>{`Kecamatan ${t.desa.kecamatan}, Kabupaten ${t.desa.kabupaten}`}</p>
        <p className="text-tinta-2">{t.desa.alamatKantor}</p>
      </section>

      <section aria-label="Rincian" className="flex flex-col gap-2">
        <p className={label}>Rincian</p>
        <p>{`Langganan paket ${t.paket}, ${LABEL_PERIODE_TAGIHAN[t.periode.jenis].toLowerCase()}: ${t.periode.label} (${formatTanggal(t.periode.mulai)} - ${formatTanggal(t.periode.sampai)})`}</p>
        <div className="border-y border-tinta py-4">
          <p className={label}>Jumlah yang harus ditransfer</p>
          <p className="font-serif text-judul-warta font-medium tabular-nums">{formatRupiah(t.nominal)}</p>
          <p className="text-teks-kecil text-tinta-2">{`Harga paket ${formatRupiah(t.harga)} + kode unik ${t.kodeUnik} = ${formatRupiah(t.nominal)}`}</p>
        </div>
      </section>

      <section aria-label="Rekening tujuan" className="flex flex-col gap-0.5">
        <p className={label}>Transfer ke</p>
        <p className="font-medium">{t.rekening.bank}</p>
        <p className="font-mono text-judul-bagian">{t.rekening.nomor}</p>
        <p>{`a.n. ${t.rekening.atasNama}`}</p>
      </section>

      <p>Setelah transfer, unggah bukti di panel desa: Pengaturan → Langganan. Transfer tepat sesuai nominal supaya pembayaran mudah dicocokkan.</p>
      {t.status !== 'terbit' && (
        <p className="font-medium">
          {`Status: ${LABEL_STATUS_TAGIHAN[t.status]}`}
          {t.dibatalkan && ` (${t.dibatalkan.alasan})`}
        </p>
      )}
      <p className="text-teks-kecil text-tinta-2">Dokumen demo. Rekening di atas bukan rekening sungguhan.</p>
    </article>
  )
}

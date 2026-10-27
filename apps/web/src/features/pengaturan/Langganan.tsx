import { useQuery } from '@tanstack/react-query'
import { pesanGalat } from '@/api/galat'
import { opsiLangganan } from '@/api/langganan'
import { REKENING_SINFODES } from '@/app/kontak-sinfodes'
import { formatRupiah, formatUkuranKb } from '@/domain/format/angka'
import { formatTanggal, tanggalIsoWib } from '@/domain/format/tanggal'
import { LABEL_PERIODE_TAGIHAN, type Tagihan } from '@/domain/langganan/tagihan'
import { CapTagihan } from '../langganan/CapTagihan'
import { hrefKwitansi, hrefTagihan } from '../langganan/tautan'
import { DescriptionList } from '@/ui/data/DescriptionList'
import { Tautan } from '@/ui/navigasi/Tautan'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'
import { TautanTombol } from '@/ui/tombol/TautanTombol'
import { Banner } from '@/ui/umpan-balik/Banner'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { useSesiAdmin } from '../admin/sesi-konteks'
import { FormBukti } from './FormBukti'
import { KepalaPengaturan } from './TabPengaturan'

const judulBagian = 'font-serif text-judul-bagian font-medium'
const kepala = 'border-b border-garis py-1.5 pr-4 text-left text-label font-medium text-tinta-2 uppercase'
const sel = 'border-b border-garis py-2.5 pr-4 align-top'

/** Menyalin angka nominal tanpa titik ribuan (mis. "1500127"), supaya bisa ditempel di aplikasi bank. */
function salinNominal(nominal: number) {
  void navigator.clipboard?.writeText(String(nominal)).then(() => tampilkanToast({ pesan: 'Nominal disalin.', nada: 'berhasil' }))
}

function RingkasanBukti({ t }: { t: Tagihan }) {
  const b = t.bukti
  if (!b) return null
  return (
    <div className="flex max-w-xl flex-col gap-3">
      <p>
        Bukti sudah dikirim {formatTanggal(b.diunggahPada.slice(0, 10))} oleh {b.oleh.nama}. Tim Sinfodes memeriksa bukti dalam 1-2 hari kerja.
      </p>
      <DescriptionList
        items={[
          { label: 'Tanggal transfer', nilai: formatTanggal(b.tanggalTransfer) },
          { label: 'Nama pengirim', nilai: b.namaPengirim },
          { label: 'Nominal ditransfer', nilai: formatRupiah(b.nominalTransfer) },
          { label: 'Berkas', nilai: `${b.berkas} · ${formatUkuranKb(b.ukuranKb)}` },
        ]}
      />
      {b.dataUrl && <img src={b.dataUrl} alt="Bukti transfer yang dikirim" className="max-h-56 w-auto max-w-full self-start border border-garis" />}
    </div>
  )
}

function TagihanBerjalan({ t, hariIni }: { t: Tagihan; hariIni: string }) {
  return (
    <section aria-labelledby="judul-berjalan" className="flex flex-col gap-4">
      <h2 id="judul-berjalan" className={judulBagian}>
        Tagihan berjalan
      </h2>
      {t.penolakanTerakhir && (
        <Banner nada="peringatan">{`Bukti sebelumnya ditolak: ${t.penolakanTerakhir.alasan}. Silakan unggah ulang.`}</Banner>
      )}
      <div className="flex max-w-xl flex-col gap-4 border border-garis bg-lembar p-5">
        <p className="text-teks-kecil text-tinta-2">{`${t.nomor} · ${t.periode.label}`}</p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-label font-medium text-tinta-2 uppercase">Transfer tepat sebesar</p>
            <p aria-label={`Nominal ${formatRupiah(t.nominal)}`} className="font-serif text-judul-warta font-medium tabular-nums">
              {formatRupiah(t.nominal)}
            </p>
            <p className="text-teks-kecil text-tinta-2">{`Harga paket ${formatRupiah(t.harga)} + kode unik ${t.kodeUnik}`}</p>
          </div>
          <Tombol onPress={() => salinNominal(t.nominal)}>Salin nominal</Tombol>
        </div>
        <DescriptionList
          items={[
            { label: 'Jatuh tempo', nilai: <span className="inline-flex flex-wrap items-center gap-2">{formatTanggal(t.jatuhTempo)}<CapTagihan tagihan={t} hariIni={hariIni} /></span> },
            { label: 'Bank tujuan', nilai: REKENING_SINFODES.bank },
            { label: 'Nomor rekening', nilai: <span className="font-mono">{REKENING_SINFODES.nomor}</span> },
            { label: 'Atas nama', nilai: REKENING_SINFODES.atasNama },
          ]}
        />
        <div>
          <TautanTombol href={hrefTagihan(t.id)}>Unduh tagihan</TautanTombol>
        </div>
      </div>
      {t.status === 'terbit' ? (
        <div className="flex flex-col gap-3">
          <h3 className="font-medium">Sudah transfer? Kirim buktinya</h3>
          <FormBukti key={t.id} tagihan={t} />
        </div>
      ) : (
        <RingkasanBukti t={t} />
      )}
    </section>
  )
}

function RiwayatTagihan({ daftar, hariIni }: { daftar: readonly Tagihan[]; hariIni: string }) {
  return (
    <section aria-labelledby="judul-riwayat-tagihan" className="flex flex-col gap-2">
      <h2 id="judul-riwayat-tagihan" className={judulBagian}>
        Riwayat tagihan
      </h2>
      {daftar.length === 0 ? (
        <p className="text-tinta-2">Belum ada tagihan.</p>
      ) : (
        <div className="overflow-x-auto">
          <table aria-labelledby="judul-riwayat-tagihan" className="w-full min-w-[40rem]">
            <thead>
              <tr>
                <th scope="col" className={kepala}>Nomor</th>
                <th scope="col" className={kepala}>Periode</th>
                <th scope="col" className={`${kepala} text-right`}>Nominal</th>
                <th scope="col" className={kepala}>Jatuh tempo</th>
                <th scope="col" className={kepala}>Status</th>
                <th scope="col" className={kepala}>
                  <span className="sr-only">Dokumen</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {daftar.map((t) => (
                <tr key={t.id}>
                  <th scope="row" className={`${sel} font-mono font-normal`}>{t.nomor}</th>
                  <td className={sel}>{t.periode.label}</td>
                  <td className={`${sel} text-right tabular-nums`}>{formatRupiah(t.nominal)}</td>
                  <td className={sel}>{formatTanggal(t.jatuhTempo, 'pendek')}</td>
                  <td className={sel}>
                    <CapTagihan tagihan={t} hariIni={hariIni} />
                  </td>
                  <td className={sel}>
                    <span className="inline-flex flex-wrap gap-x-4 gap-y-1">
                      <Tautan href={hrefTagihan(t.id)} aria-label={`Tagihan ${t.nomor}`}>
                        Tagihan
                      </Tautan>
                      {t.status === 'lunas' && t.kwitansi && (
                        <Tautan href={hrefKwitansi(t.id)} aria-label={`Kwitansi ${t.kwitansi.nomor}`}>
                          Kwitansi
                        </Tautan>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

/**
 * Pengaturan › Langganan (SPEC-V0.2 §10): paket dan masa aktif, tagihan berjalan dengan nominal unik, unggah bukti transfer,
 * dan riwayat tagihan. Desa Persiapan dan Uji coba belum berlangganan.
 */
export function Langganan({ sekarang = new Date() }: { sekarang?: Date }) {
  const { desa } = useSesiAdmin()
  const belum = desa.status === 'Persiapan' || desa.status === 'Uji coba'
  const kueri = useQuery({ ...opsiLangganan(), enabled: !belum })
  const hariIni = tanggalIsoWib(sekarang)
  return (
    <div className="flex flex-col gap-6">
      <KepalaPengaturan aktif="langganan" />
      {belum ? (
        <EmptyState judul="Desa belum berlangganan." keterangan="Tagihan terbit setelah desa berstatus Aktif." />
      ) : kueri.isPending ? (
        <BarisKerangka jumlah={5} label="Memuat langganan…" />
      ) : kueri.isError ? (
        <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />
      ) : (
        <>
          <section aria-labelledby="judul-paket" className="flex flex-col gap-2">
            <h2 id="judul-paket" className={judulBagian}>
              Paket
            </h2>
            <p>
              {`Paket ${kueri.data.paket} · ${LABEL_PERIODE_TAGIHAN[kueri.data.periodeTagihan]}`}
              {kueri.data.masaAktif && ` · aktif sampai ${formatTanggal(kueri.data.masaAktif.sampai)}`}
            </p>
          </section>
          {kueri.data.berjalan ? (
            <TagihanBerjalan t={kueri.data.berjalan} hariIni={hariIni} />
          ) : (
            <p className="text-tinta-2">Tidak ada tagihan yang menunggu pembayaran.</p>
          )}
          <RiwayatTagihan daftar={kueri.data.riwayat} hariIni={hariIni} />
        </>
      )}
    </div>
  )
}

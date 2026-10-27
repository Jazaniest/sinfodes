import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { GalatApi, pesanGalat } from '@/api/galat'
import { batalkanTagihan, opsiTagihanKonsol, tolakBukti } from '@/api/konsol'
import { formatRupiah, formatUkuranKb } from '@/domain/format/angka'
import { formatTanggal, formatWaktuLog, tanggalIsoWib } from '@/domain/format/tanggal'
import { LABEL_PERIODE_TAGIHAN, LABEL_STATUS_TAGIHAN, type BarisTagihanKonsol } from '@/domain/langganan/tagihan'
import { CapTagihan } from '@/features/langganan/CapTagihan'
import { DescriptionList } from '@/ui/data/DescriptionList'
import { Timeline } from '@/ui/data/Timeline'
import { Tautan } from '@/ui/navigasi/Tautan'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { Tombol } from '@/ui/tombol/Tombol'
import { TautanTombol } from '@/ui/tombol/TautanTombol'
import { Banner } from '@/ui/umpan-balik/Banner'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { DialogAlasan } from './DialogAlasan'
import { DialogLunas } from './DialogLunas'

const judulBagian = 'text-label font-medium text-tinta-2 uppercase'
const redup = 'text-tinta-2'

type Dialog = 'lunas' | 'tolak' | 'batalkan' | null

function BuktiTransfer({ t }: { t: BarisTagihanKonsol }) {
  const b = t.bukti
  return (
    <section aria-labelledby="judul-bukti" className="flex max-w-2xl flex-col gap-3">
      <h2 id="judul-bukti" className={judulBagian}>
        Bukti transfer
      </h2>
      {t.penolakanTerakhir && t.status === 'terbit' && (
        <Banner nada="peringatan">{`Bukti sebelumnya ditolak: ${t.penolakanTerakhir.alasan} (${t.penolakanTerakhir.olehNama}, ${formatWaktuLog(t.penolakanTerakhir.pada)}).`}</Banner>
      )}
      {b ? (
        <>
          {b.dataUrl ? (
            <img src={b.dataUrl} alt={`Bukti transfer ${t.desa.nama}`} className="max-h-80 w-auto max-w-full self-start border border-garis" />
          ) : (
            <p className={redup}>{`Berkas ${b.jenisBerkas === 'pdf' ? 'PDF' : 'gambar'} ${b.berkas}. Pratinjau tidak tersedia di demo.`}</p>
          )}
          <DescriptionList
            items={[
              { label: 'Tanggal transfer', nilai: formatTanggal(b.tanggalTransfer) },
              { label: 'Nama pengirim', nilai: b.namaPengirim },
              { label: 'Nominal ditransfer', nilai: formatRupiah(b.nominalTransfer) },
              { label: 'Berkas', nilai: `${b.berkas} · ${formatUkuranKb(b.ukuranKb)}` },
              { label: 'Diunggah', nilai: `${formatWaktuLog(b.diunggahPada)} oleh ${b.oleh.nama}` },
            ]}
          />
          {!b.nominalCocok && (
            <Banner nada="peringatan">{`Nominal yang ditransfer berbeda dengan tagihan (${formatRupiah(t.nominal)}). Cocokkan dengan mutasi rekening.`}</Banner>
          )}
        </>
      ) : (
        <p className={redup}>Belum ada bukti yang diunggah.</p>
      )}
      {t.riwayatBukti.length > 0 && (
        <p className="text-teks-kecil text-tinta-2">{`${t.riwayatBukti.length} bukti sebelumnya sudah ditolak.`}</p>
      )}
    </section>
  )
}

function IsiDetail({ t, hariIni }: { t: BarisTagihanKonsol; hariIni: string }) {
  const [dialog, setDialog] = useState<Dialog>(null)
  const tutup = () => setDialog(null)
  const bisaBatal = t.status === 'terbit' || t.status === 'menunggu-verifikasi'
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        jejak={[{ label: 'Tagihan', href: '/konsol/tagihan' }]}
        judul={`Tagihan ${t.nomor}`}
        meta={`Desa ${t.desa.nama} · ${t.periode.label}`}
        aksi={
          <>
            {t.status === 'menunggu-verifikasi' && (
              <>
                <Tombol varian="utama" onPress={() => setDialog('lunas')}>
                  Tandai lunas
                </Tombol>
                <Tombol onPress={() => setDialog('tolak')}>Tolak bukti</Tombol>
              </>
            )}
            {t.status === 'lunas' && t.kwitansi && <TautanTombol href={`/konsol/tagihan/${encodeURIComponent(t.id)}/kwitansi`}>Cetak kwitansi</TautanTombol>}
            <TautanTombol href={`/konsol/tagihan/${encodeURIComponent(t.id)}/tagihan`}>Lihat tagihan</TautanTombol>
            {bisaBatal && (
              <Tombol varian="bahaya" onPress={() => setDialog('batalkan')}>
                Batalkan tagihan
              </Tombol>
            )}
          </>
        }
      />
      <DescriptionList
        items={[
          { label: 'Desa', nilai: <Tautan href={`/konsol/desa/${t.desa.id}?tab=langganan`}>{`${t.desa.nama} · ${t.desa.kecamatan}, ${t.desa.kabupaten}`}</Tautan> },
          { label: 'Status', nilai: <CapTagihan tagihan={t} hariIni={hariIni} /> },
          { label: 'Nominal', nilai: <span className="font-medium tabular-nums">{formatRupiah(t.nominal)}</span> },
          { label: 'Rincian', nilai: `Paket ${t.paket} ${LABEL_PERIODE_TAGIHAN[t.periode.jenis].toLowerCase()} ${formatRupiah(t.harga)} + kode unik ${t.kodeUnik}` },
          { label: 'Terbit', nilai: formatTanggal(t.terbit) },
          { label: 'Jatuh tempo', nilai: formatTanggal(t.jatuhTempo) },
          { label: 'Metode', nilai: 'Transfer manual' },
          ...(t.lunas
            ? [
                { label: 'Diterima', nilai: `${formatTanggal(t.lunas.diterimaPada)} · ${formatRupiah(t.lunas.nominalDiterima)}` },
                { label: 'Kwitansi', nilai: t.kwitansi ? <span className="font-mono">{t.kwitansi.nomor}</span> : null },
              ]
            : []),
          ...(t.dibatalkan ? [{ label: 'Dibatalkan', nilai: `${t.dibatalkan.alasan} (${t.dibatalkan.olehNama}, ${formatWaktuLog(t.dibatalkan.pada)})` }] : []),
        ]}
      />
      <BuktiTransfer t={t} />
      <section aria-labelledby="judul-riwayat" className="flex max-w-2xl flex-col gap-3">
        <h2 id="judul-riwayat" className={judulBagian}>
          Riwayat
        </h2>
        <Timeline
          label="Riwayat tagihan"
          entri={[...t.riwayat].reverse().map((r, i) => ({
            id: `${i}-${r.pada}`,
            waktu: formatWaktuLog(r.pada),
            judul: `${LABEL_STATUS_TAGIHAN[r.status]} · ${r.oleh.nama}`,
            keterangan: r.catatan ?? undefined,
          }))}
        />
      </section>
      {dialog === 'lunas' && <DialogLunas tagihan={t} hariIni={hariIni} onTutup={tutup} />}
      {dialog === 'tolak' && (
        <DialogAlasan
          judul="Tolak bukti"
          subjudul={`${t.nomor} · ${t.desa.nama}`}
          labelAksi="Tolak bukti"
          keterangan="Alasan dikirim sebagai notifikasi ke desa. Tagihan kembali ke Belum dibayar."
          pesanSukses="Bukti ditolak. Desa diberi tahu alasannya."
          kirim={(isian) => tolakBukti(t.id, isian)}
          onTutup={tutup}
        />
      )}
      {dialog === 'batalkan' && (
        <DialogAlasan
          judul="Batalkan tagihan"
          subjudul={`${t.nomor} · ${t.desa.nama}`}
          labelAksi="Batalkan tagihan"
          keterangan="Kode unik dilepas. Bila desa masih Aktif, tagihan pengganti untuk periode yang sama terbit otomatis."
          pesanSukses="Tagihan dibatalkan."
          kirim={(isian) => batalkanTagihan(t.id, isian)}
          onTutup={tutup}
        />
      )}
    </div>
  )
}

/** Detail satu tagihan di Konsol (SPEC-V0.2 §10.4): bukti beserta data yang diisi desa, aksi menurut status, dan riwayat. */
export function DetailTagihan({ id, sekarang = new Date() }: { id: string; sekarang?: Date }) {
  const kueri = useQuery(opsiTagihanKonsol(id))
  if (kueri.isPending) return <BarisKerangka jumlah={8} label="Memuat tagihan…" />
  if (kueri.isError) {
    if (kueri.error instanceof GalatApi && kueri.error.kode === 'NOT_FOUND') {
      return <EmptyState judulHalaman judul="Tagihan tidak ditemukan" keterangan="Alamatnya mungkin salah." aksi={<Tautan href="/konsol/tagihan">Kembali ke daftar tagihan</Tautan>} />
    }
    return <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />
  }
  return <IsiDetail t={kueri.data} hariIni={tanggalIsoWib(sekarang)} />
}

import { DownloadSimple } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { GalatApi, pesanGalat } from '@/api/galat'
import { opsiDetailRiwayat } from '@/api/warga'
import { asalDesa } from '@/app/alamat'
import { formatWaktuLog } from '@/domain/format/tanggal'
import { JUDUL_KEJADIAN } from '@/domain/surat/alur'
import { kalimat, namaJenisLengkap, type DetailPermohonanWarga } from '@/domain/warga/permohonan'
import type { SesiWarga } from '@/domain/warga/sesi'
import { CetakSurat } from '@/features/surat/CetakSurat'
import { lembarTerbit } from '@/features/surat/lembar'
import { Cap } from '@/ui/cap/Cap'
import { DescriptionList } from '@/ui/data/DescriptionList'
import { Timeline } from '@/ui/data/Timeline'
import { Tautan } from '@/ui/navigasi/Tautan'
import { TautanTombol } from '@/ui/tombol/TautanTombol'
import { Tombol } from '@/ui/tombol/Tombol'
import { Banner } from '@/ui/umpan-balik/Banner'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { useSesiWarga } from './sesi-konteks'

const judulBagian = 'text-label font-medium text-tinta-2 uppercase'

function IsiDetail({ d, sesi }: { d: DetailPermohonanWarga; sesi: SesiWarga }) {
  const [cetak, setCetak] = useState(false)
  const { permohonan: p, jenis, terbit } = d
  // Hanya surat TTE yang boleh diunduh; surat bertanda tangan basah diambil di kantor desa.
  const lembar = p.status === 'selesai' && terbit?.mode === 'tte' ? lembarTerbit(terbit, sesi.desa, asalDesa(sesi.desa.slug)) : null
  const rincian = [
    { label: 'Nomor tiket', nilai: <span className="font-mono">{p.tiket}</span> },
    { label: 'Untuk', nilai: p.untuk.nama },
    { label: 'Masuk', nilai: formatWaktuLog(p.masukPada) },
    ...(p.nomor ? [{ label: 'Nomor surat', nilai: p.nomor }] : []),
    ...jenis.isian.filter((i) => p.isian[i.kunci]).map((i) => ({ label: i.label, nilai: p.isian[i.kunci] })),
  ]
  const jam = sesi.desa.jamLayanan.map((j) => `${j.hari} ${j.buka}-${j.tutup}`).join('; ')
  return (
    <article className="flex flex-col gap-6">
      <Tautan href="/warga/riwayat" className="self-start">
        ← Semua riwayat
      </Tautan>
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-judul-halaman font-medium">{namaJenisLengkap(p.jenis)}</h1>
        <p className="flex flex-wrap items-center gap-2">
          <Cap varian={p.status} />
          <span className="text-tinta-2">{kalimat(p.posisi)}</span>
        </p>
      </header>

      {lembar && terbit && (
        <section className="flex flex-col gap-3">
          <Banner nada="berhasil" judul="Surat sudah ditandatangani secara elektronik">
            Nomor {terbit.nomor}. Di jendela cetak, pilih "Simpan sebagai PDF".
          </Banner>
          <Tombol varian="utama" ikon={<DownloadSimple aria-hidden size={18} />} onPress={() => setCetak(true)}>
            Unduh PDF
          </Tombol>
        </section>
      )}
      {p.status === 'selesai' && terbit?.mode === 'basah' && p.diambilPada === null && (
        <Banner nada="info" judul="Ambil di kantor desa, bawa KTP asli">
          Jam layanan: {jam}.
        </Banner>
      )}
      {p.status === 'ditolak' && (
        <section className="flex flex-col gap-3">
          <Banner nada="peringatan" judul="Permohonan ditolak">
            {p.alasanDitolak ?? 'Hubungi kantor desa untuk penjelasannya.'}
          </Banner>
          <TautanTombol href={`/warga/ajukan?ulang=${p.id}`} varian="utama">
            Ajukan ulang
          </TautanTombol>
        </section>
      )}

      <DescriptionList judul="Rincian" items={rincian} />

      <section aria-labelledby="judul-perjalanan" className="flex flex-col gap-3">
        <h2 id="judul-perjalanan" className={judulBagian}>
          Perjalanan permohonan
        </h2>
        <Timeline
          label="Riwayat permohonan"
          entri={[...p.riwayat].reverse().map((r) => ({
            id: r.id,
            waktu: formatWaktuLog(r.waktu),
            judul: JUDUL_KEJADIAN[r.kejadian],
            keterangan: [r.oleh.nama, r.catatan].filter(Boolean).join(' · '),
          }))}
        />
      </section>
      {cetak && lembar && <CetakSurat lembar={lembar} onSelesai={() => setCetak(false)} />}
    </article>
  )
}

/** Detail permohonan warga (SPEC §10): posisi, rincian, perjalanan, dan Unduh PDF bila surat TTE sudah selesai. */
export function DetailRiwayat({ id }: { id: string }) {
  const sesi = useSesiWarga()
  const kueri = useQuery(opsiDetailRiwayat(id))
  if (kueri.isPending) return <BarisKerangka jumlah={6} label="Memuat permohonan…" />
  if (kueri.isError) {
    if (kueri.error instanceof GalatApi && kueri.error.kode === 'NOT_FOUND') {
      return (
        <EmptyState
          judul="Permohonan tidak ditemukan"
          keterangan="Alamatnya mungkin salah, atau permohonan ini bukan milik Anda."
          aksi={<Tautan href="/warga/riwayat">Kembali ke Riwayat</Tautan>}
        />
      )
    }
    return <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />
  }
  return <IsiDetail d={kueri.data} sesi={sesi} />
}

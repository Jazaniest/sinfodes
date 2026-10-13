import { Printer } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { pesanGalat } from '@/api/galat'
import { opsiTransparansiPublik } from '@/api/publik-halaman'
import { formatTanggal } from '@/domain/format/tanggal'
import { jumlahKelompok, pembiayaanNetto, type Jumlah } from '@/domain/keuangan/schema'
import { LABEL_STATUS_KEGIATAN, LABEL_SUMBER_DANA } from '@/domain/pembangunan/schema'
import { bagianApbdes, type ApbdesPublik, type BagianApbdes, type KegiatanPublik } from '@/domain/publik/transparansi'
import { Cap } from '@/ui/cap/Cap'
import { cn } from '@/ui/cn'
import { Rupiah } from '@/ui/domain/Rupiah'
import { MiniBar } from '@/ui/grafik/MiniBar'
import { Tombol } from '@/ui/tombol/Tombol'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { FotoWarta } from '@/ui/website/FotoWarta'
import { Rubrik } from '@/ui/website/Rubrik'
import { usePublik } from '../publik-konteks'
import { LembarApbdes } from './LembarApbdes'

function RealisasiDari({ j }: { j: Jumlah }) {
  return (
    <>
      <Rupiah nilai={j.realisasi} ringkas /> dari <Rupiah nilai={j.anggaran} ringkas />
    </>
  )
}

/** Satu bagian APBDes di layar: nama pos di atas batang realisasinya (nama panjang tidak terpotong di HP). */
function BagianLayar({ b }: { b: BagianApbdes }) {
  return (
    <section aria-labelledby={`bagian-${b.kunci}`} className="flex flex-col gap-3">
      <h3 id={`bagian-${b.kunci}`} className="font-serif text-judul-bagian font-medium">
        {b.judul}
      </h3>
      <ul className="flex flex-col gap-4">
        {b.baris.map((r) => (
          <li key={r.kode} className="flex flex-col gap-1">
            <span>{r.nama}</span>
            <MiniBar label={r.nama} labelTersembunyi nilai={r.realisasi} maks={r.anggaran} keterangan={<RealisasiDari j={r} />} />
          </li>
        ))}
      </ul>
      <p className="flex items-baseline justify-between gap-3 border-t border-garis pt-2 font-medium">
        <span>{b.jumlah.label}</span>
        <Rupiah nilai={b.jumlah.nilai.anggaran} />
      </p>
    </section>
  )
}

function Apbdes({ a, onCetak }: { a: ApbdesPublik; onCetak: () => void }) {
  const pendapatan = jumlahKelompok(a, 'pendapatan')
  const belanja = jumlahKelompok(a, 'belanja')
  return (
    <Rubrik id="apbdes" judul={`APBDes ${a.tahun}`}>
      <p className="text-teks-kecil text-tinta-2">Disinkronkan dari Siskeudes · {formatTanggal(a.sinkronPada, 'pendek')}</p>
      <div className="grid gap-6 sm:grid-cols-3">
        <MiniBar label="Pendapatan" nilai={pendapatan.realisasi} maks={pendapatan.anggaran} keterangan={<RealisasiDari j={pendapatan} />} />
        <MiniBar label="Belanja" nilai={belanja.realisasi} maks={belanja.anggaran} keterangan={<RealisasiDari j={belanja} />} />
        <div className="flex flex-col gap-1 text-teks-kecil">
          <span>Pembiayaan netto</span>
          <Rupiah nilai={pembiayaanNetto(a).anggaran} className="font-mono text-dasar" />
          <span className="text-tinta-2">Menutup selisih belanja dan pendapatan</span>
        </div>
      </div>
      <div className="flex flex-col items-start gap-1">
        <Tombol ikon={<Printer aria-hidden size={18} />} onPress={onCetak}>
          Unduh dokumen APBDes
        </Tombol>
        <p className="text-teks-kecil text-tinta-2">Membuka dialog cetak; pilih “Simpan sebagai PDF” untuk mengunduh.</p>
      </div>
      <div className="grid gap-10 lg:grid-cols-2">
        {bagianApbdes(a).map((b) => (
          <BagianLayar key={b.kunci} b={b} />
        ))}
      </div>
    </Rubrik>
  )
}

function KartuKegiatan({ k }: { k: KegiatanPublik }) {
  const judul = k.volume ? `${k.nama} (${k.volume})` : k.nama
  const mulai = k.mulai ? `Mulai ${formatTanggal(k.mulai, 'pendek')}` : 'Belum dimulai'
  const berfoto = k.dokumentasi.flatMap((d) => (d.foto ? [{ ...d, foto: d.foto }] : []))
  return (
    <article id={k.id} aria-labelledby={`judul-${k.id}`} className="flex scroll-mt-4 flex-col gap-3 border-b border-garis pb-8 last:border-b-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Cap varian={k.status} label={LABEL_STATUS_KEGIATAN[k.status]} />
        <span className="text-teks-kecil text-tinta-2">{LABEL_SUMBER_DANA[k.sumberDana]}</span>
      </div>
      <h3 id={`judul-${k.id}`} className="font-serif text-judul-bagian font-medium">
        {judul}
      </h3>
      <p className="text-teks-kecil text-tinta-2">
        {k.lokasi} · {mulai} · target selesai {formatTanggal(k.targetSelesai, 'pendek')}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <MiniBar label="Progres fisik" nilai={k.progresFisik} maks={100} />
        <MiniBar label="Penyerapan anggaran" nilai={k.realisasi} maks={k.anggaran} keterangan={<RealisasiDari j={k} />} />
      </div>
      {berfoto.length > 0 && (
        <ul aria-label={`Foto progres ${k.nama}`} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {berfoto.map((d) => (
            <li key={d.persen}>
              <FotoWarta
                berkas={d.foto.berkas}
                alt={d.foto.keterangan}
                keterangan={`${d.persen}% · ${formatTanggal(d.tanggal, 'pendek')} · ${d.keterangan}`}
                kredit={d.foto.kredit}
                rasio="foto"
                sizes="(min-width: 40rem) 18rem, 50vw"
              />
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

/**
 * Transparansi (SPEC §9): APBDes (pendapatan per sumber, belanja per bidang, pembiayaan, realisasi), kegiatan
 * pembangunan dengan progres dan foto, dan *Unduh dokumen APBDes* berupa lembar cetak.
 */
export function TransparansiPublik() {
  const identitas = usePublik()
  const kueri = useQuery(opsiTransparansiPublik(identitas.slug))
  const [cetak, setCetak] = useState(false)
  const selesaiCetak = useCallback(() => setCetak(false), [])
  const apbdes = kueri.data?.apbdes ?? null
  return (
    <>
      <div className={cn('flex flex-col gap-10', cetak && 'print:hidden')}>
        <div className="flex flex-col gap-2">
          <h1 className="font-serif text-judul-halaman font-medium">Transparansi</h1>
          <p className="max-w-[56ch] text-tinta-2">
            Anggaran pendapatan dan belanja desa (APBDes) beserta kegiatan pembangunan yang dibiayainya, diperbarui dari Siskeudes.
          </p>
        </div>
        {kueri.isPending && <BarisKerangka jumlah={8} label="Memuat transparansi…" />}
        {kueri.isError && <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />}
        {kueri.isSuccess && (
          <>
            {kueri.data.apbdes ? (
              <Apbdes a={kueri.data.apbdes} onCetak={() => setCetak(true)} />
            ) : (
              <EmptyState judul="APBDes belum diumumkan" keterangan="Desa belum mengumumkan APBDes di website. Rinciannya bisa ditanyakan di kantor desa." />
            )}
            <Rubrik id="pembangunan" judul="Kegiatan pembangunan">
              {kueri.data.kegiatan.length === 0 ? (
                <p className="text-tinta-2">Belum ada kegiatan pembangunan yang diumumkan.</p>
              ) : (
                <div className="flex flex-col gap-8">
                  {kueri.data.kegiatan.map((k) => (
                    <KartuKegiatan key={k.id} k={k} />
                  ))}
                </div>
              )}
            </Rubrik>
          </>
        )}
      </div>
      {cetak && apbdes && <LembarApbdes apbdes={apbdes} identitas={identitas} onSelesai={selesaiCetak} />}
    </>
  )
}

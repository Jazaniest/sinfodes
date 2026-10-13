import { useQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { GalatApi, pesanGalat } from '@/api/galat'
import { opsiVerifikasi } from '@/api/publik'
import { formatTanggal } from '@/domain/format/tanggal'
import type { HasilVerifikasi } from '@/domain/publik/schema'
import { kodeSah, rapikanKode, teksBerlaku } from '@/domain/publik/verifikasi'
import { Cap } from '@/ui/cap/Cap'
import { DescriptionList } from '@/ui/data/DescriptionList'
import { TextField } from '@/ui/isian/TextField'
import { Tombol } from '@/ui/tombol/Tombol'
import { Banner } from '@/ui/umpan-balik/Banner'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { usePublik } from '../publik-konteks'

const PESAN_FORMAT = 'Kode verifikasi berbentuk seperti SS-7K3M-Q9TD.'

function HasilGalat({ galat, onCobaLagi }: { galat: Error; onCobaLagi: () => void }) {
  if (galat instanceof GalatApi && galat.kode === 'NOT_FOUND') {
    return (
      <Banner nada="galat" judul="Kode tidak ditemukan">
        Periksa kembali, atau hubungi kantor desa.
      </Banner>
    )
  }
  if (galat instanceof GalatApi && galat.kode === 'RATE_LIMITED') {
    return (
      <Banner nada="peringatan" judul="Terlalu banyak percobaan">
        {galat.message}
      </Banner>
    )
  }
  return <ErrorState pesan={pesanGalat(galat)} onCobaLagi={onCobaLagi} />
}

function HasilAsli({ h, desa }: { h: HasilVerifikasi; desa: string }) {
  const berlaku = h.berlaku.status === 'berlaku'
  return (
    <section aria-labelledby="hasil-verifikasi" className="flex flex-col gap-4 rounded-2 border border-garis bg-lembar p-4">
      <div className="flex flex-wrap items-center gap-3">
        <Cap varian="asli" />
        <h2 id="hasil-verifikasi" className="font-serif text-judul-bagian font-medium">
          Surat ini asli, diterbitkan Desa {desa}
        </h2>
      </div>
      {!berlaku && (
        <Banner nada="galat" judul="Surat ini sudah tidak berlaku">
          Mintalah surat baru ke kantor desa bila masih diperlukan.
        </Banner>
      )}
      <DescriptionList
        items={[
          { label: 'Jenis surat', nilai: h.jenis },
          { label: 'Nomor', nilai: <span className="font-mono">{h.nomor}</span> },
          { label: 'Tanggal terbit', nilai: formatTanggal(h.terbit) },
          { label: 'Atas nama', nilai: <span className="font-mono">{h.nama}</span> },
          { label: 'Ditandatangani', nilai: `${h.penandatangan.jabatan}, ${h.penandatangan.nama}` },
          {
            label: 'Status',
            nilai: <span className={berlaku ? 'font-medium text-hijau' : 'font-medium text-merah'}>{teksBerlaku(h.berlaku)}</span>,
          },
        ]}
      />
      <p className="text-teks-kecil text-tinta-2">
        Nama ditampilkan sebagian untuk melindungi data pribadi. Cocokkan nomor dan tanggalnya dengan surat yang Anda pegang.
      </p>
    </section>
  )
}

type Props = {
  /** Kode dari alamat halaman (QR atau pemeriksaan sebelumnya); null bila belum ada. */
  kode: string | null
  /** Simpan kode yang sudah dirapikan ke alamat halaman (`?kode=`), yang lalu memicu pemeriksaan. */
  onPeriksa: (kode: string) => void
}

/**
 * Cek keaslian surat (SPEC §7.6): dari QR (`?kode=`) atau dengan mengetik kode. Kode dirapikan dulu (fokus review 1),
 * dan hasil per kode disimpan di cache supaya membuka ulang kode yang sama tidak menambah percobaan.
 */
export function VerifikasiSurat({ kode, onPeriksa }: Props) {
  const identitas = usePublik()
  const kodeRapi = kode ? rapikanKode(kode) : null
  const sah = kodeRapi !== null && kodeSah(kodeRapi)
  const [isian, setIsian] = useState(kodeRapi ?? '')
  const [galat, setGalat] = useState<string | null>(null)
  const hasil = useQuery({ ...opsiVerifikasi(identitas.slug, kodeRapi ?? ''), enabled: sah })

  const periksa = (e: FormEvent) => {
    e.preventDefault()
    const k = rapikanKode(isian)
    if (!kodeSah(k)) {
      setGalat(PESAN_FORMAT)
      return
    }
    setGalat(null)
    setIsian(k)
    // Kode yang sama tidak mengubah alamat halaman: periksa ulang sesudah terkunci atau gagal jaringan,
    // tetapi kode yang tidak ditemukan tidak dikirim lagi supaya tidak menambah percobaan.
    const tidakDitemukan = hasil.error instanceof GalatApi && hasil.error.kode === 'NOT_FOUND'
    if (k === kodeRapi && hasil.isError && !tidakDitemukan) void hasil.refetch()
    onPeriksa(k)
  }
  // Kode dari tautan yang formatnya salah ditandai sama, tanpa bertanya ke server.
  const galatTampil = galat ?? (kodeRapi !== null && !sah ? PESAN_FORMAT : undefined)

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-serif text-judul-halaman font-medium">Cek keaslian surat</h1>
        <p className="text-tinta-2">Pindai kode QR di surat dengan kamera HP, atau ketik kode verifikasi yang tercetak di sebelahnya.</p>
      </div>
      <form onSubmit={periksa} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <TextField
          label="Kode verifikasi"
          value={isian}
          onChange={setIsian}
          galat={galatTampil}
          placeholder="SS-7K3M-Q9TD"
          autoComplete="off"
          className="flex-1"
          inputClassName="font-mono uppercase"
        />
        <Tombol type="submit" varian="utama" memuat={hasil.isFetching} className="sm:mt-6">
          Periksa
        </Tombol>
      </form>
      {/* Hasil kode sebelumnya disembunyikan selama isian bergalat, supaya cap ASLI tidak dikira berlaku untuk kode baru. */}
      {!galatTampil && hasil.isFetching && !hasil.data && <BarisKerangka jumlah={3} label="Memeriksa kode…" />}
      {!galatTampil && hasil.isError && <HasilGalat galat={hasil.error} onCobaLagi={() => void hasil.refetch()} />}
      {!galatTampil && hasil.isSuccess && <HasilAsli h={hasil.data} desa={identitas.nama} />}
    </div>
  )
}

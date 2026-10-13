import { Baby, ChatCircleText, FilePlus, SealCheck } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-aria-components'
import { pesanGalat } from '@/api/galat'
import { opsiBerandaPublik } from '@/api/publik'
import { BULAN_PENDEK, formatTanggal } from '@/domain/format/tanggal'
import { kalimatAngkaDesa } from '@/domain/publik/angka'
import type { BerandaPublik as DataBeranda, RingkasArtikel, RingkasPotensi } from '@/domain/publik/schema'
import { teksJamAgenda } from '@/domain/website/schema'
import { Rupiah } from '@/ui/domain/Rupiah'
import { MiniBar } from '@/ui/grafik/MiniBar'
import { Tautan } from '@/ui/navigasi/Tautan'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { FotoWarta } from '@/ui/website/FotoWarta'
import { Rubrik } from '@/ui/website/Rubrik'
import { KartuKabar } from '../kabar/KartuKabar'
import { usePublik } from '../publik-konteks'

const IKON = { size: 28, 'aria-hidden': true } as const

function BeritaUtama({ a, dasar }: { a: RingkasArtikel; dasar: string }) {
  return (
    <article aria-labelledby="berita-utama" className="flex flex-col gap-3">
      {a.foto && (
        <FotoWarta
          berkas={a.foto.berkas}
          alt={a.foto.keterangan}
          keterangan={a.foto.keterangan}
          kredit={a.foto.kredit}
          sizes="(min-width: 64rem) 60rem, 100vw"
          utama
        />
      )}
      <p className="text-label font-semibold tracking-wide text-biru uppercase">
        {a.kategori} · {formatTanggal(a.tanggal)}
      </p>
      <h2 id="berita-utama" className="font-serif text-judul-halaman font-medium sm:text-judul-warta">
        <Tautan href={`${dasar}/kabar/${a.slug}`} nada="tinta">
          {a.judul}
        </Tautan>
      </h2>
      <p className="max-w-[56ch] text-baca text-tinta-2">{a.ringkasan}</p>
    </article>
  )
}

function LayananCepat({ dasar }: { dasar: string }) {
  const daftar = [
    { judul: 'Ajukan surat online', keterangan: 'Dari HP, tanpa antre', href: '/warga/ajukan', ikon: <FilePlus {...IKON} /> },
    { judul: 'Cek keaslian surat', keterangan: 'Pindai QR atau ketik kodenya', href: `${dasar}/verifikasi`, ikon: <SealCheck {...IKON} /> },
    { judul: 'Sampaikan pengaduan', keterangan: 'Dibaca dan dibalas petugas desa', href: '/warga/pengaduan/baru', ikon: <ChatCircleText {...IKON} /> },
    { judul: 'Jadwal posyandu', keterangan: 'Di setiap dusun', href: `${dasar}/layanan#posyandu`, ikon: <Baby {...IKON} /> },
  ]
  return (
    <Rubrik id="layanan-cepat" judul="Layanan cepat">
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {daftar.map((l) => (
          <li key={l.judul}>
            <Link
              href={l.href}
              className="flex h-full min-h-28 flex-col gap-1.5 rounded-2 border border-garis bg-lembar p-3 outline-none hover:border-biru data-[focus-visible]:outline-2 data-[focus-visible]:outline-solid data-[focus-visible]:outline-offset-2 data-[focus-visible]:outline-biru"
            >
              <span className="text-biru">{l.ikon}</span>
              <span className="font-medium">{l.judul}</span>
              <span className="text-teks-kecil text-tinta-2">{l.keterangan}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Rubrik>
  )
}

function Pengumuman({ b }: { b: DataBeranda }) {
  return (
    <Rubrik id="pengumuman" judul="Pengumuman">
      {b.pengumuman.length === 0 ? (
        <p className="text-tinta-2">Tidak ada pengumuman yang sedang berlaku.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {b.pengumuman.map((p) => (
            <li key={p.id} className="border-l-2 border-biru pl-3">
              <p className="font-medium">{p.judul}</p>
              <p className="text-teks-kecil text-tinta-2">{p.isi}</p>
              <p className="mt-1 text-teks-kecil text-tinta-2">Berlaku sampai {formatTanggal(p.sampai, 'pendek')}</p>
            </li>
          ))}
        </ul>
      )}
    </Rubrik>
  )
}

function Agenda({ b }: { b: DataBeranda }) {
  return (
    <Rubrik id="agenda" judul="Agenda">
      {b.agenda.length === 0 ? (
        <p className="text-tinta-2">Belum ada agenda dalam waktu dekat.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {b.agenda.map((a) => (
            <li key={a.id} className="flex gap-3">
              <time dateTime={a.tanggal} className="flex w-12 shrink-0 flex-col items-center rounded-1 border border-garis bg-lembar py-1">
                <span className="font-serif text-judul-bagian font-medium">{Number(a.tanggal.slice(8))}</span>
                <span className="text-label text-tinta-2 uppercase">{BULAN_PENDEK[Number(a.tanggal.slice(5, 7)) - 1]}</span>
              </time>
              <div className="min-w-0">
                <p className="font-medium">{a.judul}</p>
                <p className="text-teks-kecil text-tinta-2">
                  {formatTanggal(a.tanggal, 'hari')} · {teksJamAgenda(a)} · {a.tempat}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Rubrik>
  )
}

function CuplikanApbdes({ a, dasar }: { a: NonNullable<DataBeranda['apbdes']>; dasar: string }) {
  const keterangan = (j: { anggaran: number; realisasi: number }) => (
    <>
      <Rupiah nilai={j.realisasi} ringkas /> dari <Rupiah nilai={j.anggaran} ringkas />
    </>
  )
  return (
    <Rubrik
      id="apbdes-desa"
      judul={`APBDes ${a.tahun}`}
      aksi={
        <Tautan href={`${dasar}/transparansi`} className="text-teks-kecil">
          Rincian APBDes
        </Tautan>
      }
    >
      <p className="text-teks-kecil text-tinta-2">Realisasi terhadap anggaran tahun ini</p>
      <div className="flex flex-col gap-5">
        <MiniBar label="Pendapatan" nilai={a.pendapatan.realisasi} maks={a.pendapatan.anggaran} keterangan={keterangan(a.pendapatan)} />
        <MiniBar label="Belanja" nilai={a.belanja.realisasi} maks={a.belanja.anggaran} keterangan={keterangan(a.belanja)} />
      </div>
    </Rubrik>
  )
}

function PotensiDesa({ potensi, dasar }: { potensi: readonly RingkasPotensi[]; dasar: string }) {
  return (
    <Rubrik
      id="potensi-desa"
      judul="Potensi desa"
      aksi={
        <Tautan href={`${dasar}/potensi`} className="text-teks-kecil">
          Potensi dan UMKM
        </Tautan>
      }
    >
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {potensi.map((p) => (
          <li key={p.id}>
            <Link
              href={`${dasar}/potensi#${p.id}`}
              className="group flex flex-col gap-1.5 rounded-1 outline-none data-[focus-visible]:outline-2 data-[focus-visible]:outline-solid data-[focus-visible]:outline-offset-2 data-[focus-visible]:outline-biru"
            >
              {p.foto && (
                <FotoWarta
                  berkas={p.foto.berkas}
                  alt=""
                  rasio="foto"
                  sizes="(min-width: 64rem) 13rem, (min-width: 40rem) 30vw, 50vw"
                  className="w-full rounded-1"
                />
              )}
              <span className="text-label font-semibold tracking-wide text-tinta-2 uppercase">{p.kategori}</span>
              <span className="font-medium group-data-[hovered]:text-biru group-data-[hovered]:underline">{p.judul}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Rubrik>
  )
}

/**
 * Beranda website desa (SPEC §9): berita utama berfoto besar (bukan banner sambutan), empat layanan cepat, kabar
 * terbaru, pengumuman dan agenda, desa dalam angka, cuplikan APBDes, dan potensi desa.
 */
export function BerandaPublik() {
  const identitas = usePublik()
  const kueri = useQuery(opsiBerandaPublik(identitas.slug))
  const dasar = `/desa/${identitas.slug}`
  return (
    <div className="flex flex-col gap-10">
      <h1 className="sr-only">Beranda Desa {identitas.nama}</h1>
      {kueri.isPending && <BarisKerangka jumlah={6} label="Memuat beranda desa…" />}
      {kueri.isError && <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />}
      {kueri.isSuccess && (
        <>
          {kueri.data.utama && <BeritaUtama a={kueri.data.utama} dasar={dasar} />}
          <LayananCepat dasar={dasar} />
          <div className="grid gap-10 lg:grid-cols-[2fr_1fr]">
            <Rubrik
              id="kabar-terbaru"
              judul="Kabar terbaru"
              aksi={
                <Tautan href={`${dasar}/kabar`} className="text-teks-kecil">
                  Semua kabar
                </Tautan>
              }
            >
              <div className="flex flex-col gap-5">
                {kueri.data.terbaru.map((a) => (
                  <KartuKabar key={a.slug} a={a} dasar={dasar} />
                ))}
              </div>
            </Rubrik>
            <div className="flex flex-col gap-10">
              <Pengumuman b={kueri.data} />
              <Agenda b={kueri.data} />
            </div>
          </div>
          <Rubrik id="desa-dalam-angka" judul="Desa dalam angka">
            <div className="grid items-start gap-4 sm:grid-cols-2">
              {kueri.data.sampul && (
                <FotoWarta
                  berkas={kueri.data.sampul.berkas}
                  alt={kueri.data.sampul.keterangan}
                  keterangan={kueri.data.sampul.keterangan}
                  kredit={kueri.data.sampul.kredit}
                  sizes="(min-width: 40rem) 30rem, 100vw"
                />
              )}
              <p className="font-serif text-judul-bagian">{kalimatAngkaDesa(identitas.nama, kueri.data.angka)}</p>
            </div>
          </Rubrik>
          {(kueri.data.apbdes || kueri.data.potensi.length > 0) && (
            <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
              {kueri.data.apbdes && <CuplikanApbdes a={kueri.data.apbdes} dasar={dasar} />}
              {kueri.data.potensi.length > 0 && <PotensiDesa potensi={kueri.data.potensi} dasar={dasar} />}
            </div>
          )}
        </>
      )}
    </div>
  )
}

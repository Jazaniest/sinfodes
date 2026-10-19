import { useQuery } from '@tanstack/react-query'
import { Fragment } from 'react'
import { opsiRingkasanInduk } from '@/api/induk'
import { keAlamat } from '@/app/alamat'
import { KONTAK_SINFODES, tautanDaftarDesa } from '@/app/kontak-sinfodes'
import logoMark from '@/assets/brand/sinfodes-mark.svg'
import gambarKabupaten from '@/assets/landing/dasbor-kabupaten.webp'
import gambarPanel from '@/assets/landing/panel-desa.webp'
import gambarWarga from '@/assets/landing/layanan-warga.webp'
import gambarWebsite from '@/assets/landing/website-desa.webp'
import { formatAngka, formatRupiah } from '@/domain/format/angka'
import { PAKET } from '@/domain/konsol/filter'
import { RINCIAN_PAKET, type RincianPaket } from '@/domain/konsol/paket'
import { CobaDemo } from '@/features/demo/CobaDemo'
import { Tautan } from '@/ui/navigasi/Tautan'
import { TautanTombol } from '@/ui/tombol/TautanTombol'
import { kelasTombol } from '@/ui/tombol/gaya-tombol'
import { Skeleton } from '@/ui/umpan-balik/Skeleton'
import { CariDesa } from './CariDesa'

const MODE_DEMO = import.meta.env.VITE_DEMO === 'true'

const lebar = 'mx-auto w-full max-w-5xl px-4 sm:px-6'
const judulBagian = 'font-serif text-judul-halaman font-medium'
const fokus = 'outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-biru'

const BAGIAN_HALAMAN = [
  { href: '#bagian-aplikasi', label: 'Bagian aplikasi' },
  { href: '#harga', label: 'Harga' },
  { href: '#cari-desa', label: 'Cari desa' },
  ...(MODE_DEMO ? [{ href: '#coba-demo', label: 'Coba demo' }] : []),
]

const BARIS_PAKET: readonly { label: string; kunci: keyof Omit<RincianPaket, 'hargaTahunan' | 'hargaTriwulan'> }[] = [
  { label: 'Modul', kunci: 'modul' },
  { label: 'Akun perangkat desa', kunci: 'akun' },
  { label: 'Penyimpanan berkas', kunci: 'penyimpanan' },
  { label: 'Bantuan', kunci: 'bantuan' },
  { label: 'Pelatihan operator', kunci: 'pelatihan' },
  { label: 'Impor data awal', kunci: 'impor' },
]

/** `sempit`: tangkapan layar HP, dibatasi lebarnya supaya tidak memanjang di layar kecil. */
type Lampiran = { nomor: number; judul: string; isi: string; gambar: string; alt: string; lebar: number; tinggi: number; sempit?: boolean }

const LAMPIRAN: readonly Lampiran[] = [
  {
    nomor: 1,
    judul: 'Panel perangkat desa',
    isi: 'Layanan surat dari permohonan sampai tanda tangan elektronik, data penduduk dan mutasi, keuangan, dan buku administrasi.',
    gambar: gambarPanel,
    alt: 'Beranda panel Desa Sungai Sialang: daftar yang perlu ditindaklanjuti dan buku hari ini.',
    lebar: 1280,
    tinggi: 860,
  },
  {
    nomor: 2,
    judul: 'Layanan warga dari HP',
    isi: 'Warga mengajukan surat, memantau prosesnya, dan menyampaikan pengaduan tanpa datang ke kantor desa.',
    gambar: gambarWarga,
    alt: 'Layanan warga di HP: surat yang sedang diproses, tombol Ajukan surat, dan pengumuman desa.',
    lebar: 780,
    tinggi: 1688,
    sempit: true,
  },
  {
    nomor: 3,
    judul: 'Website desa',
    isi: 'Kabar, profil, transparansi APBDes, dan cek keaslian surat lewat QR, di alamat desa sendiri.',
    gambar: gambarWebsite,
    alt: 'Beranda website Desa Sungai Sialang dengan berita utama penyaluran bantuan.',
    lebar: 1280,
    tinggi: 860,
  },
  {
    nomor: 4,
    judul: 'Dasbor kabupaten',
    isi: 'Kabupaten memantau desa yang sudah digital, realisasi Dana Desa, dan tenggat laporan, lalu mengirim siaran ke panel desa.',
    gambar: gambarKabupaten,
    alt: 'Ringkasan dasbor Kabupaten Pelalawan: desa yang perlu perhatian dan adopsi Sinfodes.',
    lebar: 1280,
    tinggi: 860,
  },
]

function KartuLampiran({ l, className }: { l: Lampiran; className?: string }) {
  return (
    <article aria-labelledby={`lampiran-${l.nomor}`} className={`flex flex-col gap-4 border border-garis bg-lembar p-4 sm:p-5 ${className ?? ''}`}>
      <div>
        <p className="font-mono text-label text-tinta-2 uppercase">Lampiran {l.nomor}</p>
        <h3 id={`lampiran-${l.nomor}`} className="mt-1 font-serif text-judul-bagian font-medium">
          {l.judul}
        </h3>
        <p className="mt-1 max-w-prose text-tinta-2">{l.isi}</p>
      </div>
      <img
        src={l.gambar}
        alt={l.alt}
        width={l.lebar}
        height={l.tinggi}
        loading="lazy"
        className={`h-auto w-full border border-garis bg-kertas ${l.sempit ? 'mx-auto max-w-72' : ''}`}
      />
    </article>
  )
}

function Bukti() {
  const ringkasan = useQuery(opsiRingkasanInduk())
  return (
    <section aria-label="Desa yang memakai Sinfodes" className="border-y border-garis bg-lembar">
      <div className={`${lebar} flex flex-wrap items-baseline gap-x-4 gap-y-2 py-8`}>
        {ringkasan.data ? (
          <p className="font-serif text-judul-bagian font-medium">
            {formatAngka(ringkasan.data.desaBergabung)} desa sudah memakai Sinfodes.
          </p>
        ) : ringkasan.isError ? null : (
          <Skeleton className="h-6 w-72 max-w-full" />
        )}
        {MODE_DEMO && (
          <span className="border border-garis-input px-1.5 py-0.5 font-mono text-label text-tinta-2 uppercase">Data contoh</span>
        )}
        {ringkasan.data && ringkasan.data.kabupatenMitra.length > 0 && (
          // Tiap kabupaten mitra punya portal desa digital di alamatnya sendiri (SPEC-V0.2 §8.2).
          <p className="basis-full text-tinta-2">
            Kabupaten mitra:{' '}
            {ringkasan.data.kabupatenMitra.map((k, i) => (
              <Fragment key={k.label}>
                {i > 0 && ' · '}
                <Tautan href={keAlamat({ jenis: 'kabupaten', label: k.label })}>{k.nama}</Tautan>
              </Fragment>
            ))}
          </p>
        )}
      </div>
    </section>
  )
}

function TabelPaket() {
  return (
    <section id="harga" aria-labelledby="judul-harga" className="scroll-mt-4">
      <h2 id="judul-harga" className={judulBagian}>
        Paket dan harga
      </h2>
      <p className="mt-2 max-w-2xl text-tinta-2">Kedua paket memuat semua modul. Yang berbeda hanya kapasitas dan dukungan.</p>
      <div className="mt-6 overflow-x-auto">
        <table aria-labelledby="judul-harga" className="w-full min-w-[30rem] border-t-[1.5px] border-tinta">
          <thead>
            <tr className="border-b border-garis">
              <td className="w-2/5 py-3" />
              {PAKET.map((p) => (
                <th key={p} scope="col" className="px-3 py-3 text-left font-serif text-judul-bagian font-medium">
                  {p}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {BARIS_PAKET.map((b) => (
              <tr key={b.kunci} className="border-b border-garis">
                <th scope="row" className="py-2.5 pr-3 text-left font-normal text-tinta-2">
                  {b.label}
                </th>
                {PAKET.map((p) => (
                  <td key={p} className="px-3 py-2.5">
                    {RINCIAN_PAKET[p][b.kunci]}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-b-[1.5px] border-tinta">
              <th scope="row" className="py-3 pr-3 text-left font-medium">
                Harga per tahun
              </th>
              {PAKET.map((p) => (
                <td key={p} className="px-3 py-3 font-medium tabular-nums">
                  {formatRupiah(RINCIAN_PAKET[p].hargaTahunan)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-teks-kecil text-tinta-2">
        Bisa dibayar per triwulan: {formatRupiah(RINCIAN_PAKET.Dasar.hargaTriwulan)} (Dasar) atau{' '}
        {formatRupiah(RINCIAN_PAKET.Lengkap.hargaTriwulan)} (Lengkap).
      </p>
    </section>
  )
}

/** `/` di alamat induk (SPEC-V0.2 §4.4): halaman utama Sinfodes untuk desa calon pelanggan dan warga yang mencari desanya. */
export function HalamanLanding() {
  const [panel, warga, website, kabupaten] = LAMPIRAN as [Lampiran, Lampiran, Lampiran, Lampiran]
  return (
    <div className="flex min-h-dvh flex-col bg-kertas text-tinta">
      <header className="border-b border-garis">
        <div className={`${lebar} flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-4`}>
          <p className="flex items-center gap-2.5">
            <img src={logoMark} alt="" className="h-8 w-auto" />
            <span className="font-serif text-judul-bagian font-medium">Sinfodes</span>
          </p>
          <nav aria-label="Bagian halaman">
            <ul className="flex flex-wrap gap-x-5 gap-y-1 text-teks-kecil">
              {BAGIAN_HALAMAN.map((b) => (
                <li key={b.href}>
                  <a href={b.href} className={`text-tinta-2 underline-offset-4 hover:text-tinta hover:underline ${fokus}`}>
                    {b.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section aria-labelledby="judul-utama" className={`${lebar} pt-14 pb-14 sm:pt-20`}>
          <p className="text-label font-medium text-tinta-2 uppercase">Sinfodes · Sistem Informasi Desa</p>
          <h1 id="judul-utama" className="mt-3 max-w-3xl font-serif text-[2.25rem] leading-[1.15] font-medium sm:text-[3rem]">
            Surat, data penduduk, dan website desa dalam satu tempat.
          </h1>
          <p className="mt-5 max-w-2xl text-baca text-tinta-2">
            Perangkat desa melayani surat lebih cepat, warga mengurus dari HP, dan desa punya website sendiri di alamatnya.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <TautanTombol varian="utama" href={tautanDaftarDesa()}>
              Daftarkan desa Anda
            </TautanTombol>
            <a href="#cari-desa" className={`${kelasTombol('sekunder', 'biasa')} ${fokus}`}>
              Cari desa Anda
            </a>
          </div>
        </section>

        <section id="bagian-aplikasi" aria-labelledby="judul-bagian-aplikasi" className="scroll-mt-4 border-t border-garis">
          <div className={`${lebar} py-14`}>
            <h2 id="judul-bagian-aplikasi" className={judulBagian}>
              Bagian aplikasi
            </h2>
            <div className="mt-8 grid gap-6 lg:grid-cols-3 lg:items-start">
              <KartuLampiran l={panel} className="lg:col-span-3" />
              <KartuLampiran l={warga} className="lg:col-span-1" />
              <KartuLampiran l={website} className="lg:col-span-2" />
              <KartuLampiran l={kabupaten} className="lg:col-span-3" />
            </div>
          </div>
        </section>

        <Bukti />

        <div className={`${lebar} py-14`}>
          <TabelPaket />
        </div>

        <div className="border-t border-garis">
          <div className={`${lebar} py-14`}>
            <div className="max-w-2xl">
              <CariDesa judulBesar />
            </div>
          </div>
        </div>

        {MODE_DEMO && (
          <div className="border-t border-garis">
            <div className={`${lebar} py-14`}>
              <CobaDemo />
            </div>
          </div>
        )}
      </main>

      <footer className="border-t-[1.5px] border-tinta">
        <div className={`${lebar} flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 py-6 text-teks-kecil`}>
          <p>
            <span className="font-medium">Sinfodes</span>
            <span className="text-tinta-2"> · </span>
            <Tautan href={`mailto:${KONTAK_SINFODES.email}`}>{KONTAK_SINFODES.email}</Tautan>
          </p>
          <p className="flex gap-x-5">
            <Tautan nada="redup" href={keAlamat({ jenis: 'konsol' })}>
              Masuk Konsol
            </Tautan>
            <Tautan nada="redup" href="/privasi">
              Kebijakan privasi
            </Tautan>
          </p>
        </div>
      </footer>
    </div>
  )
}

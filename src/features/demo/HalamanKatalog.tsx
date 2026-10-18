import { useState, type ReactNode } from 'react'
import { Cap } from '@/ui/cap/Cap'
import { VARIAN_CAP } from '@/ui/cap/varian'
import { Nik } from '@/ui/domain/Nik'
import { NikField } from '@/ui/domain/NikField'
import { Rupiah } from '@/ui/domain/Rupiah'
import { Tanggal } from '@/ui/domain/Tanggal'
import { Hitungan } from '@/ui/hitungan/Hitungan'
import { Checkbox } from '@/ui/isian/Checkbox'
import { SearchField } from '@/ui/isian/SearchField'
import { Select, type OpsiPilihan } from '@/ui/isian/Select'
import { TextField } from '@/ui/isian/TextField'
import { rasioKontras } from '@/ui/kontras'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'
import { warna, type NamaWarna } from '@/ui/tokens'
import { Banner } from '@/ui/umpan-balik/Banner'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { ContohDataApi } from './ContohDataApi'

const KELOMPOK_WARNA: ReadonlyArray<readonly [string, readonly NamaWarna[]]> = [
  ['Permukaan', ['kertas', 'kertas-2', 'lembar', 'garis', 'garis-input']],
  ['Tinta', ['tinta', 'tinta-2', 'tinta-3', 'kapur']],
  ['Aksi dan status', ['biru', 'biru-tua', 'biru-muda', 'oker', 'oker-muda', 'stempel', 'stempel-muda', 'hijau', 'hijau-muda', 'merah', 'merah-muda']],
  ['Grafik', ['seri-1', 'seri-2', 'seri-3', 'seri-4', 'seri-5']],
]

const CONTOH_HURUF: ReadonlyArray<readonly [string, string, string]> = [
  ['font-serif text-judul-halaman font-medium', 'judul-halaman · Plex Serif 24', 'Permohonan Surat'],
  ['font-serif text-judul-bagian font-medium', 'judul-bagian · Plex Serif 18', 'Identitas penduduk'],
  ['text-teks-isian', 'teks-isian · Plex Sans 15', 'Siti Rahmah'],
  ['text-teks', 'teks · Plex Sans 14', '7 menunggu diproses · 3 menunggu tanda tangan Kepala Desa'],
  ['text-teks-kecil text-tinta-2', 'teks-kecil · Plex Sans 13', 'Terakhir diubah 12 Jan 2026 oleh Rosmiati'],
  ['text-label font-medium text-tinta-2 uppercase', 'label · Plex Sans 11 kapital', 'Layanan surat'],
  ['font-mono text-teks', 'angka-id · Plex Mono', '140509 520391 8002 · 400/087/SS/IX/2026'],
]

const DUSUN: OpsiPilihan[] = [
  { id: 'dsn_ss_1', label: 'Dusun I Kampung Tengah' },
  { id: 'dsn_ss_2', label: 'Dusun II Sialang Jaya' },
  { id: 'dsn_ss_3', label: 'Dusun III Teluk Rengas' },
  { id: 'dsn_ss_4', label: 'Dusun IV Sungai Lamo' },
]

function Bagian({ id, judul, keterangan, children }: { id: string; judul: string; keterangan?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="border-t border-garis pt-8">
      <h2 id={id} className="font-serif text-judul-bagian font-medium">
        {judul}
      </h2>
      {keterangan && <p className="mt-1 max-w-prose text-tinta-2">{keterangan}</p>}
      <div className="mt-5">{children}</div>
    </section>
  )
}

/** Halaman `/katalog`: semua token dan komponen dasar Register (SPEC §4), untuk titik periksa Tahap 1. */
export function HalamanKatalog() {
  const [nik, setNik] = useState('')
  const [dusun, setDusun] = useState<string | null>(null)

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-10 sm:px-6">
      <header>
        <p className="text-label font-medium text-tinta-2 uppercase">Sinfodes · design system</p>
        <h1 className="mt-1 font-serif text-judul-halaman font-medium">Katalog Register</h1>
        <p className="mt-2 max-w-prose text-tinta-2">
          Semua token dan komponen dasar (SPEC §4). Angka kontras dihitung langsung dari token.
        </p>
      </header>

      <Bagian id="warna" judul="Warna">
        <div className="flex flex-col gap-6">
          {KELOMPOK_WARNA.map(([nama, daftar]) => (
            <div key={nama}>
              <p className="text-label font-medium text-tinta-2 uppercase">{nama}</p>
              <ul className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                {daftar.map((w) => (
                  <li key={w} className="text-teks-kecil">
                    <span className="block h-12 rounded-1 border border-garis" style={{ backgroundColor: warna[w] }} />
                    <span className="mt-1 block font-medium">{w}</span>
                    <span className="block font-mono text-tinta-2">{warna[w]}</span>
                    <span className="block text-tinta-2">{rasioKontras(warna[w], warna.lembar).toFixed(2)}:1 di lembar</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Bagian>

      <Bagian id="huruf" judul="Huruf" keterangan="IBM Plex: Serif untuk judul, Sans untuk antarmuka, Mono khusus nomor identitas.">
        <dl className="divide-y divide-garis border-y border-garis">
          {CONTOH_HURUF.map(([kelas, nama, contoh]) => (
            <div key={nama} className="grid gap-1 py-3 sm:grid-cols-[14rem_1fr] sm:items-baseline">
              <dt className="font-mono text-teks-kecil text-tinta-2">{nama}</dt>
              <dd className={kelas}>{contoh}</dd>
            </div>
          ))}
        </dl>
      </Bagian>

      <Bagian id="tombol" judul="Tombol">
        <div className="flex flex-wrap items-center gap-3">
          <Tombol varian="utama">Buat surat</Tombol>
          <Tombol>Impor Excel</Tombol>
          <Tombol varian="teks">Lihat semua</Tombol>
          <Tombol varian="bahaya">Batalkan surat</Tombol>
          <Tombol varian="utama" memuat>
            Menyimpan
          </Tombol>
          <Tombol ukuran="kecil">Kecil</Tombol>
          <Tombol isDisabled>Nonaktif</Tombol>
        </div>
      </Bagian>

      <Bagian id="cap" judul="Cap status dan hitungan" keterangan="Status selalu berupa teks sekaligus warna, tidak pernah warna saja.">
        <div className="flex flex-wrap gap-2">
          {VARIAN_CAP.map((v) => (
            <Cap key={v} varian={v} />
          ))}
        </div>
        <p className="mt-4">
          Layanan Surat <Hitungan nilai={7} label="menunggu" /> · Penduduk <Hitungan nilai={2812} label="jiwa" />
        </p>
      </Bagian>

      <Bagian id="isian" judul="Isian">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField label="Nama lengkap" placeholder="Sesuai KTP" keterangan="Tulis tanpa gelar, kecuali gelar keagamaan." />
          <TextField label="Nomor HP (WhatsApp)" defaultValue="0812-7740" galat="Nomor HP harus 10-13 angka." />
          <NikField nilai={nik} onUbah={(digit) => setNik(digit)} />
          <Select label="Dusun" pilihan={DUSUN} nilai={dusun} onUbah={setDusun} />
          <SearchField label="Cari penduduk" labelTersembunyi={false} placeholder="Nama, NIK, atau nomor KK" />
          <Checkbox>Tampilkan penduduk yang sudah meninggal</Checkbox>
        </div>
        <p className="mt-3 text-teks-kecil text-tinta-2">
          Coba NIK: 1405095203918002 (warga asli), 3310014802768001 (pendatang dari Klaten), 1405093102918001 (tanggal tidak
          valid).
        </p>
      </Bagian>

      <Bagian id="data" judul="Tampilan data">
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[12rem_1fr]">
          <dt className="text-tinta-2">NIK</dt>
          <dd>
            <Nik nik="1405095203918002" salin />
          </dd>
          <dt className="text-tinta-2">NIK bayi baru lahir</dt>
          <dd>
            <Nik nik={null} />
          </dd>
          <dt className="text-tinta-2">Uang</dt>
          <dd>
            <Rupiah nilai={1250000} /> · ringkas <Rupiah nilai={1826650000} ringkas />
          </dd>
          <dt className="text-tinta-2">Tanggal</dt>
          <dd>
            <Tanggal iso="2026-09-24" gaya="panjang" /> · <Tanggal iso="2026-09-24" /> · <Tanggal iso="2026-09-24" gaya="hari" />
          </dd>
        </dl>
      </Bagian>

      <Bagian id="umpan-balik" judul="Umpan balik dan keadaan">
        <div className="flex flex-col gap-4">
          <Banner nada="info" judul="Draf dipulihkan">
            Draf dari pukul 09.41 dipulihkan.
          </Banner>
          <Banner nada="peringatan">Tanggal lahir berbeda dengan NIK (12 Mar 1991).</Banner>
          <Banner nada="galat">NIK sudah terdaftar atas nama Siti Rahmah.</Banner>
          <Banner nada="berhasil">Data penduduk tersimpan.</Banner>
          <div className="flex flex-wrap gap-3">
            <Tombol onPress={() => tampilkanToast({ pesan: 'Data penduduk tersimpan.', nada: 'berhasil' })}>
              Contoh toast berhasil
            </Tombol>
            <Tombol
              onPress={() =>
                tampilkanToast({
                  pesan: 'Pekerjaan diubah menjadi Wiraswasta.',
                  nada: 'berhasil',
                  aksi: { label: 'Urungkan', onPress: () => tampilkanToast({ pesan: 'Perubahan diurungkan.' }) },
                })
              }
            >
              Contoh toast dengan aksi
            </Tombol>
            <Tombol onPress={() => tampilkanToast({ pesan: 'Gagal menyimpan. Periksa koneksi internet.', nada: 'galat' })}>
              Contoh toast galat
            </Tombol>
          </div>
          <EmptyState
            judul="Belum ada data penduduk"
            keterangan="Impor dari Excel atau tambah satu per satu."
            aksi={
              <Tombol
                varian="utama"
                onPress={() => tampilkanToast({ pesan: 'Di aplikasi, tombol ini membuka alur Impor Excel (Tahap 2A).' })}
              >
                Impor dari Excel
              </Tombol>
            }
          />
          <ErrorState
            pesan="Server sedang tidak dapat dihubungi. Coba lagi beberapa saat."
            onCobaLagi={() => tampilkanToast({ pesan: 'Di aplikasi, tombol ini mengulang permintaan yang gagal.' })}
          />
          <BarisKerangka jumlah={3} />
        </div>
      </Bagian>

      <Bagian
        id="contoh-api"
        judul="Contoh data dari API tiruan"
        keterangan="Diambil lewat /api/v1/penduduk. Ganti koneksi di toolbar demo untuk melihat tampilan memuat dan galat."
      >
        <ContohDataApi />
      </Bagian>
    </main>
  )
}

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { ToggleButton } from 'react-aria-components'
import { pesanGalat } from '@/api/galat'
import { opsiKeluargaWarga } from '@/api/warga'
import { formatTanggal } from '@/domain/format/tanggal'
import { STATUS_LAPORAN } from '@/domain/laporan/schema'
import { kelompokkanNik } from '@/domain/penduduk/nik'
import { teksNilaiRiwayat } from '@/domain/penduduk/perubahan'
import { LABEL_FIELD } from '@/domain/penduduk/riwayat'
import { samarkanNik } from '@/domain/warga/akun'
import { samarkanNomorKk, type AnggotaKeluargaWarga } from '@/domain/warga/keluarga'
import { DescriptionList } from '@/ui/data/DescriptionList'
import { Tautan } from '@/ui/navigasi/Tautan'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'

const judulBagian = 'text-label font-medium text-tinta-2 uppercase'

const STATUS: Readonly<Record<(typeof STATUS_LAPORAN)[number], string>> = {
  baru: 'Sedang ditinjau kantor desa',
  diterapkan: 'Sudah diperbaiki',
  ditolak: 'Ditolak',
}

const teksUmur = (umurBulan: number) => (umurBulan < 12 ? `${umurBulan} bulan` : `${Math.floor(umurBulan / 12)} tahun`)

/** Nomor yang disamarkan; ketuk untuk menampilkan, ketuk lagi untuk menyembunyikan (SPEC §10). */
function NomorTersamar({ nomor, samaran, nama }: { nomor: string; samaran: string; nama: string }) {
  const [tampil, setTampil] = useState(false)
  return (
    <ToggleButton
      isSelected={tampil}
      onChange={setTampil}
      aria-label={`${tampil ? 'Sembunyikan' : 'Tampilkan'} ${nama}`}
      className="min-h-tombol rounded-1 px-1 text-left font-mono tabular-nums underline decoration-dotted underline-offset-4 outline-none data-[focus-visible]:outline-2 data-[focus-visible]:outline-solid data-[focus-visible]:outline-biru"
    >
      {tampil ? kelompokkanNik(nomor) : samaran}
    </ToggleButton>
  )
}

function KartuAnggota({ a }: { a: AnggotaKeluargaWarga }) {
  return (
    <li className="flex flex-col gap-2 bg-lembar px-4 py-4">
      <div>
        <p className="font-medium">{a.nama}</p>
        <p className="text-teks-kecil text-tinta-2">
          {a.hubunganKeluarga} · {a.jenisKelamin === 'P' ? 'Perempuan' : 'Laki-laki'} · {teksUmur(a.umurBulan)}
        </p>
      </div>
      <p className="flex flex-wrap items-center gap-x-2">
        <span className="text-teks-kecil text-tinta-2">NIK</span>
        {a.nik ? (
          <NomorTersamar nomor={a.nik} samaran={samarkanNik(a.nik)} nama={`NIK ${a.nama}`} />
        ) : (
          <span className="text-tinta-2">Belum ada NIK</span>
        )}
      </p>
      <DescriptionList
        items={[
          { label: 'Tempat, tanggal lahir', nilai: `${a.tempatLahir}, ${formatTanggal(a.tanggalLahir)}` },
          { label: 'Agama', nilai: a.agama },
          { label: 'Pendidikan', nilai: a.pendidikan },
          { label: 'Pekerjaan', nilai: a.pekerjaan },
          { label: 'Status perkawinan', nilai: a.statusPerkawinan },
          { label: 'Golongan darah', nilai: a.golonganDarah },
          { label: 'Nama ayah', nilai: a.namaAyah || null },
          { label: 'Nama ibu', nilai: a.namaIbu || null },
        ]}
      />
      <Tautan
        href={`/warga/keluarga/lapor?anggota=${a.id}`}
        aria-label={`Ada data yang salah? Laporkan (${a.nama})`}
        className="inline-flex min-h-tombol items-center self-start"
      >
        Ada data yang salah? Laporkan
      </Tautan>
    </li>
  )
}

/** Keluarga saya (SPEC §10): isi KK dengan NIK disamarkan, dan laporan perbaikan yang sudah dikirim. */
export function KeluargaSaya() {
  const kueri = useQuery(opsiKeluargaWarga())
  if (kueri.isPending) return <BarisKerangka jumlah={4} label="Memuat data keluarga…" />
  if (kueri.isError) return <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />
  const k = kueri.data
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-serif text-judul-halaman font-medium">Keluarga saya</h1>
        <p className="flex flex-wrap items-center gap-x-2">
          <span className="text-teks-kecil text-tinta-2">Nomor KK</span>
          <NomorTersamar nomor={k.nomorKk} samaran={samarkanNomorKk(k.nomorKk)} nama="nomor KK" />
        </p>
        <p className="text-tinta-2">{k.alamat}</p>
      </header>

      <ul className="flex flex-col divide-y divide-garis border-y border-garis">
        {k.anggota.map((a) => (
          <KartuAnggota key={a.id} a={a} />
        ))}
      </ul>

      {k.laporan.length > 0 && (
        <section aria-labelledby="keluarga-laporan" className="flex flex-col gap-2">
          <h2 id="keluarga-laporan" className={judulBagian}>
            Laporan saya
          </h2>
          <ul className="flex flex-col gap-2">
            {k.laporan.map((l) => (
              <li key={l.id} className="border-l-2 border-biru bg-lembar px-4 py-3">
                <p>
                  {LABEL_FIELD[l.field]} {l.namaPenduduk}: {teksNilaiRiwayat(l.field, l.nilaiBaru)}
                </p>
                <p className="text-teks-kecil text-tinta-2">
                  {STATUS[l.status]} · dikirim {formatTanggal(l.dibuatPada)}
                </p>
                {l.alasanDitolak && <p className="text-teks-kecil text-tinta-2">Alasan: {l.alasanDitolak}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

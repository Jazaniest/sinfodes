import { Plus } from '@phosphor-icons/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { pesanGalat } from '@/api/galat'
import { kunciKabupaten, opsiTenggatKabupaten } from '@/api/kabupaten'
import { formatTanggal, tanggalIsoWib } from '@/domain/format/tanggal'
import { bolehKabupaten } from '@/domain/kabupaten/hak-akses'
import { kalimatKirim, kalimatSisa, sisaHari, type RingkasTenggat } from '@/domain/kabupaten/tenggat'
import { Tautan } from '@/ui/navigasi/Tautan'
import { Tombol } from '@/ui/tombol/Tombol'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { useSesiKabupaten } from '../sesi-konteks'
import { DialogTenggat } from './DialogTenggat'

const judulDaftar = 'text-teks-kecil font-medium text-tinta-2'

function DaftarTenggat({ judul, daftar, hariIni }: { judul: string; daftar: readonly RingkasTenggat[]; hariIni: string }) {
  const id = `daftar-tenggat-${judul.replaceAll(' ', '-').toLowerCase()}`
  return (
    <div className="flex flex-col gap-1.5">
      <h3 id={id} className={judulDaftar}>
        {judul}
      </h3>
      <ul aria-labelledby={id} className="divide-y divide-garis border-y border-garis bg-lembar">
        {daftar.map((t) => (
          <li key={t.id} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-4 py-3">
            <span className="flex min-w-0 flex-col gap-0.5">
              <Tautan href={`/kabupaten/admin/dana-desa/tenggat/${t.id}`} nada="tinta" className="font-medium">
                {t.nama}
              </Tautan>
              <span className="text-teks-kecil text-tinta-2">
                {formatTanggal(t.tanggal)} · {kalimatSisa(sisaHari(t.tanggal, hariIni))}
              </span>
            </span>
            <span className="text-teks-kecil tabular-nums">{kalimatKirim(t)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Tenggat laporan Dana Desa di dasbor kabupaten (SPEC-V0.2 §8.3 butir 4). Admin bisa menambah; ubah dan hapus di detail. */
export function TenggatKabupaten({ sekarang = new Date() }: { sekarang?: Date }) {
  const { pengguna } = useSesiKabupaten()
  const queryClient = useQueryClient()
  const kueri = useQuery(opsiTenggatKabupaten())
  const [tambah, setTambah] = useState(false)
  const hariIni = tanggalIsoWib(sekarang)
  const bolehAtur = bolehKabupaten(pengguna.peran, 'kab.tenggat')
  return (
    <section aria-labelledby="judul-tenggat" className="flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="judul-tenggat" className="font-serif text-judul-bagian font-medium">
            Tenggat laporan
          </h2>
          <p className="text-teks-kecil text-tinta-2">Desa melihat pengingat di panelnya 14, 7, dan 1 hari sebelum tenggat, lalu menandai sendiri bila sudah mengirim.</p>
        </div>
        {bolehAtur && (
          <Tombol ikon={<Plus aria-hidden size={16} />} onPress={() => setTambah(true)}>
            Tambah tenggat
          </Tombol>
        )}
      </div>
      {kueri.isPending ? (
        <BarisKerangka jumlah={3} label="Memuat tenggat…" />
      ) : kueri.isError ? (
        <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />
      ) : (
        <>
          {kueri.data.akanDatang.length === 0 ? (
            <p className="text-tinta-2">Tidak ada tenggat yang akan datang.</p>
          ) : (
            <DaftarTenggat judul="Akan datang" daftar={kueri.data.akanDatang} hariIni={hariIni} />
          )}
          {kueri.data.sudahLewat.length > 0 && <DaftarTenggat judul="Sudah lewat" daftar={kueri.data.sudahLewat} hariIni={hariIni} />}
        </>
      )}
      {tambah && (
        <DialogTenggat onTutup={() => setTambah(false)} onBerhasil={() => void queryClient.invalidateQueries({ queryKey: kunciKabupaten.tenggat })} />
      )}
    </section>
  )
}

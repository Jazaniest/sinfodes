import { useQuery } from '@tanstack/react-query'
import { Fragment } from 'react'
import { pesanGalat } from '@/api/galat'
import { opsiLayananPublik } from '@/api/publik'
import { formatTanggal } from '@/domain/format/tanggal'
import { teksPerkiraan } from '@/domain/warga/ajukan'
import { namaJenisLengkap } from '@/domain/warga/permohonan'
import { TautanTombol } from '@/ui/tombol/TautanTombol'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { Rubrik } from '@/ui/website/Rubrik'
import { useGulirKeJangkar } from '../jangkar'
import { usePublik } from '../publik-konteks'

/** Layanan (SPEC §9): surat yang bisa diajukan online, jam layanan kantor, jadwal posyandu, dan jalan ke layanan mandiri. */
export function LayananPublik() {
  const identitas = usePublik()
  const kueri = useQuery(opsiLayananPublik(identitas.slug))
  useGulirKeJangkar(kueri.isSuccess)
  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-2">
        <h1 className="font-serif text-judul-halaman font-medium">Layanan</h1>
        <p className="max-w-[56ch] text-tinta-2">
          Surat keterangan bisa diajukan dari HP lewat layanan mandiri warga, atau langsung di kantor desa pada jam layanan.
        </p>
      </div>
      {kueri.isPending && <BarisKerangka jumlah={6} label="Memuat layanan…" />}
      {kueri.isError && <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />}
      {kueri.isSuccess && (
        <>
          <Rubrik id="surat-online" judul="Surat yang bisa diajukan online">
            <ul className="flex flex-col divide-y divide-garis border-y border-garis bg-lembar">
              {kueri.data.jenisSurat.map((j) => (
                <li key={j.id} className="flex flex-col gap-1 px-4 py-3">
                  <p className="font-medium">{namaJenisLengkap(j)}</p>
                  <p className="text-teks-kecil text-tinta-2">Syarat: {j.syarat.join(', ')}</p>
                  <p className="text-teks-kecil text-tinta-2">{teksPerkiraan(j.perkiraanHariKerja)}</p>
                </li>
              ))}
            </ul>
            <TautanTombol href="/warga/ajukan" varian="utama" className="self-start">
              Ajukan dari HP
            </TautanTombol>
            <p className="text-teks-kecil text-tinta-2">
              Masuk dengan NIK dan PIN dari kantor desa. Belum punya PIN? Mintalah di kantor desa dengan membawa KTP-el.
            </p>
          </Rubrik>
          <div className="grid gap-10 sm:grid-cols-2">
            <Rubrik id="jam-layanan" judul="Jam layanan kantor desa">
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                {identitas.jamLayanan.map((j) => (
                  <Fragment key={j.hari}>
                    <dt className="font-medium">{j.hari}</dt>
                    <dd>
                      {j.buka}-{j.tutup} WIB
                    </dd>
                  </Fragment>
                ))}
              </dl>
              <p className="text-tinta-2">{identitas.alamatKantor}</p>
            </Rubrik>
            <Rubrik id="posyandu" judul="Jadwal posyandu">
              <ul className="flex flex-col gap-3">
                {kueri.data.posyandu.map((p) => (
                  <li key={p.nama} className="flex flex-col">
                    <p className="font-medium">
                      {p.nama} · {p.dusun}
                    </p>
                    <p className="text-teks-kecil text-tinta-2">{p.tempat}</p>
                    <p className="text-teks-kecil">
                      Berikutnya {formatTanggal(p.jadwal, 'hari')} <span className="text-tinta-2">({p.aturan})</span>
                    </p>
                  </li>
                ))}
              </ul>
            </Rubrik>
          </div>
        </>
      )}
    </div>
  )
}

import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Link } from 'react-aria-components'
import { pesanGalat } from '@/api/galat'
import { opsiBerandaWarga } from '@/api/warga'
import { sapaanWaktu } from '@/domain/format/sapaan'
import { formatTanggal } from '@/domain/format/tanggal'
import { teksUmurBalita, type BerandaWarga } from '@/domain/warga/beranda'
import { kalimat, namaJenisLengkap } from '@/domain/warga/permohonan'
import { Cap } from '@/ui/cap/Cap'
import { cn } from '@/ui/cn'
import { TautanTombol } from '@/ui/tombol/TautanTombol'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { useSesiWarga } from './sesi-konteks'

const fokus =
  'outline-none data-[focus-visible]:outline-2 data-[focus-visible]:outline-solid data-[focus-visible]:-outline-offset-2 data-[focus-visible]:outline-biru'

function Bagian({ id, judul, children }: { id: string; judul: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h2 id={id} className="text-label font-medium text-tinta-2 uppercase">
        {judul}
      </h2>
      {children}
    </section>
  )
}

function IsiBeranda({ b, pendudukId }: { b: BerandaWarga; pendudukId: string }) {
  return (
    <>
      <Bagian id="beranda-permohonan" judul="Permohonan surat">
        {b.permohonan.length === 0 ? (
          <p className="text-tinta-2">Tidak ada permohonan surat yang sedang berjalan.</p>
        ) : (
          <ul className="divide-y divide-garis border-y border-garis bg-lembar">
            {b.permohonan.map((p) => (
              <li key={p.id}>
                <Link href={`/warga/riwayat/${p.id}`} className={cn('flex flex-col gap-1 px-4 py-3 hover:bg-kertas-2', fokus)}>
                  <span className="font-medium">{namaJenisLengkap(p.jenis)}</span>
                  <span className={p.status === 'selesai' ? 'text-hijau' : 'text-tinta-2'}>{kalimat(p.posisi)}</span>
                  {p.untuk.id !== pendudukId && <span className="text-teks-kecil text-tinta-2">Untuk {p.untuk.nama}</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Bagian>

      <div className="flex flex-col gap-3">
        <TautanTombol href="/warga/ajukan" varian="utama">
          Ajukan surat
        </TautanTombol>
      </div>

      <Bagian id="beranda-pengumuman" judul="Pengumuman desa">
        {b.pengumuman.length === 0 ? (
          <p className="text-tinta-2">Tidak ada pengumuman saat ini.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {b.pengumuman.map((p) => (
              <li key={p.id} className="border-l-2 border-biru bg-lembar px-4 py-3">
                <p className="font-medium">{p.judul}</p>
                <p className="mt-1 text-tinta-2">{p.isi}</p>
                <p className="mt-1 text-teks-kecil text-tinta-2">Berlaku sampai {formatTanggal(p.sampai)}</p>
              </li>
            ))}
          </ul>
        )}
      </Bagian>

      {b.posyandu && (
        <Bagian id="beranda-posyandu" judul="Jadwal posyandu">
          <div className="bg-lembar px-4 py-3">
            <p className="font-serif text-judul-bagian font-medium">{formatTanggal(b.posyandu.jadwal, 'hari')}</p>
            <p className="text-tinta-2">
              {b.posyandu.nama} · {b.posyandu.tempat}
            </p>
            <p className="mt-2">
              Untuk {b.posyandu.balita.map((x) => `${x.nama} (${teksUmurBalita(x.umurBulan)})`).join(', ')}
            </p>
          </div>
        </Bagian>
      )}

      {b.bantuan.length > 0 && (
        <Bagian id="beranda-bantuan" judul="Bantuan yang diterima">
          <ul className="divide-y divide-garis border-y border-garis bg-lembar">
            {b.bantuan.map((x) => (
              <li key={x.id} className="flex flex-col gap-1 px-4 py-3">
                <p className="font-medium">{x.program}</p>
                <p className="text-tinta-2">{x.bentuk}</p>
                {x.terakhir && (
                  <p className="flex flex-wrap items-center gap-2">
                    Tahap {x.terakhir.ke} · {x.terakhir.periode} <Cap varian={x.terakhir.status} />
                  </p>
                )}
                {x.berikut && (
                  <p className="text-teks-kecil text-tinta-2">
                    Tahap {x.berikut.ke} dijadwalkan {formatTanggal(x.berikut.jadwal)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Bagian>
      )}
    </>
  )
}

/** Beranda layanan warga (SPEC §10): permohonan berjalan, pengumuman, posyandu (bila ada balita), dan bantuan. */
export function Beranda({ sekarang }: { sekarang?: Date }) {
  const sesi = useSesiWarga()
  const kueri = useQuery(opsiBerandaWarga())
  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="text-tinta-2">{sapaanWaktu(sekarang ?? new Date())},</p>
        <h1 className="font-serif text-judul-halaman font-medium">{sesi.penduduk.nama}</h1>
      </header>
      {kueri.isPending && <BarisKerangka jumlah={4} label="Memuat beranda…" />}
      {kueri.isError && <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />}
      {kueri.isSuccess && <IsiBeranda b={kueri.data} pendudukId={sesi.penduduk.id} />}
    </div>
  )
}

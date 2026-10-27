import { useQuery } from '@tanstack/react-query'
import { opsiBuktiLencana } from '@/api/induk'
import { keAlamat } from '@/app/alamat'
import logoMark from '@/assets/brand/sinfodes-mark.svg'
import { formatTanggal } from '@/domain/format/tanggal'
import { Tautan } from '@/ui/navigasi/Tautan'
import { Skeleton } from '@/ui/umpan-balik/Skeleton'
import { CapLencana } from '@/ui/website/Lencana'

const lebar = 'mx-auto w-full max-w-2xl px-4 sm:px-6'

function Kepala() {
  return (
    <header className="border-b border-garis">
      <div className={`${lebar} flex items-center gap-3 py-4`}>
        <img src={logoMark} alt="" width={28} height={28} />
        <a href={keAlamat({ jenis: 'induk' })} className="font-serif text-judul-bagian font-medium outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-biru">
          Sinfodes
        </a>
      </div>
    </header>
  )
}

/**
 * Halaman bukti lencana di alamat induk (SPEC-V0.2 §9.6): publik, hanya bisa dibuka lewat kode yang sudah terbit, dan tidak
 * pernah memuat Indeks atau tingkatan desa.
 */
export function HalamanBuktiLencana({ kode }: { kode: string }) {
  const kueri = useQuery({ ...opsiBuktiLencana(kode), retry: false })
  const bukti = kueri.data
  return (
    <div className="min-h-svh bg-kertas">
      <Kepala />
      <main className={`${lebar} py-12`}>
        {kueri.isPending ? (
          <Skeleton className="h-40 w-full" />
        ) : !bukti ? (
          <>
            <h1 className="font-serif text-judul-halaman font-medium">Lencana tidak ditemukan</h1>
            <p className="mt-3 max-w-[56ch] text-baca text-tinta-2">{`Kode ${kode} tidak terdaftar. Lencana yang sah selalu bisa dibuka di halaman ini.`}</p>
            <p className="mt-6">
              <Tautan href={keAlamat({ jenis: 'induk' })}>Ke halaman utama Sinfodes</Tautan>
            </p>
          </>
        ) : (
          <>
            <p className="text-label font-medium text-tinta-2 uppercase">Bukti lencana</p>
            <h1 className="mt-1 font-serif text-judul-halaman font-medium">{bukti.kalimat}</h1>
            <div className="mt-6">
              <CapLencana lencana={bukti} href={keAlamat({ jenis: 'induk' }, `/lencana/${bukti.kode}`)} varian="bukti" />
            </div>
            <dl className="mt-8 divide-y divide-garis border-y border-garis">
              {[
                ['Desa', `${bukti.desa.nama}, Kecamatan ${bukti.desa.kecamatan}, Kabupaten ${bukti.desa.kabupaten}`],
                ['Nilai', bukti.nilai],
                ['Yang diukur', bukti.penjelasan],
                ['Kode lencana', bukti.kode],
              ].map(([nama, isi]) => (
                <div key={nama} className="grid gap-1 py-3 sm:grid-cols-[9rem_1fr] sm:gap-4">
                  <dt className="text-tinta-2">{nama}</dt>
                  <dd className={nama === 'Kode lencana' ? 'font-mono' : undefined}>{isi}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-6 max-w-[56ch] text-tinta-2">{`Diterbitkan otomatis oleh Sinfodes pada ${formatTanggal(bukti.terbitPada)} dari jejak aplikasi desa. Lencana tidak bisa dibeli atau diajukan.`}</p>
            {bukti.desa.alamat && (
              <p className="mt-6">
                <Tautan href={keAlamat({ jenis: 'desa', label: bukti.desa.alamat })}>{`Buka website Desa ${bukti.desa.nama}`}</Tautan>
              </p>
            )}
          </>
        )}
      </main>
    </div>
  )
}

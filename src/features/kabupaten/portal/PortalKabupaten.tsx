import { keAlamat } from '@/app/alamat'
import { tautanDaftarDesa } from '@/app/kontak-sinfodes'
import { formatAngka } from '@/domain/format/angka'
import type { PortalKabupaten as DataPortal } from '@/domain/kabupaten/portal'
import { MiniBar } from '@/ui/grafik/MiniBar'
import { Tautan } from '@/ui/navigasi/Tautan'
import { TautanTombol } from '@/ui/tombol/TautanTombol'
import { KabupatenBelumMitra } from '../KabupatenBelumMitra'
import { LambangContoh } from '../LambangContoh'

const MODE_DEMO = import.meta.env.VITE_DEMO === 'true'

const lebar = 'mx-auto w-full max-w-5xl px-4 sm:px-6'

type PortalMitra = Extract<DataPortal, { mitra: true }>

function DaftarDesa({ portal }: { portal: PortalMitra }) {
  return (
    <section aria-labelledby="judul-daftar-desa" className={`${lebar} py-14`}>
      <h2 id="judul-daftar-desa" className="font-serif text-judul-halaman font-medium">
        Desa yang sudah memakai Sinfodes
      </h2>
      <p className="mt-2 max-w-2xl text-tinta-2">Buka website desa untuk kabar, profil, transparansi APBDes, dan layanan surat warganya.</p>
      {portal.kecamatan.length === 0 ? (
        <p className="mt-8 text-tinta-2">Belum ada desa di kabupaten ini yang memakai Sinfodes.</p>
      ) : (
        <div className="mt-8 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {portal.kecamatan.map((k) => (
            <section key={k.kecamatan.kode} aria-labelledby={`kec-${k.kecamatan.kode}`} className="border-t border-garis pt-3">
              <div className="flex items-baseline justify-between gap-3">
                <h3 id={`kec-${k.kecamatan.kode}`} className="font-serif text-judul-bagian font-medium">
                  {k.kecamatan.nama}
                </h3>
                <span className="font-mono text-label text-tinta-2">{formatAngka(k.desa.length)} desa</span>
              </div>
              <ul className="mt-2 flex flex-col gap-1.5">
                {k.desa.map((d) => (
                  <li key={d.label} className="flex items-baseline gap-2">
                    <Tautan href={keAlamat({ jenis: 'desa', label: d.label })}>{d.nama}</Tautan>
                    {d.status === 'Uji coba' && <span className="text-teks-kecil text-tinta-2">· uji coba</span>}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </section>
  )
}

/**
 * Portal publik kabupaten mitra (SPEC-V0.2 §8.2) di alamat kabupaten: desa yang sudah memakai Sinfodes per kecamatan, dan
 * ajakan untuk desa yang belum. Peta menyusul di 7B-2, podium Indeks di 7C.
 */
export function PortalKabupaten({ portal }: { portal: DataPortal }) {
  if (!portal.mitra) return <KabupatenBelumMitra nama={portal.kabupaten.nama} />
  const { nama } = portal.kabupaten
  const belum = Math.max(portal.jumlahDesa - portal.bergabung, 0)
  return (
    <div className="flex min-h-dvh flex-col bg-kertas text-tinta">
      <header className="border-b border-garis">
        <div className={`${lebar} flex items-center gap-3 py-4`}>
          <LambangContoh nama={nama} className="h-10 w-auto shrink-0 text-tinta" />
          <span className="flex flex-col">
            <span className="font-serif text-judul-bagian font-medium">Kabupaten {nama}</span>
            <span className="text-label tracking-wide text-tinta-2 uppercase">Portal desa digital</span>
          </span>
        </div>
      </header>

      <main className="flex-1">
        <section aria-labelledby="judul-portal" className={`${lebar} pt-14 pb-12 sm:pt-20`}>
          <h1 id="judul-portal" className="max-w-3xl font-serif text-[2.25rem] leading-[1.15] font-medium sm:text-[3rem]">
            Desa Digital Kabupaten {nama}
          </h1>
          <div className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <p className="font-serif text-judul-bagian">
              {formatAngka(portal.bergabung)} desa di Kabupaten {nama} sudah memakai Sinfodes.
            </p>
            {MODE_DEMO && (
              <span className="border border-garis-input px-1.5 py-0.5 font-mono text-label text-tinta-2 uppercase">Data contoh</span>
            )}
          </div>
          <MiniBar
            label="Desa bergabung"
            labelTersembunyi
            nilai={portal.bergabung}
            maks={portal.jumlahDesa}
            keterangan={`${formatAngka(portal.bergabung)} dari ${formatAngka(portal.jumlahDesa)} desa`}
            className="mt-4 max-w-md"
          />
        </section>

        <div className="border-t border-garis">
          <DaftarDesa portal={portal} />
        </div>

        {belum > 0 && (
          <section aria-label="Untuk desa yang belum bergabung" className="border-t border-garis bg-lembar">
            <div className={`${lebar} flex flex-col gap-4 py-10 sm:flex-row sm:items-center sm:justify-between`}>
              <div className="max-w-2xl">
                <p className="font-serif text-judul-bagian font-medium">
                  {formatAngka(belum)} desa lain di Kabupaten {nama} belum memakai Sinfodes.
                </p>
                <p className="mt-1 text-tinta-2">Perangkat desa bisa mendaftar lewat WhatsApp; Tim Sinfodes menyiapkan alamat dan akun desanya.</p>
              </div>
              <TautanTombol varian="utama" href={tautanDaftarDesa()} className="shrink-0 self-start sm:self-auto">
                Daftarkan desa Anda
              </TautanTombol>
            </div>
          </section>
        )}
      </main>

      <footer className="border-t-[1.5px] border-tinta">
        <div className={`${lebar} flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 py-6 text-teks-kecil`}>
          <p className="text-tinta-2">
            Portal ini disediakan <Tautan href={keAlamat({ jenis: 'induk' })}>Sinfodes</Tautan> untuk Kabupaten {nama}.
          </p>
          <Tautan nada="redup" href="/kabupaten/admin/masuk">
            Masuk dasbor kabupaten
          </Tautan>
        </div>
      </footer>
    </div>
  )
}

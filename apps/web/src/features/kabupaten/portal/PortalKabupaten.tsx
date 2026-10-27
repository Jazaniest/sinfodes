import { keAlamat } from '@/app/alamat'
import { tautanDaftarDesa } from '@/app/kontak-sinfodes'
import { formatAngka } from '@/domain/format/angka'
import { LABEL_KATEGORI_DESA, LABEL_KATEGORI_KABUPATEN } from '@/domain/indeks/kategori'
import type { PortalKabupaten as DataPortal } from '@/domain/kabupaten/portal'
import { MiniBar } from '@/ui/grafik/MiniBar'
import { Tautan } from '@/ui/navigasi/Tautan'
import { TautanTombol } from '@/ui/tombol/TautanTombol'
import { KabupatenBelumMitra } from '../KabupatenBelumMitra'
import { LambangContoh } from '../LambangContoh'
import { PetaPortal } from './PetaPortal'

const MODE_DEMO = import.meta.env.VITE_DEMO === 'true'

const lebar = 'mx-auto w-full max-w-5xl px-4 sm:px-6'

type PortalMitra = Extract<DataPortal, { mitra: true }>

const kepalaTabel = 'border-b border-garis px-3 py-2 text-left text-label font-medium whitespace-nowrap text-tinta-2 uppercase'

/**
 * Juara bulan terakhir tutup per kategori, tingkat kabupaten (SPEC-V0.2 §9.5): tabel register dengan nama desa bertautan ke
 * websitenya. Hanya nama, kecamatan, dan nilai; Indeks dan tingkatan desa tidak pernah keluar ke publik.
 */
function JuaraBulan({ portal }: { portal: PortalMitra }) {
  const { podium } = portal
  const adaJuara = podium.kategori.some((k) => k.juara.length > 0)
  if (!adaJuara) return null
  return (
    <div className="border-t border-garis">
    <section aria-labelledby="judul-juara" className={`${lebar} py-14`}>
      <h2 id="judul-juara" className="font-serif text-judul-halaman font-medium">{`Juara ${podium.periode.label}`}</h2>
      {portal.posisiProvinsi.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1">
          {portal.posisiProvinsi.map((p) => (
            <li key={p.kategori} className="text-tinta-2">
              {`Kabupaten ${portal.kabupaten.nama} juara ${p.peringkat}${p.bersama ? ' bersama' : ''} ${LABEL_KATEGORI_KABUPATEN[p.kategori]} se-provinsi ${p.provinsi}.`}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-6 overflow-x-auto border-t-[1.5px] border-tinta">
        <table className="w-full min-w-[40rem] border-collapse">
          <caption className="sr-only">{`Juara per kategori, ${podium.periode.label}`}</caption>
          <thead>
            <tr>
              <th scope="col" className={kepalaTabel}>
                Kategori
              </th>
              {[1, 2, 3].map((p) => (
                <th key={p} scope="col" className={kepalaTabel}>{`Juara ${p}`}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {podium.kategori.map((k) => (
              <tr key={k.kategori} className="border-b border-garis align-top">
                <th scope="row" className="px-3 py-2.5 text-left font-medium">
                  {LABEL_KATEGORI_DESA[k.kategori]}
                </th>
                {[1, 2, 3].map((p) => {
                  const juara = k.juara.filter((j) => j.peringkat === p)
                  return (
                    <td key={p} className="px-3 py-2.5">
                      {juara.length === 0 ? (
                        <span className="text-tinta-2">-</span>
                      ) : (
                        <ul className="flex flex-col gap-2">
                          {juara.map((j) => (
                            <li key={j.desa.alamat} className="flex flex-col">
                              <Tautan href={keAlamat({ jenis: 'desa', label: j.desa.alamat })}>{j.desa.nama}</Tautan>
                              <span className="text-teks-kecil text-tinta-2">{`Kec. ${j.desa.kecamatan} · ${j.nilai}`}</span>
                              {j.bersama && <span className="text-teks-kecil text-tinta-2">{`Juara ${j.peringkat} bersama`}</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
    </div>
  )
}

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
 * ajakan untuk desa yang belum, peta desa, dan juara bulan terakhir tutup per kategori.
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

        <JuaraBulan portal={portal} />

        {portal.peta.length > 0 && (
          <div className="border-t border-garis">
            <div className={`${lebar} py-14`}>
              <PetaPortal peta={portal.peta} />
            </div>
          </div>
        )}

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

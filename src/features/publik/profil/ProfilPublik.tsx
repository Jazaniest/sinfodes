import { CaretDown } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { pesanGalat } from '@/api/galat'
import { opsiProfilPublik } from '@/api/publik-halaman'
import { formatAngka } from '@/domain/format/angka'
import { ARAH_BATAS, ringkasLembaga, type PengurusPublik, type ProfilPublik as DataProfil } from '@/domain/publik/profil'
import { DescriptionList } from '@/ui/data/DescriptionList'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { FotoWarta } from '@/ui/website/FotoWarta'
import { Rubrik } from '@/ui/website/Rubrik'
import { usePublik } from '../publik-konteks'
import { PetaProfil } from './PetaProfil'

const kosong = 'text-tinta-2'
const labelKecil = 'text-label font-semibold tracking-wide text-tinta-2 uppercase'

/** Jabatan dan nama, dua kolom di layar lebar. Tanpa tautan: website tidak membuka data penduduk. */
function DaftarPengurus({ pengurus }: { pengurus: readonly PengurusPublik[] }) {
  return (
    <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
      {pengurus.map((p) => (
        <div key={`${p.jabatan}·${p.nama}`} className="flex flex-col border-b border-garis pb-2">
          <dt className="text-teks-kecil text-tinta-2">{p.jabatan}</dt>
          <dd className="font-medium">{p.nama}</dd>
        </div>
      ))}
    </dl>
  )
}

function IsiProfil({ p }: { p: DataProfil }) {
  const i = p.istilah
  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr] lg:items-start">
        {p.foto && (
          <FotoWarta
            berkas={p.foto.berkas}
            alt={p.foto.keterangan}
            keterangan={p.foto.keterangan}
            kredit={p.foto.kredit}
            rasio="foto"
            sizes="(min-width: 64rem) 24rem, 100vw"
            utama
            className="lg:order-last"
          />
        )}
        <Rubrik id="sejarah" judul="Sejarah">
          {p.sejarah.length === 0 ? (
            <p className={kosong}>Sejarah desa belum ditulis.</p>
          ) : (
            <div className="flex max-w-[56ch] flex-col gap-4 text-baca">
              {p.sejarah.map((s) => (
                <p key={s.slice(0, 40)}>{s}</p>
              ))}
            </div>
          )}
        </Rubrik>
      </div>
      <Rubrik id="visi-misi" judul="Visi dan misi">
        {p.visi === null ? (
          <p className={kosong}>Visi dan misi belum ditulis.</p>
        ) : (
          <div className="flex max-w-[56ch] flex-col gap-5">
            <div className="flex flex-col gap-1">
              <p className={labelKecil}>Visi</p>
              <p className="font-serif text-judul-bagian">{p.visi}</p>
            </div>
            {p.misi.length > 0 && (
              <div className="flex flex-col gap-1">
                <p className={labelKecil}>Misi</p>
                <ol className="flex list-decimal flex-col gap-2 pl-5 text-baca">
                  {p.misi.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </Rubrik>
      <Rubrik id="geografi" judul="Geografi dan wilayah">
        <div className="grid gap-8 lg:grid-cols-2">
          <DescriptionList
            items={[
              { label: 'Luas wilayah', nilai: p.luasKm2 === null ? null : `${formatAngka(p.luasKm2, 1)} km²` },
              ...ARAH_BATAS.map(([arah, label]) => ({ label: `Batas ${label.toLowerCase()}`, nilai: p.batas?.[arah] ?? null })),
              ...p.jarak.map((j) => ({ label: `Jarak ke ${j.ke}`, nilai: `${formatAngka(j.km)} km · ${j.tempat}` })),
            ]}
          />
          <ul aria-label={`Wilayah ${i.dusun.toLowerCase()}`} className="flex flex-col divide-y divide-garis border-y border-garis">
            {p.wilayah.map((w) => (
              <li key={w.id} className="flex flex-col py-2">
                <span className="font-medium">{w.nama}</span>
                <span className="text-teks-kecil text-tinta-2">
                  Kepala {i.dusun.toLowerCase()}: {w.kepala} · {w.rw} {i.rw} · {w.rt} {i.rt}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Rubrik>
      <Rubrik id="peta" judul="Peta desa">
        {p.peta ? <PetaProfil lapisan={p.peta} wilayah={p.wilayah} istilah={i} /> : <p className={kosong}>Peta desa belum tersedia.</p>}
      </Rubrik>
      <Rubrik id="pemerintahan" judul="Pemerintah desa">
        {p.perangkat.length === 0 ? <p className={kosong}>Susunan perangkat desa belum diisi.</p> : <DaftarPengurus pengurus={p.perangkat} />}
      </Rubrik>
      <Rubrik id="lembaga" judul="Lembaga desa">
        {p.lembaga.length === 0 ? (
          <p className={kosong}>Pengurus lembaga desa belum diisi.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-garis border-y border-garis">
            {p.lembaga.map((l) => (
              <li key={l.lembaga}>
                <details className="group">
                  <summary className="flex min-h-tombol cursor-pointer list-none items-center justify-between gap-3 py-2 outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:-outline-offset-2 focus-visible:outline-biru [&::-webkit-details-marker]:hidden">
                    <span className="flex min-w-0 flex-col">
                      <span className="font-medium">{l.nama}</span>
                      <span className="text-teks-kecil text-tinta-2">{ringkasLembaga(l.pengurus)}</span>
                    </span>
                    <CaretDown aria-hidden size={18} className="shrink-0 text-tinta-2 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="pb-4">
                    <DaftarPengurus pengurus={l.pengurus} />
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </Rubrik>
    </>
  )
}

/** Profil desa (SPEC §9): sejarah, visi dan misi, geografi, peta, serta pemerintah dan lembaga desa (dari Lembaga Desa). */
export function ProfilPublik() {
  const identitas = usePublik()
  const kueri = useQuery(opsiProfilPublik(identitas.slug))
  return (
    <div className="flex flex-col gap-10">
      <h1 className="font-serif text-judul-halaman font-medium sm:text-judul-warta">Profil Desa {identitas.nama}</h1>
      {kueri.isPending && <BarisKerangka jumlah={8} label="Memuat profil desa…" />}
      {kueri.isError && <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />}
      {kueri.isSuccess && <IsiProfil p={kueri.data} />}
    </div>
  )
}

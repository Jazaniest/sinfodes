import { WhatsappLogo } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { pesanGalat } from '@/api/galat'
import { opsiPotensiPublik } from '@/api/publik-halaman'
import { tautanWhatsapp } from '@/domain/format/whatsapp'
import { pesanUmkm, type ButirPotensi, type UmkmPublik } from '@/domain/publik/potensi'
import { formatWhatsapp } from '@/domain/warga/akun'
import { TautanTombol } from '@/ui/tombol/TautanTombol'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { FotoWarta } from '@/ui/website/FotoWarta'
import { Rubrik } from '@/ui/website/Rubrik'
import { useGulirKeJangkar } from '../jangkar'
import { usePublik } from '../publik-konteks'

/** Satu potensi: foto di samping teks di layar lebar, di atasnya di HP. `id` menjadi jangkar dari Beranda. */
function BagianPotensi({ p }: { p: ButirPotensi }) {
  return (
    <article id={p.id} aria-labelledby={`${p.id}-judul`} className="grid scroll-mt-4 gap-4 sm:grid-cols-[2fr_3fr] sm:gap-6">
      {p.foto ? (
        <FotoWarta
          berkas={p.foto.berkas}
          alt={p.foto.keterangan}
          keterangan={p.foto.keterangan}
          kredit={p.foto.kredit}
          rasio="foto"
          sizes="(min-width: 40rem) 22rem, 100vw"
        />
      ) : (
        <div aria-hidden className="hidden sm:block" />
      )}
      <div className="flex flex-col gap-2">
        <p className="text-label font-semibold tracking-wide text-biru uppercase">{p.kategori}</p>
        <h3 id={`${p.id}-judul`} className="font-serif text-judul-bagian font-medium">
          {p.judul}
        </h3>
        <p className="max-w-[56ch] font-medium">{p.ringkasan}</p>
        {p.isi.map((s) => (
          <p key={s.slice(0, 40)} className="max-w-[56ch] text-tinta-2">
            {s}
          </p>
        ))}
      </div>
    </article>
  )
}

/** Satu UMKM. Lima tombol bertulisan sama, jadi nama aksesibelnya menyebut usahanya (fokus review 4). */
function KartuUmkm({ u, namaDesa }: { u: UmkmPublik; namaDesa: string }) {
  return (
    <li className="flex flex-col gap-2 rounded-2 border border-garis bg-lembar p-4">
      <p className="font-serif text-judul-bagian font-medium">{u.nama}</p>
      <p>{u.produk}</p>
      <p className="text-teks-kecil text-tinta-2">
        {u.pemilik} · {u.dusun} · {formatWhatsapp(u.whatsapp)}
      </p>
      <TautanTombol
        href={tautanWhatsapp(u.whatsapp, pesanUmkm(u.nama, namaDesa))}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Pesan lewat WhatsApp ke ${u.nama}`}
        ikon={<WhatsappLogo aria-hidden size={18} />}
        className="mt-1 self-start"
      >
        Pesan lewat WhatsApp
      </TautanTombol>
    </li>
  )
}

/** Potensi desa (SPEC §9): hasil hutan, kebun, sungai, dan wisata, serta UMKM warga dengan tombol WhatsApp penjual. */
export function PotensiPublik() {
  const identitas = usePublik()
  const kueri = useQuery(opsiPotensiPublik(identitas.slug))
  useGulirKeJangkar(kueri.isSuccess)
  return (
    <div className="flex flex-col gap-[var(--desa-jarak,2.5rem)]">
      <div className="flex flex-col gap-2">
        <h1 className="font-serif text-judul-halaman font-medium">Potensi desa</h1>
        <p className="max-w-[56ch] text-tinta-2">
          Hasil hutan, kebun, sungai, dan wisata yang menghidupi warga Desa {identitas.nama}, serta usaha warga yang bisa dihubungi
          langsung.
        </p>
      </div>
      {kueri.isPending && <BarisKerangka jumlah={8} label="Memuat potensi desa…" />}
      {kueri.isError && <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />}
      {kueri.isSuccess && (
        <>
          <Rubrik id="potensi" judul="Potensi">
            {kueri.data.potensi.length === 0 ? (
              <p className="text-tinta-2">Potensi desa belum ditulis.</p>
            ) : (
              <div className="flex flex-col gap-[var(--desa-jarak,2.5rem)]">
                {kueri.data.potensi.map((p) => (
                  <BagianPotensi key={p.id} p={p} />
                ))}
              </div>
            )}
          </Rubrik>
          <Rubrik id="umkm" judul="Usaha warga (UMKM)">
            {kueri.data.umkm.length === 0 ? (
              <p className="text-tinta-2">Belum ada usaha warga yang terdaftar.</p>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2">
                {kueri.data.umkm.map((u) => (
                  <KartuUmkm key={u.id} u={u} namaDesa={identitas.nama} />
                ))}
              </ul>
            )}
          </Rubrik>
        </>
      )}
    </div>
  )
}

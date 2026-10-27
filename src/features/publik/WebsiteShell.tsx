import { useEffect, type CSSProperties, type ReactNode } from 'react'
import { ArrowSquareOut } from '@phosphor-icons/react'
import { Link } from 'react-aria-components'
import { tautanWhatsapp } from '@/domain/format/whatsapp'
import type { IdentitasPublik } from '@/domain/publik/schema'
import { formatWhatsapp } from '@/domain/warga/akun'
import { pemetaanRegister, variabelTema } from '@/domain/website/tema'
import { cn } from '@/ui/cn'
import { Tautan } from '@/ui/navigasi/Tautan'
import { pasangFavicon } from '@/ui/website/favicon'
import { muatPasanganHuruf } from '@/ui/website/huruf'
import { FotoKonteks } from '@/ui/website/foto-konteks'
import { Nameplate } from '@/ui/website/Nameplate'
import { menuPublikAktif } from './navigasi'

type Props = {
  identitas: IdentitasPublik
  jalur: string
  /** Benar bila ini halaman Cek keaslian: atribut lingkup dan CSS kustom tidak dipasang (SPEC-V0.2 11.5). */
  cekKeaslian: boolean
  /** Tanggal hari ini yang sudah diformat, mis. "Kamis, 24 September 2026". */
  tanggal: string
  children: ReactNode
}

/**
 * Kerangka website desa bergaya warta desa (SPEC §9): nameplate berpita motif, menu, isi, dan kaki halaman.
 * Wadah memasang variabel kontrak tema v1 (--desa-*) lalu memetakan token Register yang dipakai komponen website ke
 * variabel itu, sehingga tautan, tombol, huruf, sudut, dan cincin fokus ikut tema desa tanpa komponen ditulis ulang.
 * CSS kustom desa (7G) disisipkan sebagai `<style>` anak wadah — isinya string terkurung dari API yang sudah diberi
 * awalan `:where([data-situs-kustom])` oleh `periksaCss`, tidak dirakit di klien — dan tidak dipasang di Cek keaslian.
 */
export function WebsiteShell({ identitas: d, jalur, cekKeaslian, tanggal, children }: Props) {
  const { tema } = d
  useEffect(() => {
    void muatPasanganHuruf(tema.huruf)
  }, [tema.huruf])
  useEffect(() => pasangFavicon(d.favicon, d.nama, tema.warnaUtama), [d.favicon, d.nama, tema.warnaUtama])
  const gaya = { ...variabelTema(tema), ...pemetaanRegister() } as CSSProperties
  const cssKustom = cekKeaslian ? null : d.cssKustom
  return (
    <div data-situs data-situs-kustom={cekKeaslian ? undefined : ''} className="skala-publik min-h-dvh bg-kertas font-sans text-teks text-tinta" style={gaya}>
      {cssKustom ? <style data-css-kustom>{cssKustom}</style> : null}
      <a
        href="#isi"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-1 focus:bg-lembar focus:px-3 focus:py-2"
      >
        Langsung ke isi
      </a>
      <div className={cn('bg-lembar print:hidden', tema.kepala !== 'pita' && 'mx-auto max-w-5xl')}>
        <Nameplate
          nama={d.nama}
          kecamatan={d.kecamatan.nama}
          kabupaten={d.kabupaten.nama}
          motif={tema.motif}
          logo={tema.logo ?? d.favicon}
          tanggal={tanggal}
          bentuk={tema.kepala}
          menu={
            <nav data-bagian="menu" aria-label="Menu website desa" className={cn(tema.kepala === 'ringkas' ? 'min-w-0 max-w-full' : 'mx-auto max-w-5xl')}>
              <ul className="flex gap-1 overflow-x-auto px-3 sm:px-4">
                {d.menu.map((m) => (
                  <li key={m.href} className="shrink-0">
                    {m.luar ? (
                      <a
                        href={m.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-tombol items-center gap-1 px-2 font-medium outline-none hover:text-biru data-focus-visible:outline-2 data-focus-visible:outline-solid data-focus-visible:-outline-offset-2 data-focus-visible:outline-biru"
                      >
                        {m.label}
                        <ArrowSquareOut aria-hidden size={14} />
                        <span className="sr-only"> (membuka situs lain)</span>
                      </a>
                    ) : (
                      <Link
                        href={m.href}
                        aria-current={menuPublikAktif(m.href, jalur, d.slug) ? 'page' : undefined}
                        className="inline-flex min-h-tombol items-center px-2 font-medium underline-offset-8 outline-none hover:text-biru aria-[current=page]:text-biru aria-[current=page]:underline aria-[current=page]:decoration-2 data-focus-visible:outline-2 data-focus-visible:outline-solid data-focus-visible:-outline-offset-2 data-focus-visible:outline-biru"
                      >
                        {m.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          }
        />
      </div>
      <main id="isi" data-bagian="isi" tabIndex={-1} className="mx-auto max-w-5xl px-4 py-6 outline-none sm:px-5 print:p-0">
        <FotoKonteks.Provider value={tema.foto}>{children}</FotoKonteks.Provider>
      </main>
      <KakiWebsite d={d} />
    </div>
  )
}

/** Kaki halaman (SPEC §9): identitas dan alamat kantor, jam layanan, kontak WhatsApp kantor, pengelola, dan Kredit foto. */
function KakiWebsite({ d }: { d: IdentitasPublik }) {
  return (
    <footer data-bagian="kaki" className="mt-12 border-t-[3px] border-tinta bg-lembar print:hidden">
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 sm:grid-cols-3 sm:px-5">
        <div className="flex flex-col gap-1">
          <p className="font-serif text-judul-bagian font-medium">Desa {d.nama}</p>
          <address className="text-tinta-2 not-italic">
            {d.alamatKantor}
            <br />
            Kecamatan {d.kecamatan.nama}, Kabupaten {d.kabupaten.nama}, {d.provinsi.nama} {d.kodePos}
          </address>
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-label font-semibold tracking-wide uppercase">Jam layanan</h2>
          <ul className="text-tinta-2">
            {d.jamLayanan.map((j) => (
              <li key={j.hari}>
                {j.hari} {j.buka}-{j.tutup} WIB
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col items-start gap-1">
          <h2 className="text-label font-semibold tracking-wide uppercase">Kontak</h2>
          <Tautan href={tautanWhatsapp(d.telepon)} target="_blank" rel="noopener noreferrer">
            WhatsApp kantor {formatWhatsapp(d.telepon)}
          </Tautan>
          <Tautan href={`mailto:${d.surel}`} className="break-all">
            {d.surel}
          </Tautan>
        </div>
      </div>
      <div className="border-t border-garis">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-4 text-teks-kecil text-tinta-2 sm:px-5 [html[data-demo-toolbar]_&]:pb-16">
          <p>Dikelola Pemerintah Desa {d.nama} · Didukung Sinfodes</p>
          <Tautan href={`/desa/${d.slug}/kredit-foto`}>Kredit foto</Tautan>
        </div>
      </div>
    </footer>
  )
}

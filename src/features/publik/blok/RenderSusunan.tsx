import type { ReactNode } from 'react'
import type { BlokPratinjau, BlokTampil } from '@/domain/publik/schema'
import { LABEL_JENIS_BLOK, type Blok } from '@/domain/website/blok'
import { pasanganBerdampingan } from '@/domain/website/susunan'
import { cn } from '@/ui/cn'
import { BlokAjakan } from './BlokAjakan'
import { BlokAngka } from './BlokAngka'
import { BlokApbdes } from './BlokApbdes'
import { BlokGaleri } from './BlokGaleri'
import { BlokKabar } from './BlokKabar'
import { BlokKontak } from './BlokKontak'
import { BlokLayanan } from './BlokLayanan'
import { BlokLencana } from './BlokLencana'
import { BlokPemisah } from './BlokPemisah'
import { BlokPengumumanAgenda } from './BlokPengumumanAgenda'
import { BlokPeta } from './BlokPeta'
import { BlokPotensi } from './BlokPotensi'
import { BlokSampul } from './BlokSampul'
import { BlokSambutan } from './BlokSambutan'
import { BlokTeks } from './BlokTeks'
import { BlokVideo } from './BlokVideo'

/**
 * Wadah satu blok susunan (SPEC-V0.2 11.4): bagian kontrak `blok-{jenis}` bernama dari judul blok. `role="group"` menjaga
 * supaya hanya judul di dalam blok yang menjadi landmark, tanpa nama ganda untuk pembaca layar.
 */
export function WadahBlok({ blok, children }: { blok: Blok; children: ReactNode }) {
  return (
    <section
      role="group"
      data-bagian={`blok-${blok.jenis}`}
      data-blok={blok.id}
      data-varian={blok.varian}
      aria-label={LABEL_JENIS_BLOK[blok.jenis]}
      className={cn('flex min-w-0 flex-col gap-3', blok.tersembunyi && 'opacity-50')}
    >
      {blok.tersembunyi && (
        <span className="w-fit rounded-penuh bg-kertas-2 px-2 py-0.5 text-label font-medium text-tinta-2">Tersembunyi</span>
      )}
      {children}
    </section>
  )
}

function IsiBlok({ blok, dasar }: { blok: BlokTampil; dasar: string }) {
  switch (blok.jenis) {
    case 'sampul':
      return <BlokSampul blok={blok} />
    case 'kabar':
      return <BlokKabar blok={blok} dasar={dasar} />
    case 'layanan':
      return <BlokLayanan blok={blok} dasar={dasar} />
    case 'angka':
      return <BlokAngka blok={blok} />
    case 'apbdes':
      return <BlokApbdes blok={blok} dasar={dasar} />
    case 'pengumuman-agenda':
      return <BlokPengumumanAgenda blok={blok} />
    case 'galeri':
      return <BlokGaleri blok={blok} />
    case 'peta':
      return <BlokPeta blok={blok} />
    case 'potensi':
      return <BlokPotensi blok={blok} dasar={dasar} />
    case 'video':
      return <BlokVideo blok={blok} />
    case 'sambutan':
      return <BlokSambutan blok={blok} />
    case 'kontak':
      return <BlokKontak blok={blok} />
    case 'lencana':
      return <BlokLencana blok={blok} />
    case 'pemisah':
      return <BlokPemisah blok={blok} />
    case 'teks':
      return <BlokTeks blok={blok} />
    case 'ajakan':
      return <BlokAjakan blok={blok} />
    default:
      return null
  }
}

/**
 * Susunan halaman website dari blok siap tampil (SPEC-V0.2 11.4): dipakai beranda, halaman tambahan, dan pratinjau
 * penyunting. Blok `lebar` yang langsung diikuti blok `sempit` digambar berdampingan; jenis yang tidak dikenal dilewati.
 */
/** Blok yang sumber datanya belum ada (pratinjau penyunting): tidak tampil di website, digambar kotak bergaris putus. */
function KotakKosong() {
  return (
    <div className="flex items-center justify-center rounded-2 border border-dashed border-garis-input bg-kertas-2 p-6 text-center text-teks-kecil text-tinta-2">
      Blok ini tidak tampil di website karena datanya belum ada.
    </div>
  )
}

function IsiAtauKosong({ blok, dasar }: { blok: BlokTampil | BlokPratinjau; dasar: string }) {
  return (blok as { kosong?: boolean }).kosong === true ? (
    <WadahBlok blok={blok}>
      <KotakKosong />
    </WadahBlok>
  ) : (
    <IsiBlok blok={blok as BlokTampil} dasar={dasar} />
  )
}

export function RenderSusunan({ blok, dasar }: { blok: readonly (BlokTampil | BlokPratinjau)[]; dasar: string }) {
  return (
    <div className="flex flex-col gap-[var(--desa-jarak,2.5rem)]">
      {pasanganBerdampingan(blok).map((p) =>
        Array.isArray(p) ? (
          <div key={p[0].id} className="grid items-start gap-[var(--desa-jarak,2.5rem)] lg:grid-cols-[2fr_1fr]">
            <IsiAtauKosong blok={p[0]} dasar={dasar} />
            <IsiAtauKosong blok={p[1]} dasar={dasar} />
          </div>
        ) : (
          <IsiAtauKosong key={p.id} blok={p} dasar={dasar} />
        ),
      )}
    </div>
  )
}

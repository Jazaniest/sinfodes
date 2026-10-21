import type { ReactNode } from 'react'
import type { BlokTampil } from '@/domain/publik/schema'
import { LABEL_JENIS_BLOK } from '@/domain/website/blok'
import { pasanganBerdampingan } from '@/domain/website/susunan'
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
export function WadahBlok({ blok, children }: { blok: BlokTampil; children: ReactNode }) {
  return (
    <section
      role="group"
      data-bagian={`blok-${blok.jenis}`}
      data-varian={blok.varian}
      aria-label={LABEL_JENIS_BLOK[blok.jenis]}
      className="flex min-w-0 flex-col gap-3"
    >
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
export function RenderSusunan({ blok, dasar }: { blok: readonly BlokTampil[]; dasar: string }) {
  return (
    <div className="flex flex-col gap-[var(--desa-jarak,2.5rem)]">
      {pasanganBerdampingan(blok).map((p) =>
        Array.isArray(p) ? (
          <div key={p[0].id} className="grid items-start gap-[var(--desa-jarak,2.5rem)] lg:grid-cols-[2fr_1fr]">
            <IsiBlok blok={p[0]} dasar={dasar} />
            <IsiBlok blok={p[1]} dasar={dasar} />
          </div>
        ) : (
          <IsiBlok key={p.id} blok={p} dasar={dasar} />
        ),
      )}
    </div>
  )
}

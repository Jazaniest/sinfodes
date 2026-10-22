import { useState, type MouseEvent } from 'react'
import type { BlokPratinjau } from '@/domain/publik/schema'
import type { TemaDasar } from '@/domain/website/tema'
import { Tombol } from '@/ui/tombol/Tombol'
import { useSesiAdmin } from '../../admin/sesi-konteks'
import { RenderSusunan } from '../../publik/blok/RenderSusunan'
import { BingkaiPratinjau } from '../tampilan/Pratinjau'

type Props = {
  blok: readonly BlokPratinjau[]
  tema: TemaDasar
  onPilih: (id: string) => void
}

/**
 * Pratinjau susunan yang sedang disunting (7F-2): RenderSusunan dalam bingkai HP 390 px atau desktop 1280 px dengan tema
 * draf. Blok tersembunyi redup, blok kosong menjadi kotak bergaris putus, dan klik blok memilihnya di daftar.
 */
export function PratinjauSusunan({ blok, tema, onPilih }: Props) {
  const { desa } = useSesiAdmin()
  const [mode, setMode] = useState<'hp' | 'desktop'>('desktop')

  const klik = (e: MouseEvent) => {
    // Tautan dan tombol di dalam blok tidak boleh dinavigasi di pratinjau.
    e.preventDefault()
    const id = (e.target as HTMLElement).closest('[data-blok]')?.getAttribute('data-blok')
    if (id) onPilih(id)
  }

  return (
    <section aria-label="Pratinjau susunan" className="flex min-w-0 flex-col gap-3 md:col-span-2 xl:col-span-1">
      <div className="flex items-center gap-2">
        <p className="mr-auto text-label font-medium text-tinta-2 uppercase">Pratinjau</p>
        <Tombol ukuran="kecil" varian={mode === 'hp' ? 'utama' : 'sekunder'} aria-pressed={mode === 'hp'} onPress={() => setMode('hp')}>
          HP
        </Tombol>
        <Tombol ukuran="kecil" varian={mode === 'desktop' ? 'utama' : 'sekunder'} aria-pressed={mode === 'desktop'} onPress={() => setMode('desktop')}>
          Desktop
        </Tombol>
      </div>
      <div onClick={klik} className="cursor-pointer">
        <BingkaiPratinjau
          label={mode === 'hp' ? 'HP (390 px)' : 'Desktop (1280 px)'}
          lebar={mode === 'hp' ? 390 : 1280}
          tinggi={760}
          skalaAwal={mode === 'hp' ? 0.55 : 0.28}
          tema={tema}
          tinggiOtomatis
          interaktif
        >
          <RenderSusunan blok={blok} dasar={`/desa/${desa.slug}`} />
        </BingkaiPratinjau>
      </div>
    </section>
  )
}
